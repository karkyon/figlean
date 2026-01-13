/**
 * FIGLEAN Frontend - ルートレイアウト
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FIGLEAN - FigmaデザインHTML変換プラットフォーム',
  description: 'Figmaデザインを「実務で使えるHTML/Tailwind」に変換するための 設計診断・品質保証・自動生成プラッ トフォーム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
