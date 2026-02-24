import Link from 'next/link';
import Image from 'next/image';
import type { NewsArticle } from '@/lib/types';

interface ArticleCardProps {
  article: NewsArticle;
  titleEnglish?: string | null;
}

export function ArticleCard({ article, titleEnglish }: ArticleCardProps) {
  const href = `/article/${encodeURIComponent(article.article_id)}`;

  return (
    <Link
      href={href}
      className="group flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm
                 hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      {article.image_url && (
        <div className="relative h-40 w-full bg-gray-100 flex-shrink-0">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 p-4">
        {/* Chinese title */}
        <h2 className="font-noto text-gray-900 text-base font-medium leading-snug
                        line-clamp-3 group-hover:text-red-700 transition-colors">
          {article.title}
        </h2>

        {/* English title translation */}
        {titleEnglish && (
          <p className="text-gray-400 text-xs leading-snug mt-1.5 line-clamp-2">
            {titleEnglish}
          </p>
        )}
      </div>
    </Link>
  );
}
