// =====================================
// backend/src/utils/response.ts
// レスポンスユーティリティ
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: なし
// 説明: APIレスポンスの標準化とエラーハンドリングを提供するユーティリティ関数群
// =====================================

import { Response } from 'express';

interface ApiResponse {
  success: boolean;
  data?: any;
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const sendResponse = (
  res: Response,
  success: boolean,
  data: any,
  message?: string,
  statusCode: number = 200,
  requestId?: string
): void => {
  const response: ApiResponse = {
    success,
    ...(success ? { data } : { error: { code: data.code || 'ERROR', message: message || data.message } }),
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId
    }
  };
  res.status(statusCode).json(response);
};

export const sendSuccess = (
  res: Response,
  data: any,
  message?: string,
  statusCode: number = 200,
  requestId?: string
): void => {
  sendResponse(res, true, data, message, statusCode, requestId);
};

export const sendCreated = (
  res: Response,
  data: any,
  message: string = 'リソースが正常に作成されました',
  requestId?: string
): void => {
  sendResponse(res, true, data, message, 201, requestId);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any,
  requestId?: string
): void => {
  sendResponse(res, false, { code, message, details }, message, statusCode, requestId);
};

export const sendValidationError = (
  res: Response,
  errors: string[],
  requestId?: string
): void => {
  sendError(res, 'VALIDATION_ERROR', 'バリデーションエラー', 400, { errors }, requestId);
};
