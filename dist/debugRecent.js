"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./ganknow/client");
const config_1 = require("./config");
async function main() {
    if (!config_1.config.ganknowCreatorUrl) {
        console.error('[ERROR] GANKNOW_CREATOR_URL not set');
        process.exit(1);
    }
    console.info('[DEBUG] Fetching recent posts (limit 20)');
    const posts = await (0, client_1.fetchRecentPostsFromCreator)(config_1.config.ganknowCreatorUrl, 20);
    console.log('Found', posts.length, 'posts:');
    for (const p of posts) {
        console.log(p.id, p.title, 'thumbnail=', p.thumbnail || '(none)', 'image=', p.image || '(none)');
    }
}
main().catch(e => { console.error(e); process.exit(1); });
