// =====================================
// backend/src/middlewares/errorHandler.ts
// エラーハンドラーミドルウェア
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: express, ../errors, ../utils/response, ../utils/logger
// 説明: Expressアプリケーションのエラーハンドリングを行うミドルウェア。
// =====================================

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('エラーハンドラー実行', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    url: req.url,
    method: req.method
  });

  if (err instanceof AppError) {
    sendError(
      res,
      err.code,
      err.message,
      err.statusCode,
      err.details,
      req.id
    );
    return;
  }

  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    '内部サーバーエラーが発生しました',
    500,
    undefined,
    req.id
  );
};