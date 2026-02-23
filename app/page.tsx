import { fetchNews } from '@/lib/news';
import { loadCache } from '@/lib/article-cache';
import type { NewsArticle } from '@/lib/types';
import { ArticleCard } from './components/ArticleCard';

// Revalidate every 24 hours
export const revalidate = 86400;

export default async function HomePage() {
  let articles: NewsArticle[] = [];
  let error: string | null = null;

  try {
    articles = await fetchNews();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load news';
  }

  // Load cache once and extract titles
  const cache = await loadCache();
  const titles = articles.map((a) => cache[a.link]?.titleEnglish ?? null);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Page header */}
      <header className="mb-10">
        <h1 className="font-noto text-3xl font-bold text-gray-900 mb-2">
          今日新闻
        </h1>
        <p className="text-gray-500 text-sm">
          Daily Chinese news · Click any article to read with pinyin and translations
        </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
