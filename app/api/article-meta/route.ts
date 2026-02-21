import { NextRequest, NextResponse } from 'next/server';
import { fetchNews } from '@/lib/news';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // fetchNews is cached by Next.js — does not re-fetch the RSS feed
  const articles = await fetchNews();
  const article = articles.find((a) => a.article_id === id);

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  return NextResponse.json(article);
}
