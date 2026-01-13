// =====================================
// backend/src/errors.ts
// カスタムエラークラス定義ファイル
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: なし
// 説明: アプリケーションで使用するカスタムエラークラスを定義します。
// =====================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any, errors?: string[]) {
    super(400, 'VALIDATION_ERROR', message, { field, value, errors });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '認証に失敗しました') {
    super(401, 'AUTHENTICATION_ERROR', message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'アクセス権限がありません') {
    super(403, 'AUTHORIZATION_ERROR', message);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, resource?: string, id?: string) {
    super(404, 'NOT_FOUND', message, { resource, id });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, 'CONFLICT', message, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(500, 'DATABASE_ERROR', message, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(statusCode, 'EXTERNAL_SERVICE_ERROR', message);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
