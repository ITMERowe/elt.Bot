"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const notifier_1 = require("./discord/notifier");
async function main() {
    (0, config_1.validateConfig)();
    const forbiddenChannelId = config_1.config.forbiddenChannelIds[0];
    if (!forbiddenChannelId) {
        throw new Error('FORBIDDEN_CHANNEL_ID is not configured');
    }
    const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
    client.once('clientReady', async () => {
        try {
            await (0, notifier_1.sendForbiddenChannelWarning)(client, forbiddenChannelId);
            console.info('[INFO] Forbidden-channel warning sent');
        }
        finally {
            await client.destroy();
        }
    });
    await client.login(config_1.config.discordToken);
}
main().catch(err => {
    console.error('[ERROR] Failed to send forbidden-channel warning:', err instanceof Error ? err.message : err);
    process.exit(1);
});
