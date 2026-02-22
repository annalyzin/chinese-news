import type { ProcessedArticle, ProcessedSentence, Token } from './types';

// ── Mock implementation ─────────────────────────────────────────────
// Returns placeholder tokens (one per character) with "pinyin" as null
// and "[mock translation]" as English. Replace with real API later.

const PUNCTUATION = new Set('，。！？、；：""''（）《》—…·');

function mockTokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const char of text) {
    if (PUNCTUATION.has(char) || /[\s\p{P}]/u.test(char)) {
      tokens.push({ text: char, pinyin: null });
    } else {
      tokens.push({ text: char, pinyin: 'mò' });
    }
  }
  return tokens;
}

function mockProcess(text: string): ProcessedSentence[] {
  const parts = text.split(/(?<=[。！？…])/g).filter(Boolean);
  const sentences = parts.length > 0 ? parts : [text];

  return sentences.map((s) => ({
    tokens: mockTokenize(s.trim()),
    english: '[mock translation]',
  }));
}

export async function processArticle(
  articleText: string,
  articleTitle: string,
  articleId: string
): Promise<ProcessedArticle> {
  const titleSentences = mockProcess(articleTitle);
  const titleSentence = titleSentences[0];
  const titleEnglish = titleSentence?.english ?? '';

  const bodySentences = mockProcess(articleText);

  return {
    sentences: bodySentences,
    titleSentence,
    titleEnglish,
    processedAt: new Date().toISOString(),
    articleId,
  };
}
