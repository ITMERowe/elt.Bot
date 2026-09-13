"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const notifier_1 = require("./discord/notifier");
const storage_1 = require("./services/storage");
async function main() {
    (0, config_1.validateConfig)();
    const state = await (0, storage_1.readState)();
    const checkpoint = await (0, storage_1.getLastSentDisc)();
    const posts = state.seenPosts.filter(post => !post.pinned);
    const checkpointIndex = checkpoint ? posts.findIndex(post => post.id === checkpoint) : -1;
    const pending = checkpointIndex >= 0 ? posts.slice(0, checkpointIndex) : posts;
    console.info('[INFO] New posts pending:', pending.length);
    if (pending.length === 0)
        return;
    const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
    client.once('ready', async () => {
        try {
            for (const post of pending.slice().reverse()) {
                await (0, notifier_1.sendPostNotification)(client, config_1.config.discordChannelId, post);
                await (0, storage_1.setLastSentDisc)(post.id);
                console.info('[INFO] Sent', post.id, post.title || '');
            }
            console.info('[INFO] New-post send complete. lastSentDisc:', pending[0].id);
        }
        catch (err) {
            console.error('[ERROR] New-post send stopped:', err instanceof Error ? err.message : err);
            process.exitCode = 1;
        }
        finally {
            await client.destroy();
        }
    });
    await client.login(config_1.config.discordToken);
}
main().catch(err => {
    console.error('[ERROR] New-post send failed:', err instanceof Error ? err.message : err);
    process.exit(1);
});
