#!/bin/bash

cd ~/projects/figlean/backend/src

# ============================================
# 1. response.ts に sendCreated を追加
# ============================================
if ! grep -q "export const sendCreated" utils/response.ts; then
  # sendSuccess の後に sendCreated を追加
  sed -i '/export const sendSuccess/a\
\
/**\
 * 201 Created レスポンス\
 */\
export const sendCreated = (\
  res: Response,\
  data: any,\
  message: string = "リソースが正常に作成されました",\
  requestId?: string\
): void => {\
  sendResponse(res, true, data, message, 201, requestId);\
};' utils/response.ts
fi

# ============================================
# 2. authService.ts の修正
# ============================================
cat > services/authService.ts << 'EOFSERVICE'
import { PrismaClient, User } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  validatePasswordStrength
} from '../utils/crypto';
import {
  encryptFigmaToken,
  decryptFigmaToken,
  isValidFigmaToken
} from '../utils/encryption';
import { ValidationError, AuthenticationError, ConflictError, NotFoundError } from '../errors';
import logger from '../utils/logger';
import type {
  LoginResponse,
  SignupRequest,
  SignupResponse,
  LoginRequest,
  UserInfoResponse,
  Plan
} from '../types/auth';

const prisma = new PrismaClient();

async function validateSignupData(data: SignupRequest): Promise<void> {
  const errors: string[] = [];
  if (!data.email || data.email.trim().length === 0) {
    errors.push('メールアドレスは必須です');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('有効なメールアドレスを入力してください');
  }
  if (!data.password || data.password.length === 0) {
    errors.push('パスワードは必須です');
  }
  if (!data.name || data.name.trim().length === 0) {
    errors.push('名前は必須です');
  } else if (data.name.length > 100) {
    errors.push('名前は100文字以内で入力してください');
  }
  if (errors.length > 0) {
    throw new ValidationError('バリデーションエラー', 'signup', undefined, errors);
  }
}

function validateLoginData(data: LoginRequest): void {
  const errors: string[] = [];
  if (!data.email || data.email.trim().length === 0) {
    errors.push('メールアドレスは必須です');
  }
  if (!data.password || data.password.length === 0) {
    errors.push('パスワードは必須です');
  }
  if (errors.length > 0) {
    throw new ValidationError('バリデーションエラー', 'login', undefined, errors);
  }
}

async function checkUserExists(email: string): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  if (existingUser) {
    throw new ConflictError('このメールアドレスは既に登録されています');
  }
}

export async function signup(data: SignupRequest): Promise<SignupResponse> {
  logger.info('ユーザー登録開始', { email: data.email });
  
  await validateSignupData(data);
  
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.isValid) {
    throw new ValidationError('パスワードが要件を満たしていません', 'password', undefined, passwordValidation.errors);
  }
  
  await checkUserExists(data.email);
  
  const passwordHash = await hashPassword(data.password);
  
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name.trim(),
      role: 'USER',
      isActive: true
    }
  });
  
  logger.info('ユーザー登録成功', { userId: user.id, email: user.email });
  
  const plan: Plan = 'FREE';
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name || '',
    plan
  });
  
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || '',
      plan,
      createdAt: user.createdAt
    },
    token: accessToken
  };
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  logger.info('ログイン試行', { email: credentials.email });
  
  validateLoginData(credentials);
  
  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase() }
  });
  
  if (!user) {
    logger.warn('ログイン失敗: ユーザーが存在しません', { email: credentials.email });
    throw new AuthenticationError('メールアドレスまたはパスワードが正しくありません');
  }
  
  if (!user.isActive) {
    logger.warn('ログイン失敗: アカウントが無効化されています', { userId: user.id });
    throw new AuthenticationError('このアカウントは無効化されています');
  }
  
  const isPasswordValid = await verifyPassword(credentials.password, user.passwordHash);
  
  if (!isPasswordValid) {
    logger.warn('ログイン失敗: パスワードが一致しません', { email: credentials.email });
    throw new AuthenticationError('メールアドレスまたはパスワードが正しくありません');
  }
  
  logger.info('ログイン成功', { userId: user.id, email: user.email });
  
  const plan: Plan = 'FREE';
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name || '',
    plan
  });
  
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  
  const hasFigmaToken = !!user.figmaAccessToken;
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || '',
      plan,
      hasFigmaToken
    },
    token: accessToken,
    expiresIn: '24h'
  };
}

export async function getMe(userId: string): Promise<UserInfoResponse> {
  logger.info('ユーザー情報取得', { userId });
  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new NotFoundError('ユーザーが見つかりません');
  }
  
  const hasFigmaToken = !!user.figmaAccessToken;
  const plan: Plan = 'FREE';
  
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    plan,
    hasFigmaToken,
    createdAt: user.createdAt
  };
}

export async function saveFigmaToken(userId: string, token: string): Promise<void> {
  logger.info('Figmaトークン保存開始', { userId });
  
  if (!isValidFigmaToken(token)) {
    throw new ValidationError('無効なFigmaトークンです', 'figmaToken');
  }
  
  const encryptedToken = encryptFigmaToken(token);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      figmaAccessToken: encryptedToken,
      updatedAt: new Date()
    }
  });
  
  logger.info('Figmaトークン保存成功', { userId });
}

export async function getFigmaToken(userId: string): Promise<string | null> {
  logger.info('Figmaトークン取得', { userId });
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { figmaAccessToken: true }
  });
  
  if (!user || !user.figmaAccessToken) {
    logger.info('Figmaトークンが見つかりません', { userId });
    return null;
  }
  
  try {
    const decryptedToken = decryptFigmaToken(user.figmaAccessToken);
    logger.info('Figmaトークン取得成功', { userId });
    return decryptedToken;
  } catch (error) {
    logger.error('Figmaトークン復号化エラー', { userId, error });
    throw new Error('Figmaトークンの復号化に失敗しました');
  }
}

export async function deleteFigmaToken(userId: string): Promise<void> {
  logger.info('Figmaトークン削除', { userId });
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      figmaAccessToken: null,
      updatedAt: new Date()
    }
  });
  
  logger.info('Figmaトークン削除成功', { userId });
}

export default {
  signup,
  login,
  getMe,
  saveFigmaToken,
  getFigmaToken,
  deleteFigmaToken
};
EOFSERVICE

# ============================================
# 3. authController.ts の修正
# ============================================
cat > controllers/authController.ts << 'EOFCONTROLLER'
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../errors';
import logger from '../utils/logger';
import type {
  AuthenticatedRequest,
  SignupRequest,
  LoginRequest,
  SaveFigmaTokenRequest
} from '../types/auth';

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signupData: SignupRequest = req.body;
    logger.info('サインアップリクエスト受信', { email: signupData.email, requestId: req.id });
    const result = await authService.signup(signupData);
    logger.info('サインアップ成功', { userId: result.user.id, email: result.user.email, requestId: req.id });
    sendCreated(res, result, 'ユーザー登録が完了しました', req.id);
  } catch (error) {
    logger.error('サインアップエラー', { error, requestId: req.id });
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loginData: LoginRequest = req.body;
    logger.info('ログインリクエスト受信', { email: loginData.email, requestId: req.id });
    const result = await authService.login(loginData);
    logger.info('ログイン成功', { userId: result.user.id, email: result.user.email, requestId: req.id });
    sendSuccess(res, result, 'ログインに成功しました', 200, req.id);
  } catch (error) {
    logger.error('ログインエラー', { error, requestId: req.id });
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
    }
    logger.info('ユーザー情報取得リクエスト', { userId: authReq.user.userId, requestId: req.id });
    const userInfo = await authService.getMe(authReq.user.userId);
    sendSuccess(res, userInfo, 'ユーザー情報を取得しました', 200, req.id);
  } catch (error) {
    logger.error('ユーザー情報取得エラー', { error, requestId: req.id });
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
    }
    logger.info('ログアウトリクエスト', { userId: authReq.user.userId, requestId: req.id });
    logger.info('ログアウト成功', { userId: authReq.user.userId, requestId: req.id });
    sendSuccess(res, { message: 'ログアウトしました' }, 'ログアウトに成功しました', 200, req.id);
  } catch (error) {
    logger.error('ログアウトエラー', { error, requestId: req.id });
    next(error);
  }
}

export async function saveFigmaToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
    }
    const { token }: SaveFigmaTokenRequest = req.body;
    logger.info('Figmaトークン保存リクエスト', { userId: authReq.user.userId, requestId: req.id });
    await authService.saveFigmaToken(authReq.user.userId, token);
    logger.info('Figmaトークン保存成功', { userId: authReq.user.userId, requestId: req.id });
    sendSuccess(res, { message: 'Figmaトークンを保存しました' }, 'Figmaアカウントの接続に成功しました', 200, req.id);
  } catch (error) {
    logger.error('Figmaトークン保存エラー', { error, requestId: req.id });
    next(error);
  }
}

export async function deleteFigmaToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
    }
    logger.info('Figmaトークン削除リクエスト', { userId: authReq.user.userId, requestId: req.id });
    await authService.deleteFigmaToken(authReq.user.userId);
    logger.info('Figmaトークン削除成功', { userId: authReq.user.userId, requestId: req.id });
    sendSuccess(res, { message: 'Figmaトークンを削除しました' }, 'Figmaアカウントの接続を解除しました', 200, req.id);
  } catch (error) {
    logger.error('Figmaトークン削除エラー', { error, requestId: req.id });
    next(error);
  }
}

export default {
  signup,
  login,
  getMe,
  logout,
  saveFigmaToken,
  deleteFigmaToken
};
EOFCONTROLLER

echo "✅ 修正完了"
