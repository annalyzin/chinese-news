import { fetchNews } from '@/lib/news';
import { loadCache, saveCache, type ArticlesCache } from '@/lib/article-cache';
import { hasRealTranslation, shouldReprocess } from '@/lib/llm';
import { translateArticles } from '@/lib/translate-batch';
import { formatArticleDate } from '@/lib/format';
import type { NewsArticle } from '@/lib/types';
import { ArticleCard } from './components/ArticleCard';

// Revalidate every hour — ensures failed translations are retried promptly
export const revalidate = 3600;

export default async function HomePage() {
  let articles: NewsArticle[] = [];
  let cache: ArticlesCache = {};
  let error: string | null = null;

  // Fetch news + cache in parallel; catch both independently
  const [newsResult, cacheResult] = await Promise.allSettled([
    fetchNews(),
    loadCache(),
  ]);

  if (newsResult.status === 'fulfilled') {
    articles = newsResult.value;
  } else {
    error = newsResult.reason instanceof Error
      ? newsResult.reason.message
      : String(newsResult.reason);
  }
  if (cacheResult.status === 'fulfilled') {
    cache = cacheResult.value;
  }

  // On-demand: translate any articles missing real translations (skips mocks when LLM is disabled)
  const untranslated = articles.filter((a) => shouldReprocess(cache[a.link] ?? null));
  if (untranslated.length > 0) {
    const { translated } = await translateArticles(untranslated, cache);
    if (translated > 0) await saveCache(cache);
  }

  const titles = articles.map((a) => {
    const processed = cache[a.link];
    return hasRealTranslation(processed) ? processed.titleEnglish : null;
  });

  // Use the date from the first article (all are from the same daily feed)
  const todayFormatted = articles.length > 0
    ? formatArticleDate(articles[0].pubDate)
    : null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <header className="mb-8">
        <p className="text-sm text-gray-400 mb-1">
          Click any article to read with pinyin and translations
        </p>
        {todayFormatted && (
          <p className="text-xs text-gray-400">{todayFormatted}</p>
        )}
      </header>

      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-100 p-6 text-center">
          <p className="text-red-600 font-medium text-sm">Could not load news</p>
          <p className="text-red-400 text-xs mt-1">{error}</p>
          <p className="text-gray-500 text-xs mt-3">
            Could not reach the 8world RSS feed. Check your network connection.
          </p>
        </div>
      ) : articles.length === 0 ? (
        <p className="text-gray-400 text-center py-20 text-sm">
          No articles available. Check back later.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article, i) => (
            <ArticleCard
              key={article.article_id}
              article={article}
              titleEnglish={titles[i]}
            />
          ))}
        </div>
      )}
    </main>
  );
}
