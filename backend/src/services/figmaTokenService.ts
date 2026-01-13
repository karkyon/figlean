// =====================================
// backend/src/services/figmaTokenService.ts
// Figmaトークン管理サービス - FIGLEAN Phase 6
// 作成日時: 2026年1月11日
// 依存関係: lib/prisma, utils/encryption, errors
// 説明: Figmaトークンの暗号化保存、有効性確認、状態管理
// =====================================

import { PrismaClient } from '@prisma/client';
import {
  encryptFigmaToken,
  decryptFigmaToken,
  isValidFigmaToken
} from '../utils/encryption';
import { ValidationError, NotFoundError } from '../errors';
import logger from '../utils/logger';
import { config } from '../config/env';

const prisma = new PrismaClient();

// =====================================
// 型定義
// =====================================

export interface SaveFigmaTokenRequest {
  token: string;
}

export interface FigmaTokenStatusResponse {
  hasToken: boolean;
  isValid: boolean | null;
  lastVerifiedAt: Date | null;
  figmaUserId: string | null;
}

interface FigmaTokenValidationResult {
  isValid: boolean;
  figmaUserId?: string;
  figmaUserName?: string;
  error?: string;
}

// =====================================
// Figmaトークン管理
// =====================================

export async function saveFigmaToken(
  userId: string,
  token: string
): Promise<void> {
  logger.info('Figmaトークン保存開始', { userId });

  if (!isValidFigmaToken(token)) {
    logger.warn('無効なFigmaトークン形式', { userId });
    throw new ValidationError(
      'Figmaトークンの形式が正しくありません。Personal Access Tokenを使用してください。',
      'figmaToken'
    );
  }

  try {
    const encryptedToken = encryptFigmaToken(token);
    await prisma.user.update({
      where: { id: userId },
      data: {
        figmaAccessToken: encryptedToken,
        updatedAt: new Date()
      }
    });
    logger.info('Figmaトークン保存成功', { userId });
  } catch (error) {
    logger.error('Figmaトークン保存エラー', { userId, error });
    throw error;
  }
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
    logger.error('Figmaトークン復号化エラー。トークンをクリアします。', { userId, error });
    
    // 破損したトークンを自動削除
    await prisma.user.update({
      where: { id: userId },
      data: { 
        figmaAccessToken: null, 
        figmaUserId: null 
      }
    });
    
    return null;
  }
}

export async function deleteFigmaToken(userId: string): Promise<void> {
  logger.info('Figmaトークン削除', { userId });

  await prisma.user.update({
    where: { id: userId },
    data: {
      figmaAccessToken: null,
      figmaUserId: null,
      updatedAt: new Date()
    }
  });

  logger.info('Figmaトークン削除成功', { userId });
}

// =====================================
// Figmaトークン検証
// =====================================

async function validateTokenWithFigmaAPI(
  token: string
): Promise<FigmaTokenValidationResult> {
  try {
    const response = await fetch(`${config.figmaApiBaseUrl}/me`, {
      method: 'GET',
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      logger.warn('Figmaトークン検証失敗', {
        status: response.status,
        statusText: response.statusText
      });

      return {
        isValid: false,
        error: `Figma API error: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json() as any;

    return {
      isValid: true,
      figmaUserId: data.id,
      figmaUserName: data.handle || data.email
    };
  } catch (error) {
    logger.error('Figmaトークン検証エラー', { error });
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getFigmaTokenStatus(
  userId: string
): Promise<FigmaTokenStatusResponse> {
  logger.info('Figmaトークン状態確認', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      figmaAccessToken: true,
      figmaUserId: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new NotFoundError('ユーザーが見つかりません');
  }

  if (!user.figmaAccessToken) {
    return {
      hasToken: false,
      isValid: null,
      lastVerifiedAt: null,
      figmaUserId: null
    };
  }

  return {
    hasToken: true,
    isValid: null,
    lastVerifiedAt: user.updatedAt,
    figmaUserId: user.figmaUserId
  };
}

export async function verifyFigmaToken(
  userId: string
): Promise<FigmaTokenValidationResult> {
  logger.info('Figmaトークン検証開始', { userId });

  const token = await getFigmaToken(userId);

  if (!token) {
    logger.warn('検証対象のトークンが見つかりません', { userId });
    return {
      isValid: false,
      error: 'トークンが登録されていません'
    };
  }

  const validationResult = await validateTokenWithFigmaAPI(token);

  if (validationResult.isValid && validationResult.figmaUserId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        figmaUserId: validationResult.figmaUserId,
        updatedAt: new Date()
      }
    });

    logger.info('Figmaトークン検証成功', {
      userId,
      figmaUserId: validationResult.figmaUserId
    });
  } else {
    logger.warn('Figmaトークン検証失敗', {
      userId,
      error: validationResult.error
    });
  }

  return validationResult;
}

export default {
  saveFigmaToken,
  getFigmaToken,
  deleteFigmaToken,
  getFigmaTokenStatus,
  verifyFigmaToken
};