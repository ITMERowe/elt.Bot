"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readState = readState;
exports.writeState = writeState;
exports.isSeenPost = isSeenPost;
exports.markSeenPostsByPosts = markSeenPostsByPosts;
exports.setLastSentDisc = setLastSentDisc;
exports.getLastSentDisc = getLastSentDisc;
exports.markSeenPostByPost = markSeenPostByPost;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const STATE_PATH = path_1.default.resolve(process.cwd(), 'data', 'state.json');
const EXCLUDED_IMAGE_URLS = [
    'https://lh3.googleusercontent.com/AxW6lOtogMltKo1TTDtiSjqhbNj6LqzoBrqQwylmpMl5aXnvGJSG5wQHu0iJK0EsDsOrHs28dPOk2dL4G6ay0aDxqXxlA6KuC8L_FVkWoZj_D1cKNRivUw',
    'https://lh3.googleusercontent.com/kpRM4PxlH2rZvV6vL2yCLgQTQXcaCgUSgB6H01Zi2OWHSVctJuhuiEgZ0PeGJE5762JEr6NUrRlYf8DMkAI9ZvKr8QFynaOm0qb4lAODDKlX0gMEnjVjNw',
    'https://lh3.googleusercontent.com/HMPqzejSK8b6j5ZA4KHjUTWFUeR9CknEkIzcCXafeuaeoE-7msuNodizGu77LzxKHIloR9eouMat--AMbaFSrLaIVrkwNPukIwyxQxroaOLpgmrYY91tVh8'
];
function isExcludedImageUrl(url) {
    if (!url)
        return false;
    const baseUrl = url.split(/[?#]/, 1)[0];
    return EXCLUDED_IMAGE_URLS.includes(baseUrl);
}
function sanitizeState(state) {
    return {
        ...state,
        seenPosts: state.seenPosts.map(post => ({
            ...post,
            image: isExcludedImageUrl(post.image) ? undefined : post.image,
            thumbnail: isExcludedImageUrl(post.thumbnail) ? undefined : post.thumbnail
        }))
    };
}
async function readState() {
    try {
        const txt = await promises_1.default.readFile(STATE_PATH, 'utf-8');
        const s = JSON.parse(txt);
        return sanitizeState({
            lastPostId: s.lastPostId ?? null,
            lastSentDisc: s.lastSentDisc ?? null,
            seenPosts: Array.isArray(s.seenPosts) ? s.seenPosts : [],
        });
    }
    catch (err) {
        return { lastPostId: null, lastSentDisc: null, seenPosts: [] };
    }
}
async function writeState(state) {
    await promises_1.default.mkdir(path_1.default.dirname(STATE_PATH), { recursive: true });
    await promises_1.default.writeFile(STATE_PATH, JSON.stringify(sanitizeState(state), null, 2), 'utf-8');
}
async function isSeenPost(id) {
    const s = await readState();
    return s.seenPosts.some((p) => p.id === id);
}
async function markSeenPostsByPosts(posts) {
    if (!posts || posts.length === 0)
        return;
    const s = await readState();
    const map = new Map();
    for (const p of s.seenPosts || [])
        map.set(p.id, p);
    for (const p of posts)
        map.set(p.id, p);
    s.seenPosts = Array.from(map.values());
    // Update lastPostId to the newest provided post if available
    if (posts.length > 0)
        s.lastPostId = posts[0].id;
    await writeState(s);
}
async function setLastSentDisc(postId) {
    const s = await readState();
    s.lastSentDisc = postId;
    await writeState(s);
}
async function getLastSentDisc() {
    const s = await readState();
    return s.lastSentDisc ?? null;
}
async function markSeenPostByPost(post) {
    await markSeenPostsByPosts([post]);
}
