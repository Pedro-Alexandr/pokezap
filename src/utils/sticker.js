// ═══════════════════════════════════════════════════════════
//  STICKER PROCESSOR
//
//  /f   → amassa a mídia inteira em 512×512 (mostra tudo,
//          distorce a proporção, não corta nada)
//  /f 2 → mantém a proporção original com fundo transparente
//          (não distorce, não corta)
//
//  Dependências: sharp, fluent-ffmpeg, @ffmpeg-installer/ffmpeg,
//                @ffprobe-installer/ffprobe  (todas no package.json)
// ═══════════════════════════════════════════════════════════

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const STICKER_SIZE       = 512;
const MIN_VIDEO_DURATION = 3;   // segundos
const MAX_VIDEO_DURATION = 8;   // segundos
const MAX_CONCURRENT     = 2;   // processamentos simultâneos

// ── Fila de concorrência ──────────────────────────────────
let processingCount = 0;
function waitQueue() {
  return new Promise(resolve => {
    const check = () => {
      if (processingCount < MAX_CONCURRENT) { processingCount++; resolve(); }
      else setTimeout(check, 100);
    };
    check();
  });
}
function releaseQueue() { processingCount = Math.max(0, processingCount - 1); }

// ── Carregamento das dependências ─────────────────────────
let sharp, ffmpeg;
try { sharp = require('sharp'); } catch (_) {}
try {
  ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
  ffmpeg.setFfprobePath(require('@ffprobe-installer/ffprobe').path);
} catch (_) {}

// ── Mensagens de erro ─────────────────────────────────────
const ERRORS = {
  NO_MEDIA:
    '❌ Nenhuma mídia encontrada!\nEnvie ou responda uma foto, vídeo ou GIF com */f*.',
  UNSUPPORTED:
    '❌ Tipo de mídia não suportado. Envie uma *foto*, *vídeo* ou *GIF*.',
  STICKER_INPUT:
    '❌ Você enviou uma figurinha! Para converter, responda-a com */f*.',
  VIDEO_TOO_SHORT:
    `❌ O vídeo é muito curto! Mínimo: *${MIN_VIDEO_DURATION} segundos*.`,
  VIDEO_TOO_LONG:
    `❌ O vídeo é muito longo! Máximo: *${MAX_VIDEO_DURATION} segundos*.`,
  PROCESS_FAIL:
    '❌ Não foi possível criar a figurinha. Tente com outra mídia.',
  NO_SHARP:
    '❌ Módulo *sharp* ausente no servidor. Adicione ao package.json e redeploy.',
  NO_FFMPEG:
    '❌ Módulos de vídeo ausentes no servidor.\n' +
    'Adicione *fluent-ffmpeg*, *@ffmpeg-installer/ffmpeg* e *@ffprobe-installer/ffprobe* ao package.json e redeploy.',
};

// ── Arquivos temporários ──────────────────────────────────
function tmpFile(ext) {
  return path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
}
function tryDelete(f) { try { fs.unlinkSync(f); } catch (_) {} }

// ═══════════════════════════════════════════════════════════
//  EXIF — Metadados obrigatórios para o WhatsApp reconhecer
//  o arquivo como figurinha válida (sem isso fica em branco)
// ═══════════════════════════════════════════════════════════

/**
 * Cria o buffer EXIF no formato TIFF que o WhatsApp espera.
 * Tag WA (0x5741) com um JSON contendo os dados do pack.
 */
function buildExifBuffer() {
  const json = JSON.stringify({
    'sticker-pack-id':        'com.pokézap.bot.stickers',
    'sticker-pack-name':      'PokéZap',
    'sticker-pack-publisher': '',
    'is-avatar-sticker':      0,
  });
  const jsonBuf = Buffer.from(json, 'utf-8');

  // Cabeçalho TIFF (little-endian) + 1 entrada IFD
  // Estrutura: II(2) + magic(2) + ifd_offset(4) + entry_count(2)
  //            + tag(2) + type(2) + count(4) + value_offset(4)
  //            + next_ifd(4) = 26 bytes antes do JSON
  const header = Buffer.alloc(26);
  header.write('II', 0, 'ascii');                  // little-endian TIFF
  header.writeUInt16LE(42, 2);                    // magic TIFF
  header.writeUInt32LE(8, 4);                    // IFD começa em offset 8
  header.writeUInt16LE(1, 8);                    // 1 entrada no IFD
  header.writeUInt16LE(0x5741, 10);             // tag WA
  header.writeUInt16LE(7, 12);                  // tipo UNDEFINED
  header.writeUInt32LE(jsonBuf.length, 14);     // tamanho do valor
  header.writeUInt32LE(26, 18);                 // offset do valor (após cabeçalho)
  header.writeUInt32LE(0, 22);                  // próximo IFD = nenhum

  return Buffer.concat([header, jsonBuf]);
}

/**
 * Injeta o EXIF no container WebP.
 *
 * WebP simples (VP8 / VP8L): precisamos inserir um chunk VP8X antes
 * do chunk de imagem para sinalizar que há EXIF, depois adicionar
 * o chunk EXIF no final.
 *
 * WebP estendido (VP8X, já produzido pelo ffmpeg para animações):
 * apenas ativamos o flag EXIF no VP8X existente e adicionamos o chunk.
 */
function injectExif(webpBuf, exifBuf) {
  if (!webpBuf || webpBuf.length < 12) return webpBuf;
  if (webpBuf.slice(0, 4).toString() !== 'RIFF') return webpBuf;
  if (webpBuf.slice(8, 12).toString() !== 'WEBP') return webpBuf;

  // Chunk EXIF com padding para tamanho par
  const pad       = exifBuf.length % 2 === 1 ? 1 : 0;
  const exifChunk = Buffer.alloc(8 + exifBuf.length + pad);
  exifChunk.write('EXIF', 0, 'ascii');
  exifChunk.writeUInt32LE(exifBuf.length, 4);
  exifBuf.copy(exifChunk, 8);

  const firstChunk = webpBuf.slice(12, 16).toString();
  let result;

  if (firstChunk === 'VP8X') {
    // ── WebP estendido (animações já vêm assim do ffmpeg) ──────
    result = Buffer.from(webpBuf);                        // cópia mutável
    const flags = result.readUInt32LE(20);
    result.writeUInt32LE(flags | 0x08, 20);              // ativa bit EXIF
    result = Buffer.concat([result, exifChunk]);

  } else {
    // ── WebP simples (imagens do sharp vêm como VP8 / VP8L) ────
    // Cria chunk VP8X de 18 bytes (8 header + 10 dados)
    const vp8xData = Buffer.alloc(10);
    vp8xData.writeUInt32LE(0x08, 0);      // flags: apenas EXIF presente
    vp8xData.writeUIntLE(511, 4, 3);      // canvas width  − 1 = 511 (sempre 512×512)
    vp8xData.writeUIntLE(511, 7, 3);      // canvas height − 1 = 511

    const vp8xChunk = Buffer.alloc(18);
    vp8xChunk.write('VP8X', 0, 'ascii');
    vp8xChunk.writeUInt32LE(10, 4);
    vp8xData.copy(vp8xChunk, 8);

    // Monta novo arquivo: RIFF header + WEBP + VP8X + chunks originais + EXIF
    const riffHeader = Buffer.alloc(12);
    riffHeader.write('RIFF', 0, 'ascii');
    riffHeader.write('WEBP', 8, 'ascii');

    result = Buffer.concat([
      riffHeader,
      vp8xChunk,
      webpBuf.slice(12),   // VP8 / VP8L e demais chunks originais
      exifChunk,
    ]);
    result.writeUInt32LE(result.length - 8, 4);  // atualiza tamanho RIFF
  }

  // Garante tamanho RIFF correto no final
  result.writeUInt32LE(result.length - 8, 4);
  return result;
}

/** Aplica EXIF ao buffer WebP e retorna o resultado. */
function addExif(webpBuf) {
  try { return injectExif(webpBuf, buildExifBuffer()); }
  catch (_) { return webpBuf; } // em caso de erro, retorna sem EXIF
}

// ═══════════════════════════════════════════════════════════
//  PROCESSAMENTO DE IMAGEM (sharp)
// ═══════════════════════════════════════════════════════════
async function processImage(buffer, keepAspect) {
  if (!sharp) return { error: ERRORS.NO_SHARP };

  try {
    let pipeline = sharp(buffer);

    if (keepAspect) {
      // /f 2 → cabe dentro de 512×512 mantendo a proporção original;
      // espaço restante fica transparente (sem cortar, sem distorcer)
      pipeline = pipeline.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    } else {
      // /f → AMASSA a imagem inteira em 512×512 exatamente;
      // distorce a proporção, mas mostra tudo sem cortar nada
      pipeline = pipeline.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'fill',
      });
    }

    const webpBuf = await pipeline
      .webp({ quality: 80, lossless: false })
      .toBuffer();

    return { buffer: addExif(webpBuf), animated: false };
  } catch (err) {
    console.error('[Sticker] Erro sharp:', err.message);
    return { error: ERRORS.PROCESS_FAIL };
  }
}

// ═══════════════════════════════════════════════════════════
//  PROCESSAMENTO DE VÍDEO / GIF (ffmpeg com arquivos temp)
//
//  ⚠️  Usamos arquivos temporários em disco — NÃO streams.
//  Streams podem gerar WebP incompleto/corrompido porque o
//  ffmpeg pode não ter terminado de escrever quando o evento
//  'end' dispara no pipe. Arquivos temp são 100% confiáveis.
// ═══════════════════════════════════════════════════════════
function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return resolve(0); // fallback: 0 = não verificar duração
      const dur = parseFloat(meta?.format?.duration) || 0;
      resolve(dur);
    });
  });
}

async function processVideo(buffer, mimeType, keepAspect) {
  if (!ffmpeg) return { error: ERRORS.NO_FFMPEG };
  if (!buffer || buffer.length < 10) return { error: ERRORS.PROCESS_FAIL };

  await waitQueue();

  const isGif  = mimeType.includes('gif');
  const inFile  = tmpFile(isGif ? '.gif' : '.mp4');
  const outFile = tmpFile('.webp');

  try {
    fs.writeFileSync(inFile, buffer);

    // Verificação de duração (GIFs curtos são permitidos)
    const duration = await getVideoDuration(inFile);
    if (duration > 0) {
      if (!isGif && duration < MIN_VIDEO_DURATION) throw new Error('VIDEO_TOO_SHORT');
      if (duration > MAX_VIDEO_DURATION)           throw new Error('VIDEO_TOO_LONG');
    }

    // Filtro de escala:
    // /f   → scale=512:512  (estica exatamente, amassa tudo)
    // /f 2 → scale com aspect_ratio + pad transparente
    const scaleFilter = keepAspect
      ? `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,` +
        `pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`
      : `scale=${STICKER_SIZE}:${STICKER_SIZE}:flags=lanczos`;

    await new Promise((resolve, reject) => {
      ffmpeg(inFile)
        .inputOptions(['-t', String(MAX_VIDEO_DURATION)])
        .videoFilter(`fps=10,${scaleFilter}`)
        .outputOptions([
          '-vcodec',  'libwebp',
          '-lossless', '0',
          '-q:v',      '70',
          '-loop',     '0',
          '-preset',   'default',
          '-an',
          '-f',        'webp',
        ])
        .output(outFile)
        .on('end',   resolve)
        .on('error', reject)
        .run();
    });

    // Valida saída antes de ler
    const stat = fs.statSync(outFile);
    if (stat.size < 100) throw new Error('Saída inválida (muito pequena)');

    const webpBuf = fs.readFileSync(outFile);
    return { buffer: addExif(webpBuf), animated: true };

  } catch (err) {
    if (err.message === 'VIDEO_TOO_SHORT') return { error: ERRORS.VIDEO_TOO_SHORT };
    if (err.message === 'VIDEO_TOO_LONG')  return { error: ERRORS.VIDEO_TOO_LONG  };
    console.error('[Sticker] Erro ffmpeg:', err.message);
    return { error: ERRORS.PROCESS_FAIL };

  } finally {
    releaseQueue();
    tryDelete(inFile);
    tryDelete(outFile);
  }
}

// ═══════════════════════════════════════════════════════════
//  DETECÇÃO DE MÍDIA NA MENSAGEM
// ═══════════════════════════════════════════════════════════
function getMediaInfo(msg) {
  const m = msg.message;
  if (!m) return null;

  // Mensagem citada tem prioridade (reply de mídia com /f no texto)
  const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
  const target = quoted || m;

  if (target.stickerMessage)    return { type: 'sticker' };
  if (target.imageMessage)      return { type: 'image', mime: target.imageMessage.mimetype  || 'image/jpeg' };
  if (target.videoMessage)      return { type: 'video', mime: target.videoMessage.mimetype  || 'video/mp4'  };
  if (target.documentMessage) {
    const mime = target.documentMessage.mimetype || '';
    if (mime.startsWith('image/'))                     return { type: 'image', mime };
    if (mime.startsWith('video/') || mime === 'image/gif') return { type: 'video', mime };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════
async function createSticker(sock, msg, keepAspect = false) {
  const info = getMediaInfo(msg);
  if (!info)                   return { error: ERRORS.NO_MEDIA     };
  if (info.type === 'sticker') return { error: ERRORS.STICKER_INPUT };
  if (info.type !== 'image' && info.type !== 'video') return { error: ERRORS.UNSUPPORTED };

  // Download da mídia
  let mediaBuffer;
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const dlTarget = quoted
      ? {
          key: {
            remoteJid:   msg.key.remoteJid,
            id:          msg.message.extendedTextMessage.contextInfo.stanzaId,
            fromMe:      false,
            participant: msg.message.extendedTextMessage.contextInfo.participant,
          },
          message: quoted,
        }
      : msg;

    mediaBuffer = await downloadMediaMessage(
      dlTarget,
      'buffer',
      {},
      { logger: require('pino')({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
    );
  } catch (err) {
    console.error('[Sticker] Erro no download:', err.message);
    return { error: ERRORS.PROCESS_FAIL };
  }

  if (!mediaBuffer || mediaBuffer.length === 0) return { error: ERRORS.PROCESS_FAIL };

  if (info.type === 'image') return processImage(mediaBuffer, keepAspect);
  if (info.type === 'video') return processVideo(mediaBuffer, info.mime, keepAspect);

  return { error: ERRORS.UNSUPPORTED };
}

// ── Texto de ajuda ────────────────────────────────────────
const STICKER_HELP =
  `🖼️ *Como fazer figurinhas:*\n\n` +
  `*/f* — Amassa a imagem inteira em 512×512\n` +
  `   (mostra tudo, sem cortar — distorce a proporção)\n\n` +
  `*/f 2* — Mantém a proporção original\n` +
  `   (fundo transparente, sem distorcer e sem cortar)\n\n` +
  `📸 *Fotos* — Envie ou responda com */f*\n` +
  `🎬 *Vídeos* — Entre ${MIN_VIDEO_DURATION}s e ${MAX_VIDEO_DURATION}s\n` +
  `🎞️ *GIFs* — Qualquer tamanho até ${MAX_VIDEO_DURATION}s\n\n` +
  `_Dica: responda qualquer mídia com /f para virar figurinha!_`;

module.exports = { createSticker, STICKER_HELP, MIN_VIDEO_DURATION, MAX_VIDEO_DURATION };