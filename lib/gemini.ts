import type { ProcessedArticle, ProcessedSentence, Token } from './types';

// ── Toggle: uncomment the next line to force mock mode ──
// const FORCE_MOCK = true;
const FORCE_MOCK = false;

const useGemini = !FORCE_MOCK && !!process.env.GOOGLE_API_KEY;

export const MOCK_TRANSLATION = '[mock translation]';

/** Returns true if the cached article should be re-processed (mock data + Gemini available). */
export function shouldReprocess(cached: ProcessedArticle | null): boolean {
  if (!cached?.titleEnglish) return true;
  return cached.titleEnglish === MOCK_TRANSLATION && useGemini;
}

// ── Gemini implementation ───────────────────────────────────────────

function buildArticlePrompt(title: string, body: string): string {
  return `You are a Chinese language teaching assistant. Analyze the following Chinese news article and return a JSON object.

INSTRUCTIONS:
- The first line (TITLE) is the article headline. Process it as a single sentence.
- The remaining text (BODY) is the article content. Split it into individual sentences (split on 。！？ punctuation).
- For each sentence (title and body), produce a list of word-level tokens.
- Each token has:
  - "text": the Chinese word or punctuation mark.
  - "pinyin": the pinyin with tone marks for Chinese words (e.g. "Xí Jìn Píng"), or null for punctuation marks and non-Chinese text (numbers, English words, symbols).
- After the tokens, provide an "english" field with a natural English translation of the full sentence.
- Tokenize at the word level (group characters that form a single word together, like 习近平 or 中国).
- Use proper tone marks (ā á ǎ à, ē é ě è, etc.) not tone numbers.
- For non-Chinese tokens (English words, numbers, symbols like $, %), set "pinyin" to null.

Return ONLY valid JSON matching this exact schema, with no extra text:
{
  "titleSentence": {
    "tokens": [
      {"text": "习近平", "pinyin": "Xí Jìn Píng"},
      {"text": "访问", "pinyin": "fǎngwèn"},
      {"text": "中国", "pinyin": "Zhōngguó"}
    ],
    "english": "Xi Jinping visits China"
  },
  "sentences": [
    {
      "tokens": [
        {"text": "中国", "pinyin": "Zhōngguó"},
        {"text": "表示", "pinyin": "biǎoshì"},
        {"text": "。", "pinyin": null}
      ],
      "english": "China stated..."
    }
  ]
}

TITLE:
${title}

BODY:
${body}`;
}

let cachedModel: import('@google/generative-ai').GenerativeModel | null = null;

async function getModel() {
  if (!cachedModel) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    cachedModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return cachedModel;
}

async function geminiProcess(
  articleText: string,
  articleTitle: string,
  articleId: string
): Promise<ProcessedArticle> {
  const model = await getModel();
  const result = await model.generateContent(buildArticlePrompt(articleTitle, articleText));
  const raw = result.response.text();

  const jsonText = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(jsonText) as {
    titleSentence: ProcessedSentence;
    sentences: ProcessedSentence[];
  };

  return {
    sentences: parsed.sentences,
    titleSentence: parsed.titleSentence,
    titleEnglish: parsed.titleSentence?.english ?? '',
    processedAt: new Date().toISOString(),
    articleId,
  };
}

// ── Mock implementation ─────────────────────────────────────────────

const PUNCT =
  '\u3000-\u303F' +
  '\uFF00-\uFFEF' +
  '\u2000-\u206F' +
  '\\s' +
  '\\x21-\\x2F' +
  '\\x3A-\\x40' +
  '\\x5B-\\x60' +
  '\\x7B-\\x7E';
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

function mockProcess(
  articleText: string,
  articleTitle: string,
  articleId: string
): ProcessedArticle {
  const parts = articleText.split(/(?<=[。！？…])/g).filter(Boolean);
  const sentences = parts.length > 0 ? parts : [articleText];

  const bodySentences = sentences.map((s) => ({
    tokens: mockTokenize(s.trim()),
    english: MOCK_TRANSLATION,
  }));

  const titleTokens = mockTokenize(articleTitle);
  const titleSentence: ProcessedSentence = {
    tokens: titleTokens,
    english: MOCK_TRANSLATION,
  };

  return {
    sentences: bodySentences,
    titleSentence,
    titleEnglish: MOCK_TRANSLATION,
    processedAt: new Date().toISOString(),
    articleId,
  };
}

// ── Public API ──────────────────────────────────────────────────────

export async function processArticle(
  articleText: string,
  articleTitle: string,
  articleId: string
): Promise<ProcessedArticle> {
  if (useGemini) {
    return geminiProcess(articleText, articleTitle, articleId);
  }
  return mockProcess(articleText, articleTitle, articleId);
}
