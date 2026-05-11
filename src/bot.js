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
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message)   continue;

      const from    = msg.key.remoteJid;
      const isGroup = from?.endsWith('@g.us') ?? false;
      const sender  = isGroup ? (msg.key.participant || from) : from;

      const text =
        msg.message.conversation                ??
        msg.message.extendedTextMessage?.text   ??
        msg.message.imageMessage?.caption       ??
        msg.message.videoMessage?.caption       ??
        '';

      const trimmed = text.trim();

      // Figurinhas
      if (trimmed === '/s' || trimmed === '/s 2') {
        const keepAspect = trimmed === '/s 2';
        try {
          await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
          const result = await createSticker(sock, msg, keepAspect);
          if (result.error) {
            await sock.sendMessage(from, { text: result.error }, { quoted: msg });
          } else {
            await sock.sendMessage(from,
              { sticker: result.buffer, ...(result.animated ? { isAnimated: true } : {}) },
              { quoted: msg }
            );
          }
        } catch (err) {
          console.error('[Sticker] Erro:', err.message);
        }
        continue;
      }

      // Comandos RPG
      if (!trimmed.startsWith('!')) continue;

      console.log(`[CMD] de=${sender.split('@')[0]} cmd=${trimmed.split(' ')[0]}`);

      try {
        const reply = await handleCommand(trimmed, sender, from, isGroup);
        if (reply) {
          await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
      } catch (err) {
        console.error(`[CMD] Erro em "${trimmed}":`, err.message);
        try {
          await sock.sendMessage(from, {
            text: '❌ Erro interno ao processar o comando. Tente novamente.',
          }, { quoted: msg });
        } catch (_) {}
      }
    }
  });

  return sock;
}

module.exports = { startBot };