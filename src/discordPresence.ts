import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { handleForbiddenChannelMessage } from './discord/moderation';

try {
  validateConfig();
} catch (err) {
  console.error('[ERROR] Invalid configuration:', err instanceof Error ? err.message : err);
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

client.on('messageCreate', handleForbiddenChannelMessage);

client.on('guildMemberAdd', async member => {
  try {
    const { sendWelcomeNotification } = await import('./discord/notifier');
    await sendWelcomeNotification(client, config.welcomeChannelId, member);
    console.info('[INFO] Welcome sent for', member.user.tag);
  } catch (err) {
    console.error('[ERROR] Failed to send welcome message:', err instanceof Error ? err.message : err);
  }
});

client.once('clientReady', () => {
  console.info('[INFO] Discord presence online as', client.user?.tag || 'bot');
});

client.login(config.discordToken).catch(err => {
  console.error('[ERROR] Discord presence login failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

function shutdown(): void {
  void client.destroy().finally(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);