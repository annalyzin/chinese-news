'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ProcessedArticle, NewsArticle } from '@/lib/types';
import { SentenceBlock } from '@/app/components/SentenceBlock';
import { ProcessingSpinner } from '@/app/components/ProcessingSpinner';
import { ArticleHeader } from '@/app/components/ArticleHeader';

type Status = 'loading-meta' | 'processing' | 'ready' | 'error';

export default function ArticlePage() {
  const params = useParams();
  const articleId = decodeURIComponent(params.id as string);

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [processed, setProcessed] = useState<ProcessedArticle | null>(null);
  const [status, setStatus] = useState<Status>('loading-meta');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Step 1: Fetch article metadata (hits Next.js cache — no extra API call)
        setStatus('loading-meta');
        const metaRes = await fetch(
          `/api/article-meta?id=${encodeURIComponent(articleId)}`
        );
        if (!metaRes.ok) throw new Error('Article not found');
        const meta: NewsArticle = await metaRes.json();
        setArticle(meta);

        // Step 2: Process with Gemini (or return from disk cache instantly)
        setStatus('processing');
        const text = meta.description || meta.title;
        const processRes = await fetch('/api/process-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: meta.article_id,
            articleUrl: meta.link,
            articleText: text,
            articleTitle: meta.title,
          }),
        });

        if (!processRes.ok) {
          const errData = await processRes.json().catch(() => ({}));
          throw new Error(errData.error || `Server error ${processRes.status}`);
        }
        const data: ProcessedArticle = await processRes.json();
        setProcessed(data);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      }
    }

    load();
  }, [articleId]);

  if (status === 'loading-meta') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <ProcessingSpinner message="Loading article..." />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-red-600 font-medium">Failed to load article</p>
        <p className="text-gray-400 text-sm mt-2">{error}</p>
        <a href="/" className="inline-block mt-6 text-sm text-red-600 hover:underline">
          ← Back to articles
        </a>
      </div>
    );
  }

  const preview = article?.description || article?.title;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {article && (
        <ArticleHeader
          article={article}
          titleSentence={processed?.titleSentence}
          titleEnglish={processed?.titleEnglish}
        />
      )}

      {status === 'processing' && (
        <>
          {/* Show raw text immediately so there's something to read */}
          {preview && (
            <p className="font-noto text-gray-700 leading-relaxed text-lg mb-8">
              {preview}
            </p>
          )}
          <ProcessingSpinner
            message="Adding pinyin and translations..."
            detail="This takes up to 30 seconds on first visit. Visit the home page first to pre-load articles."
          />
        </>
      )}

      {status === 'ready' && processed && (
        <article>
          {processed.sentences.map((sentence, i) => (
            <SentenceBlock key={i} sentence={sentence} />
          ))}
        </article>
      )}
    </main>
  );
}
