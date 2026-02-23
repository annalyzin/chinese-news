import type { Token } from '@/lib/types';

interface RubyTextProps {
  tokens: Token[];
}

// Only wrap tokens in <ruby> if they contain actual Chinese characters.
// English words, numbers, and symbols get a plain <span> regardless of
// whether the AI returned a pinyin value for them.
const hasChinese = (text: string) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);

export function RubyText({ tokens }: RubyTextProps) {
  return (
    <span>
      {tokens.map((token, i) =>
        token.pinyin && hasChinese(token.text) ? (
          <ruby key={i}>
            {token.text}
            <rt>{token.pinyin}</rt>
          </ruby>
        ) : (
          <span key={i}>{token.text}</span>
        )
      )}
    </span>
  );
}
