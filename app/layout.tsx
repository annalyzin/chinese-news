import type { Metadata } from 'next';
import { Noto_Sans_SC, Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansSC = Noto_Sans_SC({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sc',
  preload: false, // Avoid preloading large CJK font subset
});

export const metadata: Metadata = {
  title: '中文新闻 — Chinese News Reader',
  description:
    'Read Chinese news with 汉语拼音 annotations and English translations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${notoSansSC.variable}`}>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen font-sans">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-red-600 font-bold text-xl font-noto leading-none">
                今日中文
              </span>
              <span className="text-gray-300 text-sm hidden sm:block group-hover:text-gray-500 transition-colors">
                Daily Chinese News
              </span>
            </Link>
          </div>
        </nav>

        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>

        <footer className="border-t border-gray-100 py-8 mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400 space-y-1">
            <p>Pinyin &amp; translations powered by Groq</p>
            <p>For Chinese language learning purposes</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
