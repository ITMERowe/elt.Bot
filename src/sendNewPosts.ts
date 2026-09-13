import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { sendPostNotification } from './discord/notifier';
import { getLastSentDisc, readState, setLastSentDisc } from './services/storage';

async function main() {
  validateConfig();
  const state = await readState();
  const checkpoint = await getLastSentDisc();
  const posts = state.seenPosts.filter(post => !post.pinned);
  const checkpointIndex = checkpoint ? posts.findIndex(post => post.id === checkpoint) : -1;
  const pending = checkpointIndex >= 0 ? posts.slice(0, checkpointIndex) : posts;

  console.info('[INFO] New posts pending:', pending.length);
  if (pending.length === 0) return;

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('ready', async () => {
    try {
      for (const post of pending.slice().reverse()) {
        await sendPostNotification(client, config.discordChannelId, post);
        await setLastSentDisc(post.id);
        console.info('[INFO] Sent', post.id, post.title || '');
      }
      console.info('[INFO] New-post send complete. lastSentDisc:', pending[0].id);
    } catch (err) {
      console.error('[ERROR] New-post send stopped:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    } finally {
      await client.destroy();
    }
  });

  await client.login(config.discordToken);
}

main().catch(err => {
  console.error('[ERROR] New-post send failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
