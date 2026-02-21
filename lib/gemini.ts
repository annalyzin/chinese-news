import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ProcessedArticle, ProcessedSentence } from './types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Split article into chunks of at most MAX_CHARS characters, breaking on sentence boundaries
const MAX_CHARS = 400;

function chunkText(text: string): string[] {
  // Chinese sentence endings: 。！？…
  const sentences = text.split(/(?<=[。！？…])/g).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHARS && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function buildPrompt(chineseText: string): string {
  return `You are a Chinese language teaching assistant. Analyze the following Chinese text and return a JSON object.

INSTRUCTIONS:
- Split the text into individual sentences (split on 。！？ punctuation).
- For each sentence, produce a list of word-level tokens.
- Each token has:
  - "text": the Chinese word or punctuation mark. Convert any traditional Chinese characters to simplified Chinese (e.g. 國→国, 說→说, 來→来).
  - "pinyin": the pinyin with tone marks for Chinese words (e.g. "Xí Jìn Píng"), or null for punctuation marks and non-Chinese text (numbers, English words, symbols).
- After the tokens, provide an "english" field with a natural English translation of the full sentence.
- Tokenize at the word level (group characters that form a single word together, like 习近平 or 中国).
- Use proper tone marks (ā á ǎ à, ē é ě è, etc.) not tone numbers.
- Always use simplified Chinese characters in the "text" field, never traditional.
- For non-Chinese tokens (English words, numbers, symbols like $, %), set "pinyin" to null.

Return ONLY valid JSON matching this exact schema, with no extra text:
{
  "sentences": [
    {
      "tokens": [
        {"text": "习近平", "pinyin": "Xí Jìn Píng"},
        {"text": "，", "pinyin": null},
        {"text": "中国", "pinyin": "Zhōngguó"}
      ],
      "english": "Xi Jinping, China..."
    }
  ]
}

Chinese text to process:
${chineseText}`;
}

async function processChunk(text: string): Promise<ProcessedSentence[]> {
  const result = await model.generateContent(buildPrompt(text));
  const raw = result.response.text();

  // Strip any markdown code fences the model might add
  const jsonText = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(jsonText) as { sentences: ProcessedSentence[] };
  return parsed.sentences;
}

export async function processArticle(
  articleText: string,
  articleTitle: string,
  articleId: string
): Promise<ProcessedArticle> {
  // Process title and body concurrently
  const [titleSentences, ...bodyChunkResults] = await Promise.all([
    processChunk(articleTitle),
    ...chunkText(articleText).map((chunk) => processChunk(chunk)),
  ]);

  const titleSentence = titleSentences[0];
  const titleEnglish = titleSentence?.english ?? '';

  const allSentences: ProcessedSentence[] = bodyChunkResults.flat();

  return {
    sentences: allSentences,
    titleSentence,
    titleEnglish,
    processedAt: new Date().toISOString(),
    articleId,
  };
}
