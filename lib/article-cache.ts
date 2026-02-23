import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedArticle } from './types';

// ── Storage backend ──────────────────────────────────────────────────────────
// All articles are stored in a single JSON blob/file to minimize operations.
//
// Production (Vercel): uses Vercel Blob (one file: cache.json)
// Local dev: falls back to the local filesystem at cache/articles.json
// ─────────────────────────────────────────────────────────────────────────────

type ArticlesCache = Record<string, ProcessedArticle>;

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const CACHE_FILE = path.join(process.cwd(), 'cache', 'articles.json');
const BLOB_KEY = 'articles-cache.json';

// ── In-memory cache (lives for the duration of a single serverless invocation)
let memoryCache: ArticlesCache | null = null;

// ── Vercel Blob helpers ────────────────────────────────────────────────────

async function blobReadAll(): Promise<ArticlesCache> {
  if (memoryCache) return memoryCache;
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
  if (blobs.length === 0) {
    memoryCache = {};
    return memoryCache;
  }
  const res = await fetch(blobs[0].url);
  if (!res.ok) {
    memoryCache = {};
    return memoryCache;
  }
  memoryCache = (await res.json()) as ArticlesCache;
  return memoryCache;
}

async function blobWriteAll(cache: ArticlesCache): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(BLOB_KEY, JSON.stringify(cache), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  memoryCache = cache;
}

// ── Filesystem helpers (local dev) ───────────────────────────────────────────

function fsReadAll(): ArticlesCache {
  if (memoryCache) return memoryCache;
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    memoryCache = JSON.parse(raw) as ArticlesCache;
    return memoryCache;
  } catch {
    memoryCache = {};
    return memoryCache;
  }
}

function fsWriteAll(cache: ArticlesCache): void {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  memoryCache = cache;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getCachedArticle(articleUrl: string): Promise<ProcessedArticle | null> {
  const cache = useBlob ? await blobReadAll() : fsReadAll();
  return cache[articleUrl] ?? null;
}

/** Update an article in the in-memory cache. Call flushCache() to persist. */
export async function setCachedArticle(
  articleUrl: string,
  article: ProcessedArticle
): Promise<void> {
  const cache = useBlob ? await blobReadAll() : fsReadAll();
  cache[articleUrl] = article;
}

/** Remove cached articles whose URLs are not in the given set (in-memory only). */
export async function deleteStaleArticles(currentUrls: string[]): Promise<number> {
  const keep = new Set(currentUrls);
  const cache = useBlob ? await blobReadAll() : fsReadAll();
  const staleKeys = Object.keys(cache).filter((url) => !keep.has(url));

  for (const key of staleKeys) {
    delete cache[key];
  }

  return staleKeys.length;
}

/** Persist the in-memory cache to blob storage / filesystem. */
export async function flushCache(): Promise<void> {
  if (!memoryCache) return;
  if (useBlob) {
    await blobWriteAll(memoryCache);
  } else {
    fsWriteAll(memoryCache);
  }
}
