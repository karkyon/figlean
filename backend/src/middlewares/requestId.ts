// =====================================
// backend/src/middlewares/requestId.ts
// リクエストID付与ミドルウェア
// 作成日時: 2026年1月10日 13:45
// 更新日時: 2026年1月10日 14:30
// 依存関係: express, crypto
// 説明: 全リクエストに一意のUUID v4を付与し、トレーサビリティを確保
// =====================================

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * リクエストID付与ミドルウェア
 * - req.idに一意のUUIDを付与
 * - X-Request-IDヘッダーに同じ値を設定
 */
export function requestId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}