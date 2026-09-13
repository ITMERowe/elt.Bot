import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config';
import { fetchRecentPostsFromCreator } from './ganknow/client';
import { readState, writeState, isSeenPost, markSeenPostsByPosts } from './services/storage';
import { sendPostNotification } from './discord/notifier';

async function main() {
  try {
    validateConfig();
  } catch (err) {
    console.error('[ERROR] Invalid configuration:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('clientReady', async () => {
    console.info('[INFO] Discord client ready');

    // initialize state
    const state = await readState();
    console.info('[INFO] Loaded state:', state);

    // On first run, seed lastPostId to the latest non-pinned post to avoid announcing pinned posts
    if (!state.lastPostId) {
      try {
        const recent = await fetchRecentPostsFromCreator(config.ganknowCreatorUrl, 5);
        if (recent && recent.length > 0) {
          // prefer the second item when available (common pattern: first may be a pinned post)
          const seed = recent.length > 1 ? recent[1] : recent[0];
          state.lastPostId = seed.id;
          await writeState(state);
          console.info('[INFO] Initialized lastPostId to', seed.id);
        }
      } catch (err) {
        console.error('[ERROR] Failed initial fetch:', err);
      }
    }

    let isChecking = false;

    const check = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        console.info('[INFO] Checking Ganknow...');
        // Fetch a batch of recent posts (newest-first)
        const recent = await fetchRecentPostsFromCreator(config.ganknowCreatorUrl, 20);
        if (!recent || recent.length === 0) {
          console.info('[INFO] No posts found');
          return;
        }
        console.info('[INFO] Fetched', recent.length, 'recent posts');

        const currentState = await readState();

        // Collect new posts until we reach a seen post, then stop (fetcher stops at known ID)
        const newPosts: typeof recent = [];
        for (const p of recent) {
          const seen = await isSeenPost(p.id);
          if (seen) break; // stop when an already-stored post is reached
          newPosts.push(p);
        }

        if (newPosts.length === 0) {
          console.info('[INFO] No new posts to notify.');
          return;
        }

        // Send notifications oldest->newest so channel sees them in order
        const toSend = newPosts.slice().reverse();
        console.info('[INFO] New posts to notify:', toSend.map(p => p.id));
        for (const post of toSend) {
          try {
            await sendPostNotification(client, config.discordChannelId, post);
            console.info('[INFO] Notification sent for', post.id);
          } catch (err) {
            console.error('[ERROR] Failed to send Discord notification for', post.id, err instanceof Error ? err.message : err);
          }
        }

        // Mark all new posts as seen and persist lastPostId to newest
        try {
          await markSeenPostsByPosts(newPosts);
          currentState.lastPostId = newPosts[0].id || currentState.lastPostId;
          await writeState(currentState);
          console.info('[INFO] State updated with', newPosts.length, 'seen posts');
        } catch (err) {
          console.error('[ERROR] Failed to update state after notifications:', err instanceof Error ? err.message : err);
        }
      } catch (err) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e: any = err;
          if (e && e.name === 'RateLimitError') {
            console.warn('[WARN] Rate limited by Ganknow. Aborting this poll.');
            return;
          }
        } catch {}
        console.error('[ERROR] Failed to retrieve Ganknow posts:', err instanceof Error ? err.message : err);
      } finally {
        isChecking = false;
      }
    };

    // Run immediate check then schedule
    await check();
    setInterval(check, config.pollIntervalMs);
  });

  client.login(config.discordToken).catch((err) => {
    console.error('[ERROR] Failed to login to Discord:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[FATAL] Unhandled:', err);
  process.exit(1);
});
