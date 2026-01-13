// =====================================
// backend/src/types/express.d.ts
// ExpressのRequestオブジェクトにカスタムプロパティを追加する型定義ファイル
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: なし
// 説明: このファイルは、ExpressのRequestオブジェクトにカスタムプロパティを追加するための型定義を提供
// =====================================

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        userId: string;
        email: string;
        name: string;
        plan: 'FREE' | 'PRO' | 'TEAM';
        hasFigmaToken: boolean;
        isActive: boolean;
      };
    }
  }
}
export {};
