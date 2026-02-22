import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedArticle, CacheEntry } from './types';
import { hashArticleUrl } from './hash';

// ── Storage backend ──────────────────────────────────────────────────────────
// Production (Vercel): uses Vercel KV (Redis). KV_REST_API_URL is auto-set
// when you add a KV store to your Vercel project.
//
// Local dev: falls back to the local filesystem at cache/articles/.
// ─────────────────────────────────────────────────────────────────────────────

const useKV = !!process.env.KV_REST_API_URL;

// ── Vercel KV helpers ────────────────────────────────────────────────────────

async function kvGet(key: string): Promise<ProcessedArticle | null> {
  const { kv } = await import('@vercel/kv');
  return kv.get<ProcessedArticle>(key);
}

async function kvSet(key: string, article: ProcessedArticle): Promise<void> {
  const { kv } = await import('@vercel/kv');
  // TTL: 8 days so stale articles are automatically evicted
  await kv.set(key, article, { ex: 8 * 24 * 60 * 60 });
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
  if (useKV) return kvGet(key);
  return fsGet(key);
}

export async function setCachedArticle(
  articleUrl: string,
  article: ProcessedArticle
): Promise<void> {
  const key = hashArticleUrl(articleUrl);
  if (useKV) return kvSet(key, article);
  fsSet(key, article);
}
