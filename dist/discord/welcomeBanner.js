"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWelcomeBanner = createWelcomeBanner;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const canvas_1 = require("@napi-rs/canvas");
const config_1 = require("../config");
const WIDTH = 900;
const HEIGHT = 280;
const TEXT_LEFT = 235;
const TEXT_RIGHT_PADDING = 24;
function drawCoverImage(context, image) {
    const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
}
function drawCircularAvatar(context, image) {
    context.save();
    context.beginPath();
    context.arc(115, HEIGHT / 2, 78, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, 37, HEIGHT / 2 - 78, 156, 156);
    context.restore();
}
function fitWelcomeTitle(context, text) {
    const maxSize = 38;
    const minSize = 24;
    const availableWidth = WIDTH - TEXT_LEFT - TEXT_RIGHT_PADDING;
    for (let fontSize = maxSize; fontSize >= minSize; fontSize--) {
        context.font = `700 ${fontSize}px "${config_1.config.welcomeTitleFontPath ? config_1.config.welcomeTitleFontFamily : config_1.config.welcomeFontFamily}"`;
        if (context.measureText(text).width <= availableWidth)
            return;
    }
    context.font = `700 ${minSize}px "${config_1.config.welcomeTitleFontPath ? config_1.config.welcomeTitleFontFamily : config_1.config.welcomeFontFamily}"`;
}
async function createWelcomeBanner(member) {
    if (config_1.config.welcomeFontPath) {
        const fontPath = path_1.default.resolve(process.cwd(), config_1.config.welcomeFontPath);
        try {
            canvas_1.GlobalFonts.registerFromPath(fontPath, config_1.config.welcomeFontFamily);
        }
        catch {
            // Supporting text falls back to the configured system font if unavailable.
        }
    }
    if (config_1.config.welcomeTitleFontPath) {
        const titleFontPath = path_1.default.resolve(process.cwd(), config_1.config.welcomeTitleFontPath);
        try {
            canvas_1.GlobalFonts.registerFromPath(titleFontPath, config_1.config.welcomeTitleFontFamily);
        }
        catch {
            // The title falls back to the configured system font if the custom font is unavailable.
        }
    }
    const canvas = (0, canvas_1.createCanvas)(WIDTH, HEIGHT);
    const context = canvas.getContext('2d');
    context.fillStyle = '#17151c';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const backgroundPath = path_1.default.resolve(process.cwd(), config_1.config.welcomeBackgroundPath);
    try {
        const background = await (0, canvas_1.loadImage)(await promises_1.default.readFile(backgroundPath));
        drawCoverImage(context, background);
    }
    catch {
        // A background is optional; the dark fallback keeps welcomes working until one is added.
    }
    context.fillStyle = 'rgba(0, 0, 0, 0.16)';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const avatar = await (0, canvas_1.loadImage)(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    drawCircularAvatar(context, avatar);
    if (config_1.config.welcomeForegroundPath) {
        const foregroundPath = path_1.default.resolve(process.cwd(), config_1.config.welcomeForegroundPath);
        try {
            const foreground = await (0, canvas_1.loadImage)(await promises_1.default.readFile(foregroundPath));
            drawCoverImage(context, foreground);
        }
        catch {
            // A missing foreground is optional and should not block welcome messages.
        }
    }
    context.fillStyle = '#ffffff';
    const welcomeTitle = `Welcome, ${member.user.displayName}!`;
    fitWelcomeTitle(context, welcomeTitle);
    context.lineWidth = 7;
    context.strokeStyle = '#fc9fb8';
    context.strokeText(welcomeTitle, TEXT_LEFT, 105);
    context.fillText(welcomeTitle, TEXT_LEFT, 105);
    context.save();
    context.globalCompositeOperation = 'source-atop';
    context.lineWidth = 1;
    context.strokeText(welcomeTitle, TEXT_LEFT, 105);
    context.restore();
    context.font = `500 32px "${config_1.config.welcomeFontFamily}"`;
    context.shadowColor = 'rgba(0, 0, 0, 0.55)';
    context.shadowBlur = 3;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.strokeText(`to ${member.guild.name}`, TEXT_LEFT, 155);
    context.fillText(`to ${member.guild.name}`, TEXT_LEFT, 155);
    context.font = `500 24px "${config_1.config.welcomeFontFamily}"`;
    context.strokeText(`You are member ${member.guild.memberCount.toLocaleString()}!`, TEXT_LEFT, 190);
    context.fillText(`You are member ${member.guild.memberCount.toLocaleString()}!`, TEXT_LEFT, 190);
    return canvas.toBuffer('image/png');
}
