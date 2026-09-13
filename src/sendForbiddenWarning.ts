import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { sendForbiddenChannelWarning } from './discord/notifier';

async function main(): Promise<void> {
  validateConfig();

  const forbiddenChannelId = config.forbiddenChannelIds[0];
  if (!forbiddenChannelId) {
    throw new Error('FORBIDDEN_CHANNEL_ID is not configured');
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('clientReady', async () => {
    try {
      await sendForbiddenChannelWarning(client, forbiddenChannelId);
      console.info('[INFO] Forbidden-channel warning sent');
    } finally {
      await client.destroy();
    }
  });

  await client.login(config.discordToken);
}

main().catch(err => {
  console.error('[ERROR] Failed to send forbidden-channel warning:', err instanceof Error ? err.message : err);
  process.exit(1);
});