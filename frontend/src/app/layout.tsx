/**
 * FIGLEAN Frontend - ルートレイアウト
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const { refreshUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // ★重要: ログインページでは refreshUser を呼ばない
    if (pathname === '/login' || pathname === '/register') {
      return;
    }

    // ★修正: 認証済みの場合のみ refreshUser を呼ぶ
    if (isAuthenticated) {
      refreshUser().catch(() => {
        // エラーは無視（authStore内で処理済み）
      });
    }
  }, [pathname, isAuthenticated]);

  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}