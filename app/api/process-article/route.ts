import { NextRequest, NextResponse } from 'next/server';
import { getCachedArticle, setCachedArticle } from '@/lib/article-cache';
import { processArticle } from '@/lib/gemini';
import { scrapeArticleText } from '@/lib/scraper';

// Allow up to 60 seconds for scraping + AI processing
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, articleUrl, articleText, articleTitle } = body as {
      articleId: string;
      articleUrl: string;
      articleText: string;
      articleTitle: string;
    };

    if (!articleUrl || !articleText) {
      return NextResponse.json(
        { error: 'Missing articleUrl or articleText' },
        { status: 400 }
      );
    }

    // Return cached result if it has a real translation (instant)
    // Skip mock entries when Gemini is available so they get re-processed
    const cached = await getCachedArticle(articleUrl);
    const isMock = cached?.titleEnglish === '[mock translation]';
    if (cached?.titleEnglish && !(isMock && process.env.GOOGLE_API_KEY)) {
      return NextResponse.json(cached);
    }

    const scraped = await scrapeArticleText(articleUrl);
    const textToProcess = scraped || articleText;
    const titleToProcess = articleTitle || '';

    const processed = await processArticle(textToProcess, titleToProcess, articleId);

    // Persist to cache for future visits
    await setCachedArticle(articleUrl, processed);

    return NextResponse.json(processed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[process-article]', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
