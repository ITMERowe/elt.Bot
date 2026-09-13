"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const client_1 = require("./ganknow/client");
const storage_1 = require("./services/storage");
const spinner_1 = require("./utils/spinner");
async function main() {
    if (!config_1.config.ganknowCreatorUrl) {
        console.error('[ERROR] GANKNOW_CREATOR_URL is not set in .env');
        process.exit(1);
    }
    try {
        console.info('[INFO] Running update fetch for', config_1.config.ganknowCreatorUrl);
        const state = await (0, storage_1.readState)();
        const lastPostId = state.lastPostId;
        const pinnedId = (state.seenPosts || []).find(p => !!p.pinned)?.id || null;
        const stopSpinner = (0, spinner_1.startSpinner)('Fetching recent posts from creator feed');
        // Fail-fast: call fetchRecentPostsFromCreator directly (same behavior as initial-fetch)
        const posts = await (0, client_1.fetchRecentPostsFromCreator)(config_1.config.ganknowCreatorUrl, 100);
        stopSpinner();
        if (!posts || posts.length === 0) {
            console.info('[INFO] No recent posts found.');
            return;
        }
        // Read existing state to determine where to insert
        const existingState = await (0, storage_1.readState)();
        existingState.seenPosts = existingState.seenPosts.map(client_1.sanitizePostMedia);
        await (0, storage_1.writeState)(existingState);
        const existingIds = new Set((existingState.seenPosts || []).map(p => p.id));
        // Collect new posts: skip pinned and stop when we hit lastPostId
        const newPosts = [];
        for (const p of posts) {
            if (p.id === pinnedId)
                continue; // skip the pinned post
            if (lastPostId && p.id === lastPostId)
                break; // reached known territory
            if (existingIds.has(p.id))
                continue; // already recorded
            newPosts.push((0, client_1.sanitizePostMedia)(p));
        }
        if (newPosts.length === 0) {
            console.info('[INFO] No new posts since lastPostId.');
            return;
        }
        console.info('[INFO] Found', newPosts.length, 'new posts (excluding pinned).');
        // Remove timestamps from new posts before inserting — feed timestamps are unreliable
        newPosts.forEach(n => { delete n.timestamp; });
        // Insert new posts between pinned and lastPostId
        const stateToWrite = existingState;
        const pinnedIndex = stateToWrite.seenPosts.findIndex(s => !!s.pinned);
        const insertAt = pinnedIndex >= 0 ? pinnedIndex + 1 : 0;
        // Remove any duplicates from existing seenPosts for safety
        const filteredSeen = stateToWrite.seenPosts.filter(s => !newPosts.some(n => n.id === s.id));
        // Ensure we don't place new posts after lastPostId; if lastPostId appears before insertAt, adjust
        const lastIndex = filteredSeen.findIndex(s => s.id === lastPostId);
        let finalInsertAt = insertAt;
        if (lastIndex >= 0 && lastIndex < insertAt)
            finalInsertAt = lastIndex;
        // Insert new posts preserving newest-first order
        filteredSeen.splice(finalInsertAt, 0, ...newPosts);
        stateToWrite.seenPosts = filteredSeen;
        // Update lastPostId to the newest inserted post (first in newPosts)
        if (newPosts.length > 0) {
            stateToWrite.lastPostId = newPosts[0].id;
        }
        await (0, storage_1.writeState)(stateToWrite);
        console.info('[INFO] Inserted', newPosts.length, 'new posts into state.json (lastPostId updated to', stateToWrite.lastPostId, ')');
    }
    catch (err) {
        // Handle rate limit politely
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyErr = err;
            if (anyErr && anyErr.name === 'RateLimitError') {
                const retry = anyErr.retryAfterSeconds;
                console.warn('[WARN] Rate limited by Ganknow. Retry-After:', retry ?? 'unknown', 'seconds. Aborting this run.');
                return;
            }
        }
        catch { }
        console.error('[ERROR] updateFetch failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    }
}
main();
