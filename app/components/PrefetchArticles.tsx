'use client';

import { useEffect } from 'react';
import type { NewsArticle } from '@/lib/types';

interface PrefetchArticlesProps {
  articles: NewsArticle[];
}

// Fires background requests to pre-process all articles when the home page loads.
// Dispatches a 'title-translated' browser event for each article so ArticleCard
// can update its English title without waiting for a page refresh.
export function PrefetchArticles({ articles }: PrefetchArticlesProps) {
  useEffect(() => {
    articles.forEach((article, i) => {
      // Stagger requests to avoid overwhelming Gemini rate limits
      setTimeout(async () => {
        try {
          const res = await fetch('/api/process-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId: article.article_id,
              articleUrl: article.link,
              articleText: article.description || article.title,
              articleTitle: article.title,
            }),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.titleEnglish) {
            window.dispatchEvent(
              new CustomEvent('title-translated', {
                detail: { url: article.link, titleEnglish: data.titleEnglish },
              })
            );
          }
        } catch {
          // best-effort — ignore errors
        }
      }, i * 1500);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
