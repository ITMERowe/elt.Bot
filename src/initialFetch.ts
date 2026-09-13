import { config } from './config';
import { fetchAllPostsFromCreator } from './ganknow/client';
import { markSeenPostsByPosts, readState, writeState } from './services/storage';
import { startSpinner } from './utils/spinner';

async function main() {
  if (!config.ganknowCreatorUrl) {
    console.error('[ERROR] GANKNOW_CREATOR_URL is not set in .env');
    process.exit(1);
  }

  try {
    console.info('[INFO] Running initial fetch for', config.ganknowCreatorUrl);
    // Clear existing state so initial-fetch always starts from a clean slate.
    // lastSentDisc is independent from the fetch tracking state and should be reset manually
    // by the Discord sender when appropriate.
    await writeState({ lastPostId: null, lastSentDisc: null, seenPosts: [] });
    console.info('[INFO] Cleared existing data/state.json');
    const stopRecentSpinner = startSpinner('Fetching recent posts from creator feed');
    const posts = await fetchAllPostsFromCreator(config.ganknowCreatorUrl);
    console.info('[INFO] Found', posts.length, 'posts');
    stopRecentSpinner();
    const enriched = posts;

    for (const p of enriched) {
      console.log(`${p.url} — "${p.title || ''}"`);
    }

    // Dumb pinned rule for initial fetch: mark the very first post we saw as pinned,
    // and mark all other posts as not pinned. This only applies during initial-fetch.
    if (enriched.length > 0) {
      enriched.forEach((p, idx) => { p.pinned = idx === 0; });
    }

    if (enriched.length > 0) {
      // Keep persisted state lean: no timestamp/description fields needed.
      enriched.forEach(e => {
        delete (e as any).timestamp;
        delete (e as any).description;
      });
      const stopWriteSpinner = startSpinner('Writing state to data/state.json');
      await markSeenPostsByPosts(enriched);
      const state = await readState();
      // Prefer the first non-pinned post as the seed for lastPostId to avoid using the artificially-pinned item.
      let seed = enriched.find(p => !p.pinned);
      if (!seed) {
        // If there is no non-pinned post (only one post), fallback to second item if available, else first.
        seed = enriched.length > 1 ? enriched[1] : enriched[0];
      }
      state.lastPostId = seed.id;
      await writeState(state);
      stopWriteSpinner();
      console.info('[INFO] Marked', enriched.length, 'posts as seen and set lastPostId to', seed.id);
    } else {
      console.info('[INFO] No posts found to mark.');
    }
  } catch (err) {
    console.error('[ERROR] initialFetch failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
