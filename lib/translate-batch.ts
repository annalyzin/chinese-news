import { processArticle, hasRealTranslation } from './llm';
import { scrapeArticleText } from './scraper';
import type { ArticlesCache } from './article-cache';
import type { NewsArticle } from './types';

const BATCH_SIZE = 10;

export interface TranslateResult {
  translated: number;
  failed: number;
  errors: string[];
}

/**
 * Scrape and translate articles that lack real translations.
 * Mutates `cache` in-place with new translations.
 * Scrapes and processes per-batch to limit peak memory usage.
 */
export async function translateArticles(
  articles: NewsArticle[],
  cache: ArticlesCache
): Promise<TranslateResult> {
  if (articles.length === 0) return { translated: 0, failed: 0, errors: [] };

  let translated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let b = 0; b < articles.length; b += BATCH_SIZE) {
    const batch = articles.slice(b, b + BATCH_SIZE);

    // Scrape this batch in parallel
    const scraped = await Promise.all(
      batch.map(async (a) => {
        try {
          return (await scrapeArticleText(a.link)) || a.description || a.title;
        } catch {
          return a.description || a.title;
        }
      })
    );

    // Translate this batch in parallel
    const results = await Promise.allSettled(
      batch.map((a, i) => processArticle(scraped[i], a.title, a.article_id))
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        const key = batch[i].link;
        // Never replace a real translation with a mock one
        if (hasRealTranslation(r.value) || !hasRealTranslation(cache[key])) {
          cache[key] = r.value;
        }
        translated++;
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        failed++;
        errors.push(`${batch[i].title}: ${msg}`);
      }
    }
  }

  return { translated, failed, errors };
}
