import { formatArticleDate } from '@/lib/format';
import type { NewsArticle, ProcessedSentence } from '@/lib/types';
import Link from 'next/link';
import { RubyText } from './RubyText';

interface ArticleHeaderProps {
  article: NewsArticle;
  titleSentence?: ProcessedSentence;
  titleEnglish?: string;
}

export function ArticleHeader({ article, titleSentence, titleEnglish }: ArticleHeaderProps) {
  const formattedDate = formatArticleDate(article.pubDate);

  return (
    <header className="mb-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600
                   transition-colors mb-6 group"
      >
        <svg
          className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All articles
      </Link>

      {/* Date */}
      <p className="text-xs text-gray-400 mb-4">{formattedDate}</p>

      {/* Title — pinyin version if processed, plain text otherwise */}
      {titleSentence ? (
        <p className="chinese-sentence font-noto font-bold text-gray-900 mb-2"
           style={{ fontSize: '1.5rem', lineHeight: 3.2 }}>
          <RubyText tokens={titleSentence.tokens} />
        </p>
      ) : (
        <h1 className="font-noto text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
          {article.title}
        </h1>
      )}

      {/* English title translation */}
      {titleEnglish && (
        <p className="text-gray-500 text-base mb-4">{titleEnglish}</p>
      )}

      {/* Description as subtitle */}
      {article.description && (
        <p className="text-gray-500 text-sm leading-relaxed border-l-2 border-red-200 pl-4 mb-0">
          {article.description}
        </p>
      )}

      <div className="mt-6 border-t border-gray-100" />
    </header>
  );
}
