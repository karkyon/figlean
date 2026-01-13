// =====================================
// backend/src/types/auth.ts
// 認証およびユーザー管理に関連する型定義
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: express
// 説明: このファイルには、認証およびユーザー管理に関連する型定義
// =====================================

import { Request } from 'express';

export type Plan = 'FREE' | 'PRO' | 'TEAM';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  plan: Plan;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  sub?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  plan: Plan;
  hasFigmaToken: boolean;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  id: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
    name: string;
    plan: Plan;
    createdAt: Date;
  };
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    plan: Plan;
    hasFigmaToken: boolean;
  };
  token: string;
  expiresIn: string | number;
}

export interface UserInfoResponse {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  hasFigmaToken: boolean;
  createdAt: Date;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SaveFigmaTokenRequest {
  token: string;
}

export interface TokenPair {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string | number;
}

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number;
}

export interface AuthMiddlewareOptions {
  optional?: boolean;
  allowInactive?: boolean;
  requiredPlan?: Plan;
}

export interface PlanCheckResult {
  hasAccess: boolean;
  reason?: string;
  requiredPlan?: Plan;
  userPlan?: Plan;
}
