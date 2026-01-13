// =====================================
// backend/src/services/authService.ts
// 認証サービス - FIGLEAN版
// 作成日時: 2026年1月10日 23:36
// 更新日時: 2026年1月10日 23:36
// 依存関係: lib/prisma, utils/crypto, utils/encryption, errors, types/auth, @prisma/client
// 説明: ユーザー登録、ログイン、ユーザー情報取得、Figmaトークン管理
// =====================================

import { PrismaClient, UserRole } from '@prisma/client';
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
  
  // usernameをemailから生成
  const username = data.email.split('@')[0];
  
  const user = await prisma.user.create({
    data: {
      username,
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name.trim(),
      role: UserRole.ADMIN,
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
