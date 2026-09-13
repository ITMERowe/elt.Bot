import { Post } from './types';
import { chromium } from 'playwright';

const EXCLUDED_IMAGE_URLS = new Set([
  'https://lh3.googleusercontent.com/AxW6lOtogMltKo1TTDtiSjqhbNj6LqzoBrqQwylmpMl5aXnvGJSG5wQHu0iJK0EsDsOrHs28dPOk2dL4G6ay0aDxqXxlA6KuC8L_FVkWoZj_D1cKNRivUw',
  'https://lh3.googleusercontent.com/kpRM4PxlH2rZvV6vL2yCLgQTQXcaCgUSgB6H01Zi2OWHSVctJuhuiEgZ0PeGJE5762JEr6NUrRlYf8DMkAI9ZvKr8QFynaOm0qb4lAODDKlX0gMEnjVjNw',
  'https://lh3.googleusercontent.com/HMPqzejSK8b6j5ZA4KHjUTWFUeR9CknEkIzcCXafeuaeoE-7msuNodizGu77LzxKHIloR9eouMat--AMbaFSrLaIVrkwNPukIwyxQxroaOLpgmrYY91tVh8'
]);

function normalizeImageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().split(',')[0].trim().split(' ')[0];
  if (!value || value.startsWith('data:image')) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `https://ganknow.com${value}`;
  return value;
}

function allowedImage(url?: string): string | undefined {
  const normalized = normalizeImageUrl(url);
  if (!normalized || EXCLUDED_IMAGE_URLS.has(normalized.split(/[?#]/, 1)[0])) return undefined;
  return normalized;
}

export function sanitizePostMedia(post: Post): Post {
  return { ...post, image: allowedImage(post.image), thumbnail: allowedImage(post.thumbnail) };
}

async function fetchRenderedFeed(creatorUrl: string, targetCount?: number): Promise<Post[]> {
  const feedUrl = creatorUrl.includes('?') ? `${creatorUrl}&tab=feed` : `${creatorUrl}?tab=feed`;
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ userAgent: 'ganknow-discord-notifier/1.0' });
    await page.goto(feedUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.post-card', { timeout: 60_000 });

    let previousCount = 0;
    let unchangedRounds = 0;
    for (let round = 0; round < 60 && unchangedRounds < 4; round++) {
      const count = await page.locator('.post-card').count();
      if (targetCount && count >= targetCount) break;
      unchangedRounds = count === previousCount ? unchangedRounds + 1 : 0;
      previousCount = count;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(900);
    }

      const creatorSlug = (() => {
        try {
        return new URL(creatorUrl).pathname.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ') || '';
        } catch {
        return '';
        }
      })();
      const posts = await page.$$eval('.post-card', (cards, suffix) => cards.map(card => {
      const id = card.getAttribute('id') || '';
      const href = card.querySelector('a[href*="/post/"]')?.getAttribute('href') || '';
      const postId = id || (href.match(/\/post\/([0-9a-f-]{36})/i)?.[1] || '');
      const title = (card.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim();
        const normalize = (value: string) => value.replace(new RegExp(`\\s*-\\s*${suffix}\\s*$`, 'i'), '').replace(/\s+/g, ' ').trim().toLowerCase();
      const expectedTitle = normalize(title);
      let thumbnail: string | undefined;

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
    }), creatorSlug);

    return posts.filter(post => post.id).map(sanitizePostMedia);
  } finally {
    await browser.close();
  }
}

export async function fetchRecentPostsFromCreator(creatorUrl: string, limit = 20): Promise<Post[]> {
  return (await fetchRenderedFeed(creatorUrl, limit)).slice(0, limit);
}

export async function fetchAllPostsFromCreator(creatorUrl: string): Promise<Post[]> {
  return fetchRenderedFeed(creatorUrl);
}
