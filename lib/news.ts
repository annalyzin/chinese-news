import Parser from 'rss-parser';
import type { NewsArticle } from './types';

// 8world (Mediacorp) Singapore local news — category 176 = 新加坡
const FEED_URL =
  'https://www.8world.com/api/v1/rss-outbound-feed?_format=xml&category=176';

type EightworldItem = {
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  pubDate?: string;
  categories?: string[];
  // media:thumbnail has a url attribute parsed as $
  'media:thumbnail'?: { $?: { url?: string } };
};

const parser = new Parser<Record<string, unknown>, EightworldItem>({
  customFields: {
    item: [['media:thumbnail', 'media:thumbnail']],
  },
});

export async function fetchNews(): Promise<NewsArticle[]> {
  const feed = await parser.parseURL(FEED_URL);

  return feed.items
    .filter((item) => item.title && item.link)
    .map((item): NewsArticle => {
      const imageUrl = item['media:thumbnail']?.$?.url ?? null;
      const id = item.guid ?? item.link ?? item.title ?? '';

      return {
        article_id: id,
        title: item.title ?? '',
        link: item.link ?? '',
        description: item.contentSnippet ?? null,
        pubDate: item.pubDate ?? new Date().toISOString(),
        image_url: imageUrl,
        category: item.categories ?? ['新加坡'],
      };
    });
}
