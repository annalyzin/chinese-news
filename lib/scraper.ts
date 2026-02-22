import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export async function scrapeArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    // Strip <style> tags — jsdom's CSS parser chokes on 8world's nested selectors
    const html = (await res.text()).replace(/<style[\s\S]*?<\/style>/gi, '');
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent) return null;

    // Strip 8world UI boilerplate that Readability picks up
    const cleaned = article.textContent
      .replace(/新功能[!！]?\s*/g, '')
      .replace(/New feature[!！]?\s*/gi, '')
      .replace(/听新闻[，,]按这里[!！]?\s*/g, '')
      .replace(/Listen to the news[,，] click here[!！]?\s*/gi, '')
      .replace(/我要听[，,]按这里[!！]?\s*/g, '')
      .replace(/I want to listen[,，] click here[!！]?\s*/gi, '')
      .trim();

    return cleaned || null;
  } catch {
    return null;
  }
}
