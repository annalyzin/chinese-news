export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  content: string | null;
  pubDate: string;
  source_id: string;
  source_name: string;
  source_url: string;
  image_url: string | null;
  category: string[];
  language: string;
  country: string[];
}

export interface Token {
  text: string;
  pinyin: string | null; // null for punctuation
}

export interface ProcessedSentence {
  tokens: Token[];
  english: string;
}

export interface ProcessedArticle {
  sentences: ProcessedSentence[];
  // Optional for backwards-compat with older cache entries
  titleSentence?: ProcessedSentence;
  titleEnglish?: string;
  processedAt: string;
  articleId: string;
}

export interface CacheEntry {
  article: ProcessedArticle;
  cachedAt: string;
}
