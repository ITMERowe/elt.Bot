import fs from 'fs/promises';
import path from 'path';
import { Post } from '../ganknow/types';

export interface State {
  lastPostId: string | null;
  lastSentDisc: string | null;
  seenPosts: Post[];
}

const STATE_PATH = path.resolve(process.cwd(), 'data', 'state.json');

const EXCLUDED_IMAGE_URLS = [
  'https://lh3.googleusercontent.com/AxW6lOtogMltKo1TTDtiSjqhbNj6LqzoBrqQwylmpMl5aXnvGJSG5wQHu0iJK0EsDsOrHs28dPOk2dL4G6ay0aDxqXxlA6KuC8L_FVkWoZj_D1cKNRivUw',
  'https://lh3.googleusercontent.com/kpRM4PxlH2rZvV6vL2yCLgQTQXcaCgUSgB6H01Zi2OWHSVctJuhuiEgZ0PeGJE5762JEr6NUrRlYf8DMkAI9ZvKr8QFynaOm0qb4lAODDKlX0gMEnjVjNw',
  'https://lh3.googleusercontent.com/HMPqzejSK8b6j5ZA4KHjUTWFUeR9CknEkIzcCXafeuaeoE-7msuNodizGu77LzxKHIloR9eouMat--AMbaFSrLaIVrkwNPukIwyxQxroaOLpgmrYY91tVh8'
];

function isExcludedImageUrl(url?: string): boolean {
  if (!url) return false;
  const baseUrl = url.split(/[?#]/, 1)[0];
  return EXCLUDED_IMAGE_URLS.includes(baseUrl);
}

function sanitizeState(state: State): State {
  return {
    ...state,
    seenPosts: state.seenPosts.map(post => ({
      ...post,
      image: isExcludedImageUrl(post.image) ? undefined : post.image,
      thumbnail: isExcludedImageUrl(post.thumbnail) ? undefined : post.thumbnail
    }))
  };
}

export async function readState(): Promise<State> {
  try {
    const txt = await fs.readFile(STATE_PATH, 'utf-8');
    const s = JSON.parse(txt) as Partial<State>;
    return sanitizeState({
      lastPostId: s.lastPostId ?? null,
      lastSentDisc: s.lastSentDisc ?? null,
      seenPosts: Array.isArray(s.seenPosts) ? s.seenPosts : [],
    });
  } catch (err) {
    return { lastPostId: null, lastSentDisc: null, seenPosts: [] };
  }
}

export async function writeState(state: State): Promise<void> {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(sanitizeState(state), null, 2), 'utf-8');
}

export async function isSeenPost(id: string): Promise<boolean> {
  const s = await readState();
  return s.seenPosts.some((p) => p.id === id);
}

export async function markSeenPostsByPosts(posts: Post[]): Promise<void> {
  if (!posts || posts.length === 0) return;
  const s = await readState();
  const map = new Map<string, Post>();
  for (const p of s.seenPosts || []) map.set(p.id, p);
  for (const p of posts) map.set(p.id, p);
  s.seenPosts = Array.from(map.values());
  // Update lastPostId to the newest provided post if available
  if (posts.length > 0) s.lastPostId = posts[0].id;
  await writeState(s);
}

export async function setLastSentDisc(postId: string | null): Promise<void> {
  const s = await readState();
  s.lastSentDisc = postId;
  await writeState(s);
}

export async function getLastSentDisc(): Promise<string | null> {
  const s = await readState();
  return s.lastSentDisc ?? null;
}

export async function markSeenPostByPost(post: Post): Promise<void> {
  await markSeenPostsByPosts([post]);
}
