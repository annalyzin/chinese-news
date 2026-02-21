import { createHash } from 'crypto';

export function hashArticleUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}
