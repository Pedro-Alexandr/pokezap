// ═══════════════════════════════════════════════════════════
// STICKER PROCESSOR v2
// Compatível com Baileys 7 + Fly.io
// ═══════════════════════════════════════════════════════════

const webpmux = require("node-webpmux");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;

const { downloadMediaMessage } = require("@whiskeysockets/baileys");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// ---------------- CONFIG ----------------

const STICKER_SIZE = 512;

const MIN_VIDEO_DURATION = 3;
const MAX_VIDEO_DURATION = 8;

const MAX_CONCURRENT = 2;

const PACK_NAME = "Pokemon Bot";
const AUTHOR = "Pedro";

// ----------------------------------------

const ERRORS = {
    NO_MEDIA:
        "❌ Nenhuma mídia encontrada!\nEnvie ou responda uma foto, vídeo ou GIF com */f*.",

    STICKER_INPUT:
        "❌ Responda uma figurinha com */f* para convertê-la.",

    UNSUPPORTED:
        "❌ Tipo de mídia não suportado.",

    VIDEO_TOO_SHORT:
        `❌ O vídeo deve ter pelo menos ${MIN_VIDEO_DURATION}s.`,

    VIDEO_TOO_LONG:
        `❌ O vídeo deve ter no máximo ${MAX_VIDEO_DURATION}s.`,

    PROCESS_FAIL:
        "❌ Não foi possível criar a figurinha."
};

// ==========================================================
// FILA
// ==========================================================

let running = 0;

async function waitQueue() {

    while (running >= MAX_CONCURRENT) {

        await new Promise(r => setTimeout(r, 150));

    }

    running++;

}

function releaseQueue() {

    running = Math.max(0, running - 1);

}

// ==========================================================
// TEMP
// ==========================================================

function temp(ext) {

    return path.join(
        os.tmpdir(),
        `sticker_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
    );

}

// ==========================================================
// DURAÇÃO
// ==========================================================

function getDuration(file) {

    return new Promise((resolve, reject) => {

        ffmpeg.ffprobe(file, (err, meta) => {

            if (err) return reject(err);

            resolve(meta?.format?.duration || 0);

        });

    });

}

// ==========================================================
// IDENTIFICA A MÍDIA
// ==========================================================

function getMediaInfo(msg) {

    const message = msg.message;

    if (!message) return null;

    const quoted =
        message.extendedTextMessage?.contextInfo?.quotedMessage;

    const target = quoted || message;

    if (target.stickerMessage) {

        return { type: "sticker" };

    }

    if (target.imageMessage) {

        return {
            type: "image",
            mime: target.imageMessage.mimetype || "image/jpeg"
        };

    }

    if (target.videoMessage) {

        return {
            type: "video",
            mime: target.videoMessage.mimetype || "video/mp4"
        };

    }

    return null;

}

// ==========================================================
// BAIXA A MÍDIA
// ==========================================================

async function downloadBuffer(sock, msg) {

    const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const target = quoted
        ? {
            key: {
                remoteJid: msg.key.remoteJid,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant:
                    msg.message.extendedTextMessage.contextInfo.participant,
                fromMe: false
            },
            message: quoted
        }
        : msg;

    return await downloadMediaMessage(
        target,
        "buffer",
        {},
        {
            logger: require("pino")({
                level: "silent"
            }),
            reuploadRequest: sock.updateMediaMessage
        }
    );

}

// ==========================================================
// IMAGEM -> WEBP
// ==========================================================

async function processImage(buffer, keepAspect) {

    let image = sharp(buffer);

    image = image.resize(STICKER_SIZE, STICKER_SIZE, {
        fit: keepAspect ? "contain" : "fill",
        background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
        }
    });

    const output = await image
        .webp({
            quality: 85
        })
        .toBuffer();

    return {
        buffer: output,
        animated: false
    };

}

// ==========================================================
// VÍDEO/GIF -> WEBP
// ==========================================================

async function processVideo(buffer, mime, keepAspect) {

    await waitQueue();

    const input = temp(
        mime.includes("gif")
            ? ".gif"
            : ".mp4"
    );

    const output = temp(".webp");

    try {

        fs.writeFileSync(input, buffer);

        const duration = await getDuration(input);

        if (duration < MIN_VIDEO_DURATION)
            throw new Error("VIDEO_TOO_SHORT");

        if (duration > MAX_VIDEO_DURATION)
            throw new Error("VIDEO_TOO_LONG");

        const scale = keepAspect
            ? `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`
            : `scale=${STICKER_SIZE}:${STICKER_SIZE}`;

        await new Promise((resolve, reject) => {

            ffmpeg(input)

                .outputOptions([

                    "-vcodec", "libwebp",

                    "-vf",
                    `fps=15,${scale}`,

                    "-loop", "0",

                    "-preset",
                    "picture",

                    "-an",

                    "-vsync",
                    "0",

                    "-compression_level",
                    "6",

                    "-q:v",
                    "70"

                ])

                .duration(MAX_VIDEO_DURATION)

                .format("webp")

                .save(output)

                .on("end", resolve)

                .on("error", reject);

        });

        const result = fs.readFileSync(output);

        if (result.length < 500) {

            throw new Error("INVALID_OUTPUT");

        }

        return {

            buffer: result,
            animated: true

        };

    }
    finally {

        releaseQueue();

        try {
            fs.unlinkSync(input);
        } catch { }

        try {
            fs.unlinkSync(output);
        } catch { }

    }

}

// ==========================================================
// ADICIONA EXIF (PACKNAME / AUTHOR)
// ==========================================================

async function addExif(webpBuffer) {

    const img = new webpmux.Image();

    await img.load(webpBuffer);

    const json = {
        "sticker-pack-id": "pokemon-bot",
        "sticker-pack-name": PACK_NAME,
        "sticker-pack-publisher": AUTHOR,
        emojis: []
    };

    const exifAttr = Buffer.from([
        0x49,0x49,0x2A,0x00,
        0x08,0x00,0x00,0x00,
        0x01,0x00,
        0x41,0x57,
        0x07,0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json));

    const exif = Buffer.concat([
        exifAttr,
        Buffer.from([
            jsonBuffer.length & 0xff,
            (jsonBuffer.length >> 8) & 0xff,
            (jsonBuffer.length >> 16) & 0xff,
            (jsonBuffer.length >> 24) & 0xff
        ]),
        jsonBuffer
    ]);

    img.exif = exif;

    return await img.save(null);

}

async function createSticker(sock, msg, keepAspect = false) {

    const info = getMediaInfo(msg);

    if (!info)
        return { error: ERRORS.NO_MEDIA };

    if (info.type === "sticker")
        return { error: ERRORS.STICKER_INPUT };

    if (
        info.type !== "image" &&
        info.type !== "video"
    )
        return { error: ERRORS.UNSUPPORTED };

    try {

        const media = await downloadBuffer(sock, msg);

        let result;

        if (info.type === "image") {

            result = await processImage(
                media,
                keepAspect
            );

        } else {

            result = await processVideo(
                media,
                info.mime,
                keepAspect
            );

        }

        result.buffer = await addExif(result.buffer);

        return result;

    }
    catch (err) {

        console.error(err);

        switch (err.message) {

            case "VIDEO_TOO_SHORT":
                return {
                    error: ERRORS.VIDEO_TOO_SHORT
                };

            case "VIDEO_TOO_LONG":
                return {
                    error: ERRORS.VIDEO_TOO_LONG
                };

            default:
                return {
                    error: ERRORS.PROCESS_FAIL
                };

        }

    }

}