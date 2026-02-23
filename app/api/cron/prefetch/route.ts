import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { processArticle, shouldReprocess } from '@/lib/gemini';
import { scrapeArticleText } from '@/lib/scraper';
import { loadCache, saveCache } from '@/lib/article-cache';

// Vercel hobby plan allows up to 60s; set higher so Pro plan can benefit
export const maxDuration = 120;

// Process Gemini calls in batches to respect RPM limits
const GEMINI_BATCH_SIZE = 5;

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

  // 4. Process Gemini calls in batches
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < toProcess.length; i += GEMINI_BATCH_SIZE) {
    const batch = toProcess.slice(i, i + GEMINI_BATCH_SIZE);
    const batchText = scraped.slice(i, i + GEMINI_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((a, j) => processArticle(batchText[j], a.title, a.article_id))
    );

    let rateLimited = false;
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        cache[batch[j].link] = r.value;
        processed++;
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        failed++;
        errors.push(`${batch[j].title}: ${msg}`);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
          rateLimited = true;
        }
      }
    }

    if (rateLimited) break;
  }

  // 5. Remove stale articles no longer in the RSS feed
  const currentUrls = new Set(articles.map((a) => a.link));
  const staleKeys = Object.keys(cache).filter((url) => !currentUrls.has(url));
  for (const key of staleKeys) delete cache[key];

  // 6. Persist + revalidate
  await saveCache(cache);
  revalidatePath('/');

  return NextResponse.json({
    processed, skipped, failed,
    deleted: staleKeys.length,
    total: articles.length,
    errors: errors.slice(0, 5),
  });
}
