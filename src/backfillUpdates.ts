import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { sendPostNotification } from './discord/notifier';
import { getLastSentDisc, readState, setLastSentDisc } from './services/storage';

const SEND_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  validateConfig();
  const state = await readState();
  const checkpoint = await getLastSentDisc();
  const posts = state.seenPosts.filter(post => !post.pinned).slice().reverse();
  const startIndex = checkpoint ? posts.findIndex(post => post.id === checkpoint) + 1 : 0;
  const pending = startIndex > 0 ? posts.slice(startIndex) : posts;

  console.info('[INFO] Backfill posts pending:', pending.length);
  if (pending.length === 0) return;

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('ready', async () => {
    try {
      for (const post of pending) {
        await sendPostNotification(client, config.discordChannelId, post, { autoPublish: false });
        await setLastSentDisc(post.id);
        console.info('[INFO] Backfilled', post.id, post.title || '');
        await delay(SEND_DELAY_MS);
      }
      console.info('[INFO] Backfill complete. lastSentDisc:', pending[pending.length - 1].id);
    } catch (err) {
      console.error('[ERROR] Backfill stopped:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    } finally {
      await client.destroy();
    }
  });

  await client.login(config.discordToken);
}

main().catch(err => {
  console.error('[ERROR] Backfill failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
