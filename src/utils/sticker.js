// ═══════════════════════════════════════════════════════════
//  STICKER PROCESSOR
//
//  /f   → AMASSA a imagem/vídeo inteiro para caber em 512×512
//         (distorce a proporção, mas mostra o conteúdo completo,
//          sem cortar nada)
//  /f 2 → mantém a proporção ORIGINAL, com fundo transparente
//         preenchendo o espaço restante (sem distorcer, sem cortar)
//
//  Dependências (já no package.json): sharp, fluent-ffmpeg,
//  @ffmpeg-installer/ffmpeg
// ═══════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const os = require('os');

const MIN_VIDEO_DURATION = 3;
const MAX_VIDEO_DURATION = 8;
const STICKER_SIZE = 512;

// ── Carregamento das dependências (com fallback gracioso) ──
let sharp, ffmpeg, ffmpegPath, ffprobePath;
try {
  sharp = require('sharp');
} catch (_) { /* sharp não instalado */ }

try {
  ffmpeg = require('fluent-ffmpeg');

  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  ffprobePath = require('@ffprobe-installer/ffprobe').path;

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
} catch (_) { /* ffmpeg/ffprobe não instalados */ }

// ── Mensagens de erro ─────────────────────────────────────
const ERRORS = {
  NO_MEDIA: '❌ Nenhuma mídia encontrada!\nEnvie ou responda uma foto, vídeo ou GIF com */f*.',
  UNSUPPORTED: '❌ Tipo de mídia não suportado.\nEnvie uma *foto*, *vídeo* ou *GIF*.',
  VIDEO_TOO_SHORT: `❌ O vídeo é muito curto!\nMínimo: *${MIN_VIDEO_DURATION} segundos*.`,
  VIDEO_TOO_LONG: `❌ O vídeo é muito longo!\nMáximo: *${MAX_VIDEO_DURATION} segundos*.`,
  PROCESS_FAIL: '❌ Não foi possível criar a figurinha. Tente novamente com outra mídia.',
  STICKER_INPUT: '❌ Você enviou uma figurinha! Para converter, responda-a com */f*.',
  NO_SHARP: '❌ Módulo *sharp* não está instalado no servidor.\nAdicione "sharp" ao package.json e refaça o deploy.',
  NO_FFMPEG: '❌ Módulos de vídeo não instalados no servidor.\nAdicione "fluent-ffmpeg", "@ffmpeg-installer/ffmpeg" e "@ffprobe-installer/ffprobe" ao package.json e refaça o deploy.',
};

function getTempPath(ext) {
  const name = `sticker_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  return path.join(os.tmpdir(), name);
}

// ── Processar imagem → WebP ───────────────────────────────
async function processImage(buffer, keepAspect) {
  if (!sharp) return { error: ERRORS.NO_SHARP };

  try {
    let pipeline = sharp(buffer);

    if (keepAspect) {
      // /f 2 → mantém a proporção original, preenchendo o restante
      // com fundo transparente (NÃO corta, NÃO distorce)
      pipeline = pipeline.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    } else {
      // /f → AMASSA a imagem inteira para caber exatamente em 512×512,
      // ignorando a proporção original (distorce, mas mostra tudo,
      // sem cortar nenhuma parte)
      pipeline = pipeline.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'fill',
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

// ── Processar vídeo/GIF → WebP animado ───────────────────
async function processVideo(buffer, mimeType, keepAspect) {
  if (!ffmpeg) return { error: ERRORS.NO_FFMPEG };

  const ext = mimeType.includes('gif') ? '.gif' : '.mp4';
  const input = getTempPath(ext);
  const output = getTempPath('.webp');

  fs.writeFileSync(input, buffer);

  try {
    const duration = await getVideoDuration(input);
    if (duration < MIN_VIDEO_DURATION) throw new Error('VIDEO_TOO_SHORT');
    if (duration > MAX_VIDEO_DURATION) throw new Error('VIDEO_TOO_LONG');

    // Filtro de escala:
    //  - keepAspect (/f 2): mantém proporção + padding transparente
    //  - padrão (/f): AMASSA — estica exatamente para 512×512,
    //    ignorando a proporção original, sem cortar nada
    const scaleFilter = keepAspect
      ? `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`
      : `scale=${STICKER_SIZE}:${STICKER_SIZE}`;

    await new Promise((resolve, reject) => {
      ffmpeg(input)
        .inputOptions(['-t', String(MAX_VIDEO_DURATION)])
        .outputOptions([
          '-vcodec', 'libwebp',
          '-vf', `fps=15,${scaleFilter},format=rgba`,

          '-loop', '0',
          '-an',
          '-vsync', '0',

          // 🔥 ISSO AQUI É O QUE ESTÁ FALTANDO
          '-lossless', '0',
          '-compression_level', '6',
          '-q:v', '60',
          '-pix_fmt', 'yuva420p',

          // força animação correta
          '-preset', 'default',
          '-vsync', '0',
        ])
    });

    const resultBuffer = fs.readFileSync(output);
    return { buffer: resultBuffer, animated: true };
  } finally {
    try { fs.unlinkSync(input); } catch { }
    try { fs.unlinkSync(output); } catch { }
  }
}

function getMediaInfo(msg) {
  const m = msg.message;
  if (!m) return null;

  const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
  const target = quoted || m;

  if (target.stickerMessage) return { type: 'sticker' };
  if (target.imageMessage) return { type: 'image', mime: target.imageMessage.mimetype || 'image/jpeg' };
  if (target.videoMessage) return { type: 'video', mime: target.videoMessage.mimetype || 'video/mp4' };
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
  if (!info) return { error: ERRORS.NO_MEDIA };
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
    if (err.message === 'VIDEO_TOO_LONG') return { error: ERRORS.VIDEO_TOO_LONG };
    console.error('Erro sticker:', err);
    return { error: ERRORS.PROCESS_FAIL };
  }

  return { error: ERRORS.UNSUPPORTED };
}

const STICKER_HELP = `🖼️ *Como fazer figurinhas:*

*/f* — Amassa a imagem/vídeo inteiro para caber em 512×512
   (mostra tudo, sem cortar — apenas distorce a proporção)

*/f 2* — Mantém a proporção original (fundo transparente)
   (sem distorcer, sem cortar)

📸 *Fotos* — Envie ou responda com */f*
🎬 *Vídeos* — Entre ${MIN_VIDEO_DURATION}s e ${MAX_VIDEO_DURATION}s
🎞️ *GIFs* — Entre ${MIN_VIDEO_DURATION}s e ${MAX_VIDEO_DURATION}s

_Dica: Responda qualquer mídia com /f para transformá-la em figurinha!_`;

module.exports = { createSticker, STICKER_HELP, MIN_VIDEO_DURATION, MAX_VIDEO_DURATION };