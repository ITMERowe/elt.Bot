"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const notifier_1 = require("./discord/notifier");
const storage_1 = require("./services/storage");
const SEND_DELAY_MS = 1500;
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function main() {
    (0, config_1.validateConfig)();
    const state = await (0, storage_1.readState)();
    const checkpoint = await (0, storage_1.getLastSentDisc)();
    const posts = state.seenPosts.filter(post => !post.pinned).slice().reverse();
    const startIndex = checkpoint ? posts.findIndex(post => post.id === checkpoint) + 1 : 0;
    const pending = startIndex > 0 ? posts.slice(startIndex) : posts;
    console.info('[INFO] Backfill posts pending:', pending.length);
    if (pending.length === 0)
        return;
    const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
    client.once('ready', async () => {
        try {
            for (const post of pending) {
                await (0, notifier_1.sendPostNotification)(client, config_1.config.discordChannelId, post, { autoPublish: false });
                await (0, storage_1.setLastSentDisc)(post.id);
                console.info('[INFO] Backfilled', post.id, post.title || '');
                await delay(SEND_DELAY_MS);
            }
            console.info('[INFO] Backfill complete. lastSentDisc:', pending[pending.length - 1].id);
        }
        catch (err) {
            console.error('[ERROR] Backfill stopped:', err instanceof Error ? err.message : err);
            process.exitCode = 1;
        }
        finally {
            await client.destroy();
        }
    });
    await client.login(config_1.config.discordToken);
}
main().catch(err => {
    console.error('[ERROR] Backfill failed:', err instanceof Error ? err.message : err);
    process.exit(1);
});
