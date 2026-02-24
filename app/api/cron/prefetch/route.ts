import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { processArticle, shouldReprocess, hasRealTranslation } from '@/lib/llm';
import { scrapeArticleText } from '@/lib/scraper';
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

  // 2. Split into cached (skip) and uncached (process)
  const toProcess = articles.filter((a) => shouldReprocess(cache[a.link] ?? null));
  const skipped = articles.length - toProcess.length;

  // 3. Scrape all uncached articles in parallel
  const scraped = await Promise.all(
    toProcess.map(async (a) => {
      try {
        return (await scrapeArticleText(a.link)) || a.description || a.title;
      } catch {
        return a.description || a.title;
      }
    })
  );

  // 4. Process LLM calls in batches of 10 to stay within Groq TPM limits
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];
  const BATCH_SIZE = 10;

  for (let b = 0; b < toProcess.length; b += BATCH_SIZE) {
    const batch = toProcess.slice(b, b + BATCH_SIZE);
    const batchScraped = scraped.slice(b, b + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((a, i) => processArticle(batchScraped[i], a.title, a.article_id))
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        const key = batch[i].link;
        // Never replace a real translation with a mock one
        if (hasRealTranslation(r.value) || !hasRealTranslation(cache[key])) {
          cache[key] = r.value;
        }
        processed++;
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        failed++;
        errors.push(`${batch[i].title}: ${msg}`);
      }
    }
  }

  // 5. Remove stale articles no longer in the RSS feed
  const currentUrls = new Set(articles.map((a) => a.link));
  const staleKeys = Object.keys(cache).filter((url) => !currentUrls.has(url));
  for (const key of staleKeys) delete cache[key];

  // 6. Persist + revalidate (skip if nothing changed)
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
