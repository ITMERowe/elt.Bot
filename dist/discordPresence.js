"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
try {
    (0, config_1.validateConfig)();
}
catch (err) {
    console.error('[ERROR] Invalid configuration:', err instanceof Error ? err.message : err);
    process.exit(1);
}
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMembers] });
client.on('guildMemberAdd', async (member) => {
    try {
        const { sendWelcomeNotification } = await Promise.resolve().then(() => __importStar(require('./discord/notifier')));
        await sendWelcomeNotification(client, config_1.config.welcomeChannelId, member);
        console.info('[INFO] Welcome sent for', member.user.tag);
    }
    catch (err) {
        console.error('[ERROR] Failed to send welcome message:', err instanceof Error ? err.message : err);
    }
});
client.once('clientReady', () => {
    console.info('[INFO] Discord presence online as', client.user?.tag || 'bot');
});
client.login(config_1.config.discordToken).catch(err => {
    console.error('[ERROR] Discord presence login failed:', err instanceof Error ? err.message : err);
    process.exit(1);
});
function shutdown() {
    void client.destroy().finally(() => process.exit(0));
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
