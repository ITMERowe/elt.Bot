"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const notifier_1 = require("./discord/notifier");
const storage_1 = require("./services/storage");
async function main() {
    try {
        (0, config_1.validateConfig)();
    }
    catch (e) {
        console.error('[ERROR] Invalid config:', e);
        process.exit(1);
    }
    const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
    client.once('ready', async () => {
        try {
            // Try to load an existing post from state.json by id to use real thumbnail/title
            const testId = '1b936c9b-22d1-467e-bbde-533bb1ee57ec';
            const state = await (0, storage_1.readState)();
            let samplePost = state.seenPosts.find(p => p.id === testId);
            if (!samplePost) {
                samplePost = {
                    id: testId,
                    url: `https://ganknow.com/post/${testId}`,
                    title: 'Sample Post for Testing',
                    description: 'This is a test notification for the Discord embed.',
                    image: undefined,
                    thumbnail: 'https://via.placeholder.com/128.png?text=thumb',
                    timestamp: new Date().toISOString(),
                    pinned: false,
                };
            }
            await (0, notifier_1.sendPostNotification)(client, config_1.config.discordChannelId, samplePost);
            console.info('[INFO] Sample notification sent.');
        }
        catch (err) {
            console.error('[ERROR] Failed to send sample notification:', err);
        }
        finally {
            await client.destroy();
            process.exit(0);
        }
    });
    client.login(config_1.config.discordToken).catch(err => { console.error('[ERROR] Discord login failed:', err); process.exit(1); });
}
main();
