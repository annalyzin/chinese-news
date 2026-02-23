import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { processArticle, shouldReprocess } from '@/lib/gemini';
import { scrapeArticleText } from '@/lib/scraper';
import { getCachedArticle, setCachedArticle, deleteStaleArticles, flushCache } from '@/lib/article-cache';

// Vercel hobby plan allows up to 60s; set higher so Pro plan can benefit
export const maxDuration = 120;

// Process Gemini calls in batches to respect RPM limits
const GEMINI_BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (CRON_SECRET is auto-set by Vercel)
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const articles = await fetchNews();

  // 1. Filter out already-cached articles
  const toProcess: typeof articles = [];
  let skipped = 0;

  for (const article of articles) {
    const cached = await getCachedArticle(article.link);
    if (cached && !shouldReprocess(cached)) {
      skipped++;
    } else {
      toProcess.push(article);
    }
  }

  // 2. Scrape all uncached articles in parallel
  const scraped = await Promise.all(
    toProcess.map(async (article) => {
      try {
        const text = await scrapeArticleText(article.link);
        return text || article.description || article.title;
      } catch {
        return article.description || article.title;
      }
    })
  );

  // 3. Process Gemini calls in batches to respect RPM limits
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];
  let rateLimited = false;

  for (let i = 0; i < toProcess.length; i += GEMINI_BATCH_SIZE) {
    if (rateLimited) break;

    const batch = toProcess.slice(i, i + GEMINI_BATCH_SIZE);
    const batchScraped = scraped.slice(i, i + GEMINI_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((article, j) =>
        processArticle(batchScraped[j], article.title, article.article_id)
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        await setCachedArticle(batch[j].link, result.value);
        processed++;
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failed++;
        errors.push(`${batch[j].title}: ${msg}`);

        // Stop on rate-limit errors — remaining calls will also fail
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
          rateLimited = true;
        }
      }
    }
  }

  // 4. Clean up stale articles + persist everything in one write
  const deleted = await deleteStaleArticles(articles.map((a) => a.link));
  await flushCache();
  revalidatePath('/');

  return NextResponse.json({ processed, skipped, failed, deleted, total: articles.length, errors: errors.slice(0, 5) });
}
