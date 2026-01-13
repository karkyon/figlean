// =====================================
// backend/src/utils/crypto.ts
// 暗号化・JWT・パスワードユーティリティ - FIGLEAN版
// 作成日時: 2026年1月10日 17:40
// 依存関係: bcrypt, jsonwebtoken
// 説明: パスワードハッシュ、JWT生成/検証、セキュリティ機能
// =====================================

import bcrypt from 'bcrypt';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { JWTPayload, Plan, PasswordValidationResult } from '../types/auth';

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue || '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const PASSWORD_CONFIG = {
  saltRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
  minLength: 8,
  maxLength: 128
} as const;

const JWT_CONFIG = {
  secret: getEnvVar('JWT_SECRET'),
  expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  algorithm: 'HS256' as const,
  issuer: 'figlean',
  audience: 'figlean-users'
};

export const validateJWTConfig = (): boolean => {
  try {
    if (!JWT_CONFIG.secret || JWT_CONFIG.secret.length < 32) {
      console.error('❌ JWT_SECRET must be at least 32 characters');
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ JWT configuration is invalid:', error);
    return false;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  if (!password || password.length < PASSWORD_CONFIG.minLength) {
    throw new Error(`Password must be at least ${PASSWORD_CONFIG.minLength} characters`);
  }
  if (password.length > PASSWORD_CONFIG.maxLength) {
    throw new Error(`Password must be less than ${PASSWORD_CONFIG.maxLength} characters`);
  }
  return await bcrypt.hash(password, PASSWORD_CONFIG.saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length === 0) {
    errors.push('パスワードは必須です');
    return { isValid: false, errors, score: 0 };
  }

  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`パスワードは${PASSWORD_CONFIG.minLength}文字以上である必要があります`);
  } else {
    score += 20;
  }

  if (password.length > PASSWORD_CONFIG.maxLength) {
    errors.push(`パスワードは${PASSWORD_CONFIG.maxLength}文字以下である必要があります`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('小文字が必要です');
  } else {
    score += 20;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('大文字が必要です');
  } else {
    score += 20;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('数字が必要です');
  } else {
    score += 20;
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
  }

  score = Math.min(Math.max(score, 0), 100);

  return {
    isValid: errors.length === 0,
    errors,
    score
  };
};

export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  if (!validateJWTConfig()) {
    throw new Error('JWT configuration is invalid');
  }

  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      plan: payload.plan
    },
    JWT_CONFIG.secret,
    {
      expiresIn: JWT_CONFIG.expiresIn,
      algorithm: JWT_CONFIG.algorithm,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      subject: payload.userId
    } as SignOptions
  );
};

export const verifyAccessToken = (token: string): JWTPayload => {
  if (!validateJWTConfig()) {
    throw new Error('JWT configuration is invalid');
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_CONFIG.secret,
      {
        algorithms: [JWT_CONFIG.algorithm],
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience
      } as VerifyOptions
    ) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('無効なアクセストークンです');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('アクセストークンの有効期限が切れています');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('アクセストークンはまだ有効ではありません');
    }
    throw new Error('トークン検証エラー');
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const generateRandomString = (length: number = 32): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const getJWTConfig = () => JWT_CONFIG;
export const getPasswordConfig = () => PASSWORD_CONFIG;
export type { Plan };