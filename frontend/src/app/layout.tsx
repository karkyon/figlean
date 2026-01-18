/**
 * FIGLEAN Frontend - ルートレイアウト
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthInitializer } from '@/components/auth/AuthInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FIGLEAN - Figma Design Quality Analyzer',
  description: 'Analyze your Figma designs for HTML generation quality',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* ★追加: 認証状態の初期化 */}
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}