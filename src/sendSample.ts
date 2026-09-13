import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { sendPostNotification } from './discord/notifier';
import { readState } from './services/storage';

async function main() {
  try { validateConfig(); } catch (e) { console.error('[ERROR] Invalid config:', e); process.exit(1); }
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('ready', async () => {
    try {
      // Try to load an existing post from state.json by id to use real thumbnail/title
      const testId = '1b936c9b-22d1-467e-bbde-533bb1ee57ec';
      const state = await readState();
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
        } as any;
      }
      await sendPostNotification(client, config.discordChannelId, samplePost as any);
      console.info('[INFO] Sample notification sent.');
    } catch (err) {
      console.error('[ERROR] Failed to send sample notification:', err);
    } finally {
      await client.destroy();
      process.exit(0);
    }
  });
  client.login(config.discordToken).catch(err => { console.error('[ERROR] Discord login failed:', err); process.exit(1); });
}

main();
