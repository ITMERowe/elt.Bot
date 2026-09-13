"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const ganknowCreatorUrl = process.env.GANKNOW_CREATOR_URL || 'https://ganknow.com/karamelt';
const derivedCreatorName = (() => {
    try {
        const slug = new URL(ganknowCreatorUrl).pathname.split('/').filter(Boolean).pop() || 'creator';
        return decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
    }
    catch {
        return 'Creator';
    }
})();
exports.config = {
    discordToken: process.env.DISCORD_TOKEN || '',
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    discordAppId: process.env.DISCORD_APP_ID || '',
    discordPublicKey: process.env.DISCORD_PUBLIC_KEY || '',
    discordChannelId: process.env.UPDATE_CHANNEL_ID || '',
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID || process.env.UPDATE_CHANNEL_ID || '',
    forbiddenChannelIds: (process.env.FORBIDDEN_CHANNEL_IDS || process.env.FORBIDDEN_CHANNEL_ID || '')
        .split(',')
        .map(channelId => channelId.trim())
        .filter(Boolean),
    welcomeBackgroundPath: process.env.WELCOME_BACKGROUND_PATH || 'public/welcome-background.png',
    welcomeForegroundPath: process.env.WELCOME_FOREGROUND_PATH || '',
    welcomeFontFamily: process.env.WELCOME_FONT_FAMILY || 'Trebuchet MS',
    welcomeFontPath: process.env.WELCOME_FONT_PATH || '',
    welcomeTitleFontPath: process.env.WELCOME_TITLE_FONT_PATH || '',
    welcomeTitleFontFamily: process.env.WELCOME_TITLE_FONT_FAMILY || 'WelcomeTitle',
    ganknowCreatorUrl,
    ganknowCreatorName: process.env.GANKNOW_CREATOR_NAME || derivedCreatorName,
    discordPostCta: process.env.DISCORD_POST_CTA || 'View on Ganknow',
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || '3600000')
};
function validateConfig() {
    if (!exports.config.discordToken)
        throw new Error('DISCORD_TOKEN is required');
    if (!exports.config.discordChannelId)
        throw new Error('UPDATE_CHANNEL_ID is required');
}
