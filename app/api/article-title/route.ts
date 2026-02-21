import { NextRequest, NextResponse } from 'next/server';
import { getCachedArticle } from '@/lib/article-cache';

// Returns the cached English title for an article, or null if not yet processed.
// Used by ArticleCard on the home page for lazy-loaded English titles.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ titleEnglish: null });

  const cached = await getCachedArticle(url);
  return NextResponse.json({ titleEnglish: cached?.titleEnglish ?? null });
}
