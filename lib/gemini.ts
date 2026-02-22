import type { ProcessedArticle, ProcessedSentence, Token } from './types';

// ── Mock implementation ─────────────────────────────────────────────
// Returns placeholder tokens (one per character) with "pinyin" as null
// and "[mock translation]" as English. Replace with real API later.

// Characters that should get null pinyin (punctuation, symbols, whitespace)
const PUNCT =
  '\u3000-\u303F' + // CJK symbols & punctuation (，。、；：！？【】…)
  '\uFF00-\uFFEF' + // fullwidth forms (！？，．)
  '\u2000-\u206F' + // general punctuation (" " ' ' — –)
  '\\s' +           // whitespace
  '\\x21-\\x2F' +   // ASCII punctuation ! " # $ % & ' ( ) * + , - . /
  '\\x3A-\\x40' +   // : ; < = > ? @
  '\\x5B-\\x60' +   // [ \ ] ^ _ `
  '\\x7B-\\x7E';    // { | } ~
const PUNCT_RE = new RegExp(`[${PUNCT}]`);

function mockTokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const char of text) {
    if (PUNCT_RE.test(char)) {
      tokens.push({ text: char, pinyin: null });
    } else {
      tokens.push({ text: char, pinyin: 'mock' });
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
