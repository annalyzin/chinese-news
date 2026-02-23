import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { processArticle, shouldReprocess } from '@/lib/gemini';
import { scrapeArticleText } from '@/lib/scraper';
import { getCachedArticle, setCachedArticle, deleteStaleArticles, flushCache } from '@/lib/article-cache';

// Allow up to 120 seconds — one Gemini call per article, processed sequentially
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (CRON_SECRET is auto-set by Vercel)
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const articles = await fetchNews();

  // Process articles sequentially to avoid Gemini API rate limits
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const article of articles) {
    try {
      const cached = await getCachedArticle(article.link);
      if (cached && !shouldReprocess(cached)) {
        skipped++;
        continue;
      }

      const scraped = await scrapeArticleText(article.link);
      const text = scraped || article.description || article.title;

      const result = await processArticle(text, article.title, article.article_id);
      await setCachedArticle(article.link, result);
      await flushCache(); // persist after each article so progress survives timeouts
      revalidatePath('/'); // bust ISR cache so home page picks up new translations
      processed++;
    } catch (e) {
      failed++;
      errors.push(`${article.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Remove cached articles that are no longer in the RSS feed
  const deleted = await deleteStaleArticles(articles.map((a) => a.link));

  // Write all changes to blob/fs in a single operation
  await flushCache();

  // Bust the ISR cache so the home page picks up new translations
  revalidatePath('/');

  return NextResponse.json({ processed, skipped, failed, deleted, total: articles.length, errors: errors.slice(0, 5) });
}
