const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commands');
const { createSticker } = require('./utils/sticker');

async function startBot() {
  const path = require('path');
  const AUTH_PATH = path.join(__dirname, '../auth_info');
  const fs = require('fs');

  if (!fs.existsSync(AUTH_PATH)) {
    fs.mkdirSync(AUTH_PATH, { recursive: true });
  }
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n📱 Escaneie o QR Code com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexão encerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant : from;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text || '';

      const textTrimmed = text.trim();

      // ── /f — Figurinhas ──────────────────────────────────
      if (textTrimmed === '/f' || textTrimmed === '/f 2') {
        const keepAspect = textTrimmed === '/f 2';
        try {
          await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

          const result = await createSticker(sock, msg, keepAspect);

          if (result.error) {
            await sock.sendMessage(from, { text: result.error }, { quoted: msg });
          } else {
            await sock.sendMessage(
              from,
              {
                sticker: result.buffer,
                ...(result.animated ? { isAnimated: true } : {}),
              },
              { quoted: msg }
            );
          }
        } catch (err) {
          console.error('Erro ao criar figurinha:', err);
          await sock.sendMessage(from, {
            text: '❌ Erro ao criar figurinha. Verifique se a mídia é válida e tente novamente.',
          }, { quoted: msg });
        }
        continue;
      }

      // ── Detectar mídia enviada diretamente com /f no caption ─
      const caption =
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption || '';

      const captionTrimmed = caption.trim();

      if (captionTrimmed === '/f' || captionTrimmed === '/f 2') {
        const keepAspect = captionTrimmed === '/f 2';
        try {
          await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

          const result = await createSticker(sock, msg, keepAspect);

          if (result.error) {
            await sock.sendMessage(from, { text: result.error }, { quoted: msg });
          } else {
            await sock.sendMessage(
              from,
              {
                sticker: result.buffer,
                ...(result.animated ? { isAnimated: true } : {}),
              },
              { quoted: msg }
            );
          }
        } catch (err) {
          console.error('Erro ao criar figurinha (caption):', err);
          await sock.sendMessage(from, {
            text: '❌ Erro ao criar figurinha. Tente novamente.',
          }, { quoted: msg });
        }
        continue;
      }

      // ── Comandos do RPG (prefixo !) ───────────────────────
      if (!textTrimmed.startsWith('!')) continue;

      try {
        const reply = await handleCommand(textTrimmed, sender, from, isGroup);
        if (reply) {
          await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
      } catch (err) {
        console.error('Erro ao processar comando:', err);
        await sock.sendMessage(from, { text: '❌ Erro interno. Tente novamente.' }, { quoted: msg });
      }
    }
  });

  return sock;
}

module.exports = { startBot };
