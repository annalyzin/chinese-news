import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { loadCache, saveCache } from '@/lib/article-cache';
import { hasRealTranslation, shouldReprocess } from '@/lib/llm';
import { translateArticles } from '@/lib/translate-batch';
import { SentenceBlock } from '@/app/components/SentenceBlock';
import { ArticleHeader } from '@/app/components/ArticleHeader';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const articleId = decodeURIComponent(id);

  const [articles, cache] = await Promise.all([fetchNews(), loadCache()]);
  const article = articles.find((a) => a.article_id === articleId);

  if (!article) notFound();

  // On-demand translation: if no real translation exists, translate now
  if (shouldReprocess(cache[article.link] ?? null)) {
    const { translated } = await translateArticles([article], cache);
    if (translated > 0) {
      await saveCache(cache);
      revalidatePath('/');
    }
  }

  const processed = cache[article.link];
  const translated = hasRealTranslation(processed) ? processed : null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleHeader
        article={article}
        titleSentence={translated?.titleSentence}
        titleEnglish={translated?.titleEnglish}
      />

      {translated ? (
        <article>
          {translated.sentences.map((sentence, i) => (
            <SentenceBlock key={i} sentence={sentence} />
          ))}
        </article>
      ) : (
        <p className="font-noto text-gray-700 leading-relaxed text-lg">
          {article.description || article.title}
        </p>
      )}
    </main>
  );
}
