import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedArticle, CacheEntry } from './types';
import { hashArticleUrl } from './hash';

// ── Storage backend ──────────────────────────────────────────────────────────
// Production (Vercel): uses Vercel Blob. BLOB_READ_WRITE_TOKEN is auto-set
// when you add a Blob store to your Vercel project.
//
// Local dev: falls back to the local filesystem at cache/articles/.
// ─────────────────────────────────────────────────────────────────────────────

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// ── Vercel Blob helpers ────────────────────────────────────────────────────

async function blobGet(key: string): Promise<ProcessedArticle | null> {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: `articles/${key}.json`, limit: 1 });
  if (blobs.length === 0) return null;
  const res = await fetch(blobs[0].url);
  if (!res.ok) return null;
  return res.json() as Promise<ProcessedArticle>;
}

async function blobSet(key: string, article: ProcessedArticle): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(`articles/${key}.json`, JSON.stringify(article), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

// ── Filesystem helpers (local dev) ───────────────────────────────────────────

function fsGet(key: string): ProcessedArticle | null {
  const CACHE_DIR = path.join(process.cwd(), 'cache', 'articles');
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(raw);
    return entry.article;
  } catch {
    return null;
  }
}

function fsSet(key: string, article: ProcessedArticle): void {
  const CACHE_DIR = path.join(process.cwd(), 'cache', 'articles');
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  const entry: CacheEntry = { article, cachedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getCachedArticle(articleUrl: string): Promise<ProcessedArticle | null> {
  const key = hashArticleUrl(articleUrl);
  if (useBlob) return blobGet(key);
  return fsGet(key);
}

export async function setCachedArticle(
  articleUrl: string,
  article: ProcessedArticle
): Promise<void> {
  const key = hashArticleUrl(articleUrl);
  if (useBlob) return blobSet(key, article);
  fsSet(key, article);
}
