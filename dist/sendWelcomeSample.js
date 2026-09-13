"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const notifier_1 = require("./discord/notifier");
async function main() {
    (0, config_1.validateConfig)();
    const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMembers] });
    client.once('clientReady', async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild)
                throw new Error('The bot is not connected to any Discord server');
            const members = await guild.members.fetch();
            const member = members.find(candidate => !candidate.user.bot) || members.first();
            if (!member)
                throw new Error('No server members were found');
            await (0, notifier_1.sendWelcomeNotification)(client, config_1.config.welcomeChannelId, member);
            console.info('[INFO] Welcome sample sent using', member.user.tag, 'from', guild.name);
        }
        catch (err) {
            console.error('[ERROR] Failed to send welcome sample:', err instanceof Error ? err.message : err);
            process.exitCode = 1;
        }
        finally {
            await client.destroy();
        }
    });
    await client.login(config_1.config.discordToken);
}
main().catch(err => {
    console.error('[ERROR] Welcome sample failed:', err instanceof Error ? err.message : err);
    process.exit(1);
});
