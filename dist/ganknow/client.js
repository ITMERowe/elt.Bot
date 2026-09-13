"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePostMedia = sanitizePostMedia;
exports.fetchRecentPostsFromCreator = fetchRecentPostsFromCreator;
exports.fetchAllPostsFromCreator = fetchAllPostsFromCreator;
const playwright_1 = require("playwright");
const EXCLUDED_IMAGE_URLS = new Set([
    'https://lh3.googleusercontent.com/AxW6lOtogMltKo1TTDtiSjqhbNj6LqzoBrqQwylmpMl5aXnvGJSG5wQHu0iJK0EsDsOrHs28dPOk2dL4G6ay0aDxqXxlA6KuC8L_FVkWoZj_D1cKNRivUw',
    'https://lh3.googleusercontent.com/kpRM4PxlH2rZvV6vL2yCLgQTQXcaCgUSgB6H01Zi2OWHSVctJuhuiEgZ0PeGJE5762JEr6NUrRlYf8DMkAI9ZvKr8QFynaOm0qb4lAODDKlX0gMEnjVjNw',
    'https://lh3.googleusercontent.com/HMPqzejSK8b6j5ZA4KHjUTWFUeR9CknEkIzcCXafeuaeoE-7msuNodizGu77LzxKHIloR9eouMat--AMbaFSrLaIVrkwNPukIwyxQxroaOLpgmrYY91tVh8'
]);
function normalizeImageUrl(raw) {
    if (!raw)
        return undefined;
    const value = raw.trim().split(',')[0].trim().split(' ')[0];
    if (!value || value.startsWith('data:image'))
        return undefined;
    if (value.startsWith('//'))
        return `https:${value}`;
    if (value.startsWith('/'))
        return `https://ganknow.com${value}`;
    return value;
}
function allowedImage(url) {
    const normalized = normalizeImageUrl(url);
    if (!normalized || EXCLUDED_IMAGE_URLS.has(normalized.split(/[?#]/, 1)[0]))
        return undefined;
    return normalized;
}
function sanitizePostMedia(post) {
    return { ...post, image: allowedImage(post.image), thumbnail: allowedImage(post.thumbnail) };
}
async function fetchRenderedFeed(creatorUrl) {
    const feedUrl = creatorUrl.includes('?') ? `${creatorUrl}&tab=feed` : `${creatorUrl}?tab=feed`;
    const browser = await playwright_1.chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ userAgent: 'ganknow-discord-notifier/1.0' });
        await page.goto(feedUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForSelector('.post-card', { timeout: 60_000 });
        let previousCount = 0;
        let unchangedRounds = 0;
        for (let round = 0; round < 60 && unchangedRounds < 4; round++) {
            const count = await page.locator('.post-card').count();
            unchangedRounds = count === previousCount ? unchangedRounds + 1 : 0;
            previousCount = count;
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(900);
        }
        const posts = await page.$$eval('.post-card', cards => cards.map(card => {
            const id = card.getAttribute('id') || '';
            const href = card.querySelector('a[href*="/post/"]')?.getAttribute('href') || '';
            const postId = id || (href.match(/\/post\/([0-9a-f-]{36})/i)?.[1] || '');
            const title = (card.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim();
            const normalize = (value) => value.replace(/\s*-\s*karamelt\s*$/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
            const expectedTitle = normalize(title);
            let thumbnail;
            for (const image of Array.from(card.querySelectorAll('img'))) {
                if (normalize(image.getAttribute('alt') || '') === expectedTitle) {
                    thumbnail = image.getAttribute('src') || image.getAttribute('data-src') || undefined;
                    break;
                }
            }
            return {
                id: postId,
                url: `https://ganknow.com/post/${postId}`,
                title,
                thumbnail,
                locked: /\bLOCKED\b|Berlangganan untuk Membuka|Subscribe to Unlock/i.test(card.textContent || '')
            };
        }));
        return posts.filter(post => post.id).map(sanitizePostMedia);
    }
    finally {
        await browser.close();
    }
}
async function fetchRecentPostsFromCreator(creatorUrl, limit = 20) {
    return (await fetchRenderedFeed(creatorUrl)).slice(0, limit);
}
async function fetchAllPostsFromCreator(creatorUrl) {
    return fetchRenderedFeed(creatorUrl);
}
