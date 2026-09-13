import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { sendWelcomeNotification } from './discord/notifier';

async function main(): Promise<void> {
  validateConfig();

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  client.once('clientReady', async () => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) throw new Error('The bot is not connected to any Discord server');

      const members = await guild.members.fetch();
      const member = members.find(candidate => !candidate.user.bot) || members.first();
      if (!member) throw new Error('No server members were found');

      await sendWelcomeNotification(client, config.welcomeChannelId, member);
      console.info('[INFO] Welcome sample sent using', member.user.tag, 'from', guild.name);
    } catch (err) {
      console.error('[ERROR] Failed to send welcome sample:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    } finally {
      await client.destroy();
    }
  });

  await client.login(config.discordToken);
}

main().catch(err => {
  console.error('[ERROR] Welcome sample failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});