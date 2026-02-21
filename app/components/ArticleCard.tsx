'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { NewsArticle } from '@/lib/types';

interface ArticleCardProps {
  article: NewsArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const href = `/article/${encodeURIComponent(article.article_id)}`;
  const [titleEnglish, setTitleEnglish] = useState<string | null>(null);

  const formattedDate = new Date(article.pubDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    // Check cache immediately (instant if already processed)
    fetch(`/api/article-title?url=${encodeURIComponent(article.link)}`)
      .then((r) => r.json())
      .then((data) => { if (data.titleEnglish) setTitleEnglish(data.titleEnglish); })
      .catch(() => {});

    // Also listen for PrefetchArticles to finish processing this article
    const handler = (e: Event) => {
      const { url, titleEnglish: t } = (e as CustomEvent<{ url: string; titleEnglish: string }>).detail;
      if (url === article.link && t) setTitleEnglish(t);
    };
    window.addEventListener('title-translated', handler);
    return () => window.removeEventListener('title-translated', handler);
  }, [article.link]);

  return (
    <Link
      href={href}
      className="group flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm
                 hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      {article.image_url && (
        <div className="relative h-44 w-full bg-gray-100 flex-shrink-0">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5">
        {/* Category chip */}
        {article.category?.[0] && (
          <span className="inline-block self-start text-xs font-medium text-red-600
                           bg-red-50 rounded-full px-2.5 py-0.5 mb-3 uppercase tracking-wide">
            {article.category[0]}
          </span>
        )}

        {/* Chinese title */}
        <h2 className="font-noto text-gray-900 text-base font-medium leading-snug
                        mb-1 line-clamp-3 group-hover:text-red-700 transition-colors">
          {article.title}
        </h2>

        {/* English title translation (available after first prefetch) */}
        {titleEnglish && (
          <p className="text-gray-400 text-xs leading-snug mb-3 line-clamp-2">
            {titleEnglish}
          </p>
        )}

        {/* Date */}
        <div className="flex items-center justify-end text-xs text-gray-400 mt-auto pt-3 border-t border-gray-50">
          <span>{formattedDate}</span>
        </div>
      </div>
    </Link>
  );
}
