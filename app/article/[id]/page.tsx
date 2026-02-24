import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { fetchNews } from '@/lib/news';
import { loadCache, saveCache } from '@/lib/article-cache';
import { hasRealTranslation, processArticle } from '@/lib/llm';
import { scrapeArticleText } from '@/lib/scraper';
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

  let processed = cache[article.link] ?? null;

  // On-demand translation: if no real translation exists, translate now
  if (!hasRealTranslation(processed)) {
    try {
      const text = await scrapeArticleText(article.link) || article.description || article.title;
      const result = await processArticle(text, article.title, article.article_id);
      if (hasRealTranslation(result)) {
        cache[article.link] = result;
        await saveCache(cache);
        revalidatePath('/');
        processed = result;
      }
    } catch {
      // Translation failed — show article without translations
    }
  }

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
