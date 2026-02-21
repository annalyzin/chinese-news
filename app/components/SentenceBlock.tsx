import type { ProcessedSentence } from '@/lib/types';
import { RubyText } from './RubyText';

interface SentenceBlockProps {
  sentence: ProcessedSentence;
}

export function SentenceBlock({ sentence }: SentenceBlockProps) {
  return (
    <div className="mb-8 pb-6 border-b border-gray-100 last:border-0">
      {/* Chinese text with pinyin above */}
      <p className="chinese-sentence font-noto text-gray-900 mb-2">
        <RubyText tokens={sentence.tokens} />
      </p>
      {/* English translation below, muted */}
      <p className="text-sm text-gray-500 leading-relaxed italic pl-0.5">
        {sentence.english}
      </p>
    </div>
  );
}
