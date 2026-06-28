const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino   = require('pino');
const qrcode = require('qrcode-terminal');

// Carregamento com logging para detectar falhas de import
let handleCommand, createSticker;
try {
  ({ handleCommand } = require('./commands'));
  console.log('✅ Commands carregado');
} catch (err) {
  console.error('❌ ERRO ao carregar commands:', err.message);
  process.exit(1);
}
try {
  ({ createSticker } = require('./utils/sticker'));
  console.log('✅ Sticker carregado');
} catch (err) {
  console.warn('⚠️  Sticker não disponível:', err.message);
  createSticker = async () => ({ error: '❌ Figurinhas não disponíveis no servidor.' });
}

// ═══════════════════════════════════════════════════════
//  ANTI-LOOP
//  Toda mensagem que O PRÓPRIO BOT envia (via send()) tem
//  seu ID registrado aqui. Quando o Baileys ecoa essa mesma
//  mensagem de volta no messages.upsert (fromMe: true), nós
//  identificamos pelo ID e ignoramos — isso evita que o bot
//  responda a si mesmo em loop.
//
//  Mensagens fromMe que NÃO estão neste registro são
//  comandos digitados manualmente no próprio número do bot
//  (ex: você mesmo abrindo o WhatsApp do número do bot e
//  mandando "!status" para si mesmo ou em um grupo) — essas
//  SÃO processadas normalmente.
// ═══════════════════════════════════════════════════════
const sentMessageIds  = new Set();
const MAX_TRACKED_IDS = 1000;

function trackSentId(id) {
  if (!id) return;
  sentMessageIds.add(id);
  if (sentMessageIds.size > MAX_TRACKED_IDS) {
    sentMessageIds.delete(sentMessageIds.values().next().value);
  }
}

// Remove o sufixo de dispositivo multi-device do Baileys (ex: ":31")
function normalizeJid(jid) {
  if (!jid) return jid;
  return jid.replace(/:\d+(?=@)/, '');
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version }          = await fetchLatestBaileysVersion();

  console.log(`📡 Baileys versão: ${version}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    connectTimeoutMs:    60_000,
    keepAliveIntervalMs: 25_000,
    retryRequestDelayMs: 2_000,
  });

  // Wrapper de envio: sempre registra o ID da mensagem enviada
  async function send(jid, content, options) {
    const result = await sock.sendMessage(jid, content, options);
    if (result?.key?.id) trackSentId(result.key.id);
    return result;
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`❌ Conexão encerrada (código ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000);
      } else {
        console.log('🔑 Sessão expirada. Delete a pasta auth_info e reinicie.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado! Aguardando mensagens...');
      console.log(`🤖 Número do bot: ${normalizeJid(sock.user?.id)}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // ── Anti-loop: ignora o eco da própria resposta do bot ──
      if (msg.key.fromMe && sentMessageIds.has(msg.key.id)) continue;

      const from    = msg.key.remoteJid;
      const isGroup = from?.endsWith('@g.us') ?? false;

      // Determina quem "enviou" o comando, para fins de jogo (trainerId):
      //  - Mensagem de outra pessoa  → participant (grupo) ou remoteJid (privado)
      //  - Mensagem do PRÓPRIO número do bot (digitada manualmente, não é eco)
      //    → identifica como a própria conta do bot
      let sender;
      if (msg.key.fromMe) {
        sender = normalizeJid(sock.user?.id) || from;
      } else {
        sender = normalizeJid(isGroup ? (msg.key.participant || from) : from);
      }

      const text =
        msg.message.conversation              ??
        msg.message.extendedTextMessage?.text ??
        msg.message.imageMessage?.caption     ??
        msg.message.videoMessage?.caption     ??
        '';

      const trimmed = text.trim();

      // ── Figurinhas ───────────────────────────────────
      if (trimmed === '/f' || trimmed === '/f 2') {
        const keepAspect = trimmed === '/f 2';
        try {
          await send(from, { react: { text: '⏳', key: msg.key } });
          const result = await createSticker(sock, msg, keepAspect);
          if (result.error) {
            await send(from, { text: result.error }, { quoted: msg });
          } else {
            await send(from,
              { sticker: result.buffer, ...(result.animated ? { isAnimated: true } : {}) },
              { quoted: msg }
            );
          }
        } catch (err) {
          console.error('[Sticker] Erro:', err.message);
          await send(from, { text: '❌ Erro ao criar figurinha. Tente novamente.' }, { quoted: msg });
        }
        continue;
      }

      // ── Comandos RPG ─────────────────────────────────
      if (!trimmed.startsWith('!')) continue;

      console.log(`[CMD] de=${sender.split('@')[0]} cmd=${trimmed.split(' ')[0]}${msg.key.fromMe ? ' (próprio número)' : ''}`);

      try {
        const reply = await handleCommand(trimmed, sender, from, isGroup);
        if (reply) {
          await send(from, { text: reply }, { quoted: msg });
        }
      } catch (err) {
        console.error(`[CMD] Erro em "${trimmed}":`, err.message);
        try {
          await send(from, { text: '❌ Erro interno ao processar o comando. Tente novamente.' }, { quoted: msg });
        } catch (_) {}
      }
    }
  });

  return sock;
}

module.exports = { startBot };