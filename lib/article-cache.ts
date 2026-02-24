import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedArticle } from './types';

// ── Storage backend ──────────────────────────────────────────────────────────
// All articles are stored in a single JSON blob/file to minimize operations.
//
// Production (Vercel): uses Vercel Blob (one file: articles-cache.json)
// Local dev: falls back to the local filesystem at cache/articles.json
// ─────────────────────────────────────────────────────────────────────────────

export type ArticlesCache = Record<string, ProcessedArticle>;

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const CACHE_FILE = path.join(process.cwd(), 'cache', 'articles.json');
const BLOB_KEY = 'articles-cache.json';

// Cache the blob URL across warm lambda invocations to skip the list() call
let blobUrl: string | null = null;

/** Load the full cache from blob storage or filesystem. */
export async function loadCache(): Promise<ArticlesCache> {
  if (useBlob) {
    if (!blobUrl) {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
      if (blobs.length === 0) return {};
      blobUrl = blobs[0].url;
    }
    const res = await fetch(blobUrl, { cache: 'no-store' });
    if (!res.ok) {
      blobUrl = null; // Reset on failure so next call re-discovers
      return {};
    }
    return (await res.json()) as ArticlesCache;
  }

  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw) as ArticlesCache;
  } catch {
    return {};
  }
}

/** Persist the full cache to blob storage or filesystem. */
export async function saveCache(cache: ArticlesCache): Promise<void> {
  if (useBlob) {
    const { put } = await import('@vercel/blob');
    const blob = await put(BLOB_KEY, JSON.stringify(cache), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    blobUrl = blob.url; // Update cached URL after write
  } else {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  }
}
