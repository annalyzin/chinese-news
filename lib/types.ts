export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  pubDate: string;
  image_url: string | null;
  category: string[];
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
  titleSentence: ProcessedSentence;
  titleEnglish: string;
  processedAt: string;
  articleId: string;
}

export interface CacheEntry {
  article: ProcessedArticle;
  cachedAt: string;
}
