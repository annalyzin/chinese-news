import { NextRequest, NextResponse } from 'next/server';
import { fetchNews } from '@/lib/news';
import { processArticle } from '@/lib/gemini';
import { scrapeArticleText } from '@/lib/scraper';
import { getCachedArticle, setCachedArticle } from '@/lib/article-cache';

// Allow up to 60 seconds — processes all articles concurrently
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (CRON_SECRET is auto-set by Vercel)
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const articles = await fetchNews();

  // Process all articles concurrently; skip ones already cached with English title
  const results = await Promise.allSettled(
    articles.map(async (article) => {
      const cached = await getCachedArticle(article.link);
      if (cached?.titleEnglish) return 'skipped';

      const scraped = await scrapeArticleText(article.link);
      const text = scraped || article.description || article.title;
      const title = article.title;

      const processed = await processArticle(text, title, article.article_id);
      await setCachedArticle(article.link, processed);
      return 'processed';
    })
  );

  const processed = results.filter((r) => r.status === 'fulfilled' && r.value === 'processed').length;
  const skipped = results.filter((r) => r.status === 'fulfilled' && r.value === 'skipped').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ processed, skipped, failed, total: articles.length });
}
