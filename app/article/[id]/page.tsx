import { notFound } from 'next/navigation';
import { fetchNews } from '@/lib/news';
import { loadCache } from '@/lib/article-cache';
import { SentenceBlock } from '@/app/components/SentenceBlock';
import { ArticleHeader } from '@/app/components/ArticleHeader';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const articleId = decodeURIComponent(id);

  const articles = await fetchNews();
  const article = articles.find((a) => a.article_id === articleId);

  if (!article) notFound();

  const cache = await loadCache();
  const processed = cache[article.link] ?? null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleHeader
        article={article}
        titleSentence={processed?.titleSentence}
        titleEnglish={processed?.titleEnglish}
      />

      {processed ? (
        <article>
          {processed.sentences.map((sentence, i) => (
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
