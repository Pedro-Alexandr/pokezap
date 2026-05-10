// ═══════════════════════════════════════════════════════════
//  STICKER PROCESSOR
//  Requer (instalar separadamente):
//    npm install sharp fluent-ffmpeg @ffmpeg-installer/ffmpeg
//
//  /f   → figurinha 1:1
//  /f 2 → figurinha mantendo aspecto original
// ═══════════════════════════════════════════════════════════

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const MIN_VIDEO_DURATION = 3;
const MAX_VIDEO_DURATION = 8;
const STICKER_SIZE       = 512;

// ── Carregamento gracioso das dependências opcionais ──────
let sharp, ffmpeg, ffmpegPath;
try {
  sharp = require('sharp');
} catch (_) { /* sharp não instalado */ }

try {
  ffmpeg     = require('fluent-ffmpeg');
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  if (ffmpeg && ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
} catch (_) { /* ffmpeg não instalado */ }

// ── Mensagens de erro ─────────────────────────────────────
const ERRORS = {
  NO_MEDIA:        '❌ Nenhuma mídia encontrada!\nEnvie ou responda uma foto, vídeo ou GIF com */f*.',
  UNSUPPORTED:     '❌ Tipo de mídia não suportado.\nEnvie uma *foto*, *vídeo* ou *GIF*.',
  VIDEO_TOO_SHORT: `❌ O vídeo é muito curto!\nMínimo: *${MIN_VIDEO_DURATION} segundos*.`,
  VIDEO_TOO_LONG:  `❌ O vídeo é muito longo!\nMáximo: *${MAX_VIDEO_DURATION} segundos*.`,
  PROCESS_FAIL:    '❌ Não foi possível criar a figurinha. Tente novamente com outra mídia.',
  STICKER_INPUT:   '❌ Você enviou uma figurinha! Para converter, responda-a com */f 2*.',
  NO_SHARP:        '❌ Módulo *sharp* não instalado.\nRode: `npm install sharp` no servidor.',
  NO_FFMPEG:       '❌ Módulo *ffmpeg* não instalado.\nRode: `npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg`',
};

function getTempPath(ext) {
  const name = `sticker_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  return path.join(os.tmpdir(), name);
}

async function processImage(buffer, keepAspect) {
  if (!sharp) return { error: ERRORS.NO_SHARP };
  try {
    let pipeline = sharp(buffer);
    if (keepAspect) {
      pipeline = pipeline.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    } else {
      pipeline = pipeline.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'cover',
        position: 'centre',
      });
    }
    const buf = await pipeline.webp({ quality: 80, lossless: false }).toBuffer();
    return { buffer: buf, animated: false };
  } catch (err) {
    console.error('Erro sharp:', err);
    return { error: ERRORS.PROCESS_FAIL };
  }
}

function getVideoDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const dur = metadata?.format?.duration;
      resolve(typeof dur === 'number' ? dur : parseFloat(dur) || 0);
    });
  });
}

async function processVideo(buffer, mimeType, keepAspect) {
  if (!ffmpeg) return { error: ERRORS.NO_FFMPEG };

  const ext    = mimeType.includes('gif') ? '.gif' : '.mp4';
  const input  = getTempPath(ext);
  const output = getTempPath('.webp');

  fs.writeFileSync(input, buffer);

  try {
    const duration = await getVideoDuration(input);
    if (duration < MIN_VIDEO_DURATION) throw new Error('VIDEO_TOO_SHORT');
    if (duration > MAX_VIDEO_DURATION) throw new Error('VIDEO_TOO_LONG');

    const scaleFilter = keepAspect
      ? `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`
      : `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=increase,crop=${STICKER_SIZE}:${STICKER_SIZE}`;

    await new Promise((resolve, reject) => {
      ffmpeg(input)
        .inputOptions(['-t', String(MAX_VIDEO_DURATION)])
        .outputOptions([
          '-vcodec', 'libwebp',
          '-vf', `${scaleFilter},fps=15`,
          '-loop', '0',
          '-preset', 'default',
          '-an', '-vsync', '0',
          '-s', `${STICKER_SIZE}x${STICKER_SIZE}`,
        ])
        .format('webp')
        .output(output)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const resultBuffer = fs.readFileSync(output);
    return { buffer: resultBuffer, animated: true };
  } finally {
    try { fs.unlinkSync(input);  } catch {}
    try { fs.unlinkSync(output); } catch {}
  }
}

function getMediaInfo(msg) {
  const m = msg.message;
  if (!m) return null;

  const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
  const target = quoted || m;

  if (target.stickerMessage) return { type: 'sticker' };
  if (target.imageMessage)   return { type: 'image', mime: target.imageMessage.mimetype || 'image/jpeg' };
  if (target.videoMessage)   return { type: 'video', mime: target.videoMessage.mimetype || 'video/mp4' };
  if (target.documentMessage) {
    const mime = target.documentMessage.mimetype || '';
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      return { type: mime.startsWith('video/') ? 'video' : 'image', mime };
    }
  }
  return null;
}

async function createSticker(sock, msg, keepAspect = false) {
  const info = getMediaInfo(msg);
  if (!info)                 return { error: ERRORS.NO_MEDIA };
  if (info.type === 'sticker') return { error: ERRORS.STICKER_INPUT };
  if (info.type !== 'image' && info.type !== 'video') return { error: ERRORS.UNSUPPORTED };

  let mediaBuffer;
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted
      ? {
          key: {
            remoteJid: msg.key.remoteJid,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            fromMe: false,
            participant: msg.message.extendedTextMessage.contextInfo.participant,
          },
          message: quoted,
        }
      : msg;

    mediaBuffer = await downloadMediaMessage(
      target,
      'buffer',
      {},
      { logger: require('pino')({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
    );
  } catch (err) {
    console.error('Erro ao baixar mídia:', err);
    return { error: ERRORS.PROCESS_FAIL };
  }

  try {
    if (info.type === 'image') return await processImage(mediaBuffer, keepAspect);
    if (info.type === 'video') return await processVideo(mediaBuffer, info.mime, keepAspect);
  } catch (err) {
    if (err.message === 'VIDEO_TOO_SHORT') return { error: ERRORS.VIDEO_TOO_SHORT };
    if (err.message === 'VIDEO_TOO_LONG')  return { error: ERRORS.VIDEO_TOO_LONG  };
    console.error('Erro sticker:', err);
    return { error: ERRORS.PROCESS_FAIL };
  }

  return { error: ERRORS.UNSUPPORTED };
}

const STICKER_HELP = `🖼️ *Como fazer figurinhas:*

*/f* — Figurinha quadrada (512×512)
*/f 2* — Figurinha mantendo aspecto original

📸 *Fotos* — Envie ou responda com */f*
🎬 *Vídeos* — Entre ${MIN_VIDEO_DURATION}s e ${MAX_VIDEO_DURATION}s
🎞️ *GIFs* — Entre ${MIN_VIDEO_DURATION}s e ${MAX_VIDEO_DURATION}s

_Dica: Responda qualquer mídia com /f para transformá-la em figurinha!_`;

module.exports = { createSticker, STICKER_HELP, MIN_VIDEO_DURATION, MAX_VIDEO_DURATION };