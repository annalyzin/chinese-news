import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { shouldReprocess } from '@/lib/llm';
import { translateArticles } from '@/lib/translate-batch';
import { loadCache, saveCache } from '@/lib/article-cache';

// Vercel hobby plan allows up to 60s; set higher so Pro plan can benefit
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Load articles + cache in parallel
  const [articles, cache] = await Promise.all([fetchNews(), loadCache()]);

  // 2. Translate articles that need (re)processing
  const toProcess = articles.filter((a) => shouldReprocess(cache[a.link] ?? null));
  const skipped = articles.length - toProcess.length;
  const { translated: processed, failed, errors } = await translateArticles(toProcess, cache);

  // 3. Remove stale articles no longer in the RSS feed
  const currentUrls = new Set(articles.map((a) => a.link));
  const staleKeys = Object.keys(cache).filter((url) => !currentUrls.has(url));
  for (const key of staleKeys) delete cache[key];

  // 4. Persist + revalidate (skip if nothing changed)
  const changed = processed > 0 || staleKeys.length > 0;
  if (changed) {
    await saveCache(cache);
    revalidatePath('/');
  }

  return NextResponse.json({
    processed, skipped, failed,
    deleted: staleKeys.length,
    total: articles.length,
    errors: errors.slice(0, 5),
  });
}
