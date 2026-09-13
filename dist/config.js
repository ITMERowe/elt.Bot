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
exports.config = {
    discordToken: process.env.DISCORD_TOKEN || '',
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    discordAppId: process.env.DISCORD_APP_ID || '',
    discordPublicKey: process.env.DISCORD_PUBLIC_KEY || '',
    discordChannelId: process.env.DISCORD_CHANNEL_ID || '',
    ganknowCreatorUrl: process.env.GANKNOW_CREATOR_URL || 'https://ganknow.com/karamelt',
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || '60000')
};
function validateConfig() {
    if (!exports.config.discordToken)
        throw new Error('DISCORD_TOKEN is required');
    if (!exports.config.discordChannelId)
        throw new Error('DISCORD_CHANNEL_ID is required');
}
