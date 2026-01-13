// =====================================
// backend/src/controllers/authController.ts
// 認証コントローラー - FIGLEAN版
// 作成日時: 2026年1月10日 23:36
// 更新日時: 2026年1月10日 23:36
// 依存関係: express, services/authService, types/auth, utils/response, errors, utils/logger
// 説明: 認証関連APIエンドポイント実装、バリデーション、エラーハンドリング
// =====================================

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