// =====================================
// ファイルパス: backend/src/services/figmaCommentService.ts
// 概要: Figmaコメント投稿サービス - レート制限対策版（最小限の変更）
// 機能説明:
//   - Figmaへのコメント投稿（単一/一括）
//   - レート制限エラー時の自動リトライ（新規追加）
//   - 投稿間隔の最適化（500ms → 1000ms）
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - レート制限対策強化、投稿間隔延長
// 依存関係:
//   - @prisma/client
//   - ../services/figmaTokenService
//   - ../config/env
//   - ../errors
//   - ../utils/logger
// =====================================

import { PrismaClient, RuleViolation, Severity } from '@prisma/client';
import * as figmaTokenService from './figmaTokenService';
import { config } from '../config/env';
import { 
  NotFoundError, 
  ExternalServiceError, 
  ValidationError 
} from '../errors';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// =====================================
// 型定義
// =====================================

/**
 * Figmaコメント投稿リクエスト
 */
export interface FigmaCommentRequest {
  message: string;
  client_meta: {
    node_id: string;
    node_offset: {
      x: number;
      y: number;
    };
  };
}

/**
 * Figmaコメント投稿レスポンス
 */
export interface FigmaCommentResponse {
  id: string;
  file_key: string;
  parent_id: string;
  user: {
    id: string;
    handle: string;
    img_url: string;
  };
  created_at: string;
  resolved_at: string | null;
  message: string;
  client_meta: {
    node_id?: string[];
    node_offset?: {
      x: number;
      y: number;
    };
  };
  order_id: string;
}

/**
 * コメント投稿結果
 */
export interface CommentPostResult {
  success: boolean;
  commentId?: string;
  violationId: string;
  error?: string;
}

/**
 * 一括投稿結果
 */
export interface BulkCommentPostResult {
  totalViolations: number;
  successCount: number;
  failureCount: number;
  results: CommentPostResult[];
}

/**
 * コメントメッセージ生成オプション
 */
export interface CommentMessageOptions {
  includeFixSteps?: boolean;
  includeDetectedValue?: boolean;
  language?: 'ja' | 'en';
}

// =====================================
// 絵文字アイコン定義
// =====================================

const SEVERITY_ICONS = {
  CRITICAL: '⚠️',
  MAJOR: '🟡',
  MINOR: 'ℹ️'
} as const;

const CATEGORY_ICONS = {
  LAYOUT: '📐',
  COMPONENT: '🧩',
  RESPONSIVE: '📱',
  SEMANTIC: '🏷️',
  CONSTRAINT: '📏',
  STRUCTURE: '🏗️'
} as const;

// =====================================
// コメントメッセージ生成
// =====================================

/**
 * ルール違反からコメントメッセージを生成
 * 
 * @param violation - ルール違反データ
 * @param options - メッセージ生成オプション
 * @returns コメントメッセージ
 */
export function generateCommentMessage(
  violation: RuleViolation,
  options: CommentMessageOptions = {}
): string {
  const {
    includeFixSteps = true,
    includeDetectedValue = true,
    language: _language = 'ja'
  } = options;

  const severityIcon = SEVERITY_ICONS[violation.severity];
  const categoryIcon = CATEGORY_ICONS[violation.ruleCategory];

  // ヘッダー部分
  let message = `${severityIcon} **${violation.severity}** ${categoryIcon} ${violation.ruleCategory}\n\n`;
  // ルール名
  message += `**${violation.ruleName}**\n\n`;
  // 説明
  message += `${violation.description}\n\n`;
  // 影響
  if (violation.impact) {
    message += `**影響:**\n${violation.impact}\n\n`;
  }
  // 検出値
  if (includeDetectedValue && violation.detectedValue) {
    message += `**検出値:**\n${violation.detectedValue}\n\n`;
  }
  
  // 期待値
  if (includeDetectedValue && violation.expectedValue) {
    message += `**期待値:**\n${violation.expectedValue}\n\n`;
  }
  
  // 修正提案
  if (violation.suggestion) {
    message += `**修正提案:**\n${violation.suggestion}\n\n`;
  }
  
  // 修正手順
  if (includeFixSteps && violation.fixSteps) {
    message += `**修正手順:**\n`;
    const steps = violation.fixSteps as any;
    
    if (Array.isArray(steps)) {
      steps.forEach((step, index) => {
        message += `${index + 1}. ${step}\n`;
      });
    } else if (typeof steps === 'object' && steps.steps) {
      (steps.steps as string[]).forEach((step, index) => {
        message += `${index + 1}. ${step}\n`;
      });
    }
    message += '\n';
  }
  
  // フッター
  message += `---\n`;
  message += `🔍 **FIGLEAN診断** - Figmaデザイン品質チェック\n`;
  message += `Rule ID: \`${violation.ruleId}\``;

  return message;
}

// =====================================
// Figma Comment API連携
// =====================================

/**
 * Figma Comment APIヘッダーを生成
 * 
 * @param token - Figmaアクセストークン
 * @returns リクエストヘッダー
 */
function createFigmaCommentHeaders(token: string): Record<string, string> {
  return {
    'X-Figma-Token': token,
    'Content-Type': 'application/json'
  };
}

/**
 * Figma Comment API エラーハンドリング
 * 
 * @param response - Fetchレスポンス
 * @param context - エラーコンテキスト
 * @throws ExternalServiceError
 */
async function handleFigmaCommentApiError(
  response: Response,
  context: string
): Promise<never> {
  let errorMessage = `Figma Comment API error: ${response.status} ${response.statusText}`;
  
  try {
    const errorData = await response.json() as any;
    if (errorData.err || errorData.message) {
      errorMessage = errorData.err || errorData.message;
    }
  } catch {
    // JSONパースエラーは無視
  }

  logger.error(`Figma Comment API エラー: ${context}`, {
    status: response.status,
    statusText: response.statusText,
    errorMessage
  });

  throw new ExternalServiceError(
    `Figma Comment API エラー: ${errorMessage}`,
    response.status
  );
}

// =====================================
// 🆕 リトライ機能付きコメント投稿
// =====================================

/**
 * Figmaにコメントを投稿（リトライ機能付き）
 * 
 * @param userId - FIGLEANユーザーID
 * @param fileKey - FigmaファイルKey
 * @param nodeId - ノードID
 * @param message - コメントメッセージ
 * @param maxRetries - 最大リトライ回数（デフォルト3回）
 * @returns コメントID
 */
async function postCommentToFigmaWithRetry(
  userId: string,
  fileKey: string,
  nodeId: string,
  message: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info('Figmaコメント投稿リトライ', { 
          userId, 
          fileKey, 
          nodeId, 
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
      } else {
        logger.info('Figmaコメント投稿開始', { userId, fileKey, nodeId });
      }

      // トークン取得
      const token = await figmaTokenService.getFigmaToken(userId);
      
      if (!token) {
        throw new NotFoundError('Figmaトークンが登録されていません');
      }

      // リクエストボディ作成
      const requestBody: FigmaCommentRequest = {
        message,
        client_meta: {
          node_id: nodeId,
          node_offset: { x: 0, y: 0 }
        }
      };

      // Figma APIリクエスト
      const response = await fetch(
        `${config.figmaApiBaseUrl}/files/${fileKey}/comments`,
        {
          method: 'POST',
          headers: createFigmaCommentHeaders(token),
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        // 429エラー（レート制限）の場合はリトライ
        if (response.status === 429 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
          logger.warn(`Figma APIレート制限エラー - ${waitTime}ms後にリトライ`, {
            userId,
            fileKey,
            nodeId,
            attempt: attempt + 1,
            waitTime
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // リトライ
        }
        
        // その他のエラーまたは最終試行の場合はthrow
        await handleFigmaCommentApiError(response, 'コメント投稿');
      }

      const data = await response.json() as FigmaCommentResponse;

      logger.info('Figmaコメント投稿成功', { 
        userId, 
        fileKey,
        nodeId,
        commentId: data.id,
        retryCount: attempt
      });

      return data.id;

    } catch (error) {
      lastError = error as Error;
      
      // NotFoundError, ValidationErrorは即座にthrow（リトライ不要）
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      // 最終試行でもエラーの場合
      if (attempt === maxRetries) {
        break;
      }
    }
  }

  // すべてのリトライが失敗
  logger.error('Figmaコメント投稿エラー（全リトライ失敗）', { 
    userId, 
    fileKey, 
    nodeId, 
    error: lastError 
  });
  throw lastError || new ExternalServiceError('Figmaコメント投稿に失敗しました');
}

// =====================================
// 既存のpostCommentToFigma（互換性のため維持）
// =====================================

export async function postCommentToFigma(
  userId: string,
  fileKey: string,
  nodeId: string,
  message: string
): Promise<string> {
  // 内部的にはリトライ機能付きを呼び出す
  return postCommentToFigmaWithRetry(userId, fileKey, nodeId, message, 3);
}

/**
 * Figmaからコメントを削除
 * 
 * @param userId - FIGLEANユーザーID
 * @param fileKey - FigmaファイルKey
 * @param commentId - コメントID
 * @throws NotFoundError - トークンが見つからない
 * @throws ExternalServiceError - Figma APIエラー
 */
export async function deleteCommentFromFigma(
  userId: string,
  fileKey: string,
  commentId: string
): Promise<void> {
  logger.info('Figmaコメント削除開始', { userId, fileKey, commentId });

  const token = await figmaTokenService.getFigmaToken(userId);
  
  if (!token) {
    throw new NotFoundError('Figmaトークンが登録されていません');
  }

  try {
    const response = await fetch(
      `${config.figmaApiBaseUrl}/files/${fileKey}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: createFigmaCommentHeaders(token)
      }
    );

    if (!response.ok) {
      await handleFigmaCommentApiError(response, 'コメント削除');
    }

    logger.info('Figmaコメント削除成功', { 
      userId, 
      fileKey,
      commentId
    });
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Figmaコメント削除エラー', { userId, fileKey, commentId, error });
    throw new ExternalServiceError('Figmaコメント削除に失敗しました');
  }
}

// =====================================
// 単一ルール違反へのコメント投稿
// =====================================

/**
 * 単一のルール違反にコメント投稿
 * 
 * @param userId - FIGLEANユーザーID
 * @param violationId - ルール違反ID
 * @param options - コメント生成オプション
 * @returns コメント投稿結果
 */
export async function postCommentForViolation(
  userId: string,
  violationId: string,
  options: CommentMessageOptions = {}
): Promise<CommentPostResult> {
  logger.info('ルール違反コメント投稿開始', { userId, violationId });

  try {
    // ルール違反を取得
    const violation = await prisma.ruleViolation.findUnique({
      where: { id: violationId },
      include: {
        project: true
      }
    });

    if (!violation) {
      throw new NotFoundError(`ルール違反が見つかりません: ${violationId}`);
    }

    // プロジェクト所有者チェック
    if (violation.project.userId !== userId) {
      throw new ValidationError('このプロジェクトへのアクセス権限がありません');
    }

    // 既にコメント投稿済みかチェック
    if (violation.commentPosted && violation.figmaCommentId) {
      logger.warn('既にコメント投稿済み', { violationId, commentId: violation.figmaCommentId });
      return {
        success: true,
        commentId: violation.figmaCommentId,
        violationId
      };
    }

    // frameIdが必要
    if (!violation.frameId) {
      throw new ValidationError('frameIdが設定されていないためコメントを投稿できません');
    }

    // コメントメッセージ生成
    const message = generateCommentMessage(violation, options);

    // Figmaにコメント投稿
    const commentId = await postCommentToFigma(
      userId,
      violation.project.figmaFileKey,
      violation.frameId,
      message
    );

    // データベース更新
    await prisma.ruleViolation.update({
      where: { id: violationId },
      data: {
        commentPosted: true,
        figmaCommentId: commentId
      }
    });

    logger.info('ルール違反コメント投稿成功', { violationId, commentId });

    return {
      success: true,
      commentId,
      violationId
    };
  } catch (error) {
    logger.error('ルール違反コメント投稿エラー', { userId, violationId, error });

    return {
      success: false,
      violationId,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * プロジェクト内の全ルール違反に一括コメント投稿
 * 
 * @param userId - FIGLEANユーザーID
 * @param projectId - プロジェクトID
 * @param options - コメント生成オプション
 * @returns 一括投稿結果
 * 一括コメント投稿（投稿間隔を500ms→1000msに変更）
 */
export async function postCommentsForProject(
  userId: string,
  projectId: string,
  options: CommentMessageOptions = {}
): Promise<BulkCommentPostResult> {
  logger.info('プロジェクト一括コメント投稿開始', { userId, projectId });

  // プロジェクト所有者チェック
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new NotFoundError(`プロジェクトが見つかりません: ${projectId}`);
  }

  if (project.userId !== userId) {
    throw new ValidationError('このプロジェクトへのアクセス権限がありません');
  }

  // 未投稿のルール違反を取得（frameIdがあるもののみ）
  const violations = await prisma.ruleViolation.findMany({
    where: {
      projectId,
      commentPosted: false,
      frameId: { not: null }
    },
    orderBy: [
      { severity: 'asc' },  // CRITICAL → MAJOR → MINOR
      { createdAt: 'asc' }
    ]
  });

  logger.info('投稿対象ルール違反取得', { 
    userId, 
    projectId, 
    violationCount: violations.length 
  });

  const results: CommentPostResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // 各ルール違反にコメント投稿
  for (const violation of violations) {
    try {
      // コメントメッセージ生成
      const message = generateCommentMessage(violation, options);

      // Figmaにコメント投稿
      const commentId = await postCommentToFigma(
        userId,
        project.figmaFileKey,
        violation.frameId!,
        message
      );

      // データベース更新
      await prisma.ruleViolation.update({
        where: { id: violation.id },
        data: {
          commentPosted: true,
          figmaCommentId: commentId
        }
      });

      results.push({
        success: true,
        commentId,
        violationId: violation.id
      });

      successCount++;

      logger.info('コメント投稿成功', { 
        violationId: violation.id, 
        commentId 
      });

      // 🔧 レート制限対策: 投稿間隔を1秒に延長（500ms → 1000ms）
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logger.error('コメント投稿失敗', { 
        violationId: violation.id, 
        error 
      });

      results.push({
        success: false,
        violationId: violation.id,
        error: error instanceof Error ? error.message : '不明なエラー'
      });

      failureCount++;
    }
  }

  logger.info('プロジェクト一括コメント投稿完了', {
    userId,
    projectId,
    totalViolations: violations.length,
    successCount,
    failureCount
  });

  return {
    totalViolations: violations.length,
    successCount,
    failureCount,
    results
  };
}

/**
 * 特定重要度以上のルール違反に一括コメント投稿
 * 
 * @param userId - FIGLEANユーザーID
 * @param projectId - プロジェクトID
 * @param minSeverity - 最小重要度（CRITICAL, MAJOR, MINOR）
 * @param options - コメント生成オプション
 * @returns 一括投稿結果
 * 重要度別一括投稿（投稿間隔を500ms→1000msに変更）
 */
export async function postCommentsBySeverity(
  userId: string,
  projectId: string,
  minSeverity: Severity,
  options: CommentMessageOptions = {}
): Promise<BulkCommentPostResult> {
  logger.info('重要度別一括コメント投稿開始', { userId, projectId, minSeverity });

  // プロジェクト所有者チェック
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new NotFoundError(`プロジェクトが見つかりません: ${projectId}`);
  }

  if (project.userId !== userId) {
    throw new ValidationError('このプロジェクトへのアクセス権限がありません');
  }

  // 重要度フィルタ設定
  const severityFilter: Severity[] = [];
  
  if (minSeverity === 'CRITICAL') {
    severityFilter.push('CRITICAL');
  } else if (minSeverity === 'MAJOR') {
    severityFilter.push('CRITICAL', 'MAJOR');
  } else {
    severityFilter.push('CRITICAL', 'MAJOR', 'MINOR');
  }

  // 未投稿のルール違反を取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      projectId,
      commentPosted: false,
      frameId: { not: null },
      severity: { in: severityFilter }
    },
    orderBy: [
      { severity: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  logger.info('投稿対象ルール違反取得（重要度フィルタ適用）', { 
    userId, 
    projectId,
    minSeverity,
    violationCount: violations.length 
  });

  const results: CommentPostResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // 各ルール違反にコメント投稿
  for (const violation of violations) {
    try {
      const message = generateCommentMessage(violation, options);

      const commentId = await postCommentToFigma(
        userId,
        project.figmaFileKey,
        violation.frameId!,
        message
      );

      await prisma.ruleViolation.update({
        where: { id: violation.id },
        data: {
          commentPosted: true,
          figmaCommentId: commentId
        }
      });

      results.push({
        success: true,
        commentId,
        violationId: violation.id
      });

      successCount++;

      // 🔧 レート制限対策: 投稿間隔を1秒に延長（500ms → 1000ms）
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logger.error('コメント投稿失敗', { 
        violationId: violation.id, 
        error 
      });

      results.push({
        success: false,
        violationId: violation.id,
        error: error instanceof Error ? error.message : '不明なエラー'
      });

      failureCount++;
    }
  }

  logger.info('重要度別一括コメント投稿完了', {
    userId,
    projectId,
    minSeverity,
    totalViolations: violations.length,
    successCount,
    failureCount
  });

  return {
    totalViolations: violations.length,
    successCount,
    failureCount,
    results
  };
}

/**
 * コメント投稿済みのルール違反をリセット（再診断時）
 * 
 * @param userId - FIGLEANユーザーID
 * @param projectId - プロジェクトID
 * @returns リセットした件数
 */
export async function resetCommentFlags(
  userId: string,
  projectId: string
): Promise<number> {
  logger.info('コメントフラグリセット開始', { userId, projectId });

  // プロジェクト所有者チェック
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new NotFoundError(`プロジェクトが見つかりません: ${projectId}`);
  }

  if (project.userId !== userId) {
    throw new ValidationError('このプロジェクトへのアクセス権限がありません');
  }

  // コメントフラグをリセット
  const result = await prisma.ruleViolation.updateMany({
    where: {
      projectId,
      commentPosted: true
    },
    data: {
      commentPosted: false,
      figmaCommentId: null
    }
  });

  logger.info('コメントフラグリセット完了', { 
    userId, 
    projectId,
    resetCount: result.count 
  });

  return result.count;
}

/**
 * 投稿済みコメント一覧取得
 * 
 * @param userId - FIGLEANユーザーID
 * @param projectId - プロジェクトID
 * @returns 投稿済みルール違反一覧
 */
export async function getPostedComments(
  userId: string,
  projectId: string
): Promise<RuleViolation[]> {
  logger.info('投稿済みコメント取得開始', { userId, projectId });

  // プロジェクト所有者チェック
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new NotFoundError(`プロジェクトが見つかりません: ${projectId}`);
  }

  if (project.userId !== userId) {
    throw new ValidationError('このプロジェクトへのアクセス権限がありません');
  }

  // 投稿済みルール違反を取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      projectId,
      commentPosted: true,
      figmaCommentId: { not: null }
    },
    orderBy: [
      { severity: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  logger.info('投稿済みコメント取得完了', { 
    userId, 
    projectId,
    count: violations.length 
  });

  return violations;
}

// =====================================
// エクスポート
// =====================================

export default {
  generateCommentMessage,
  postCommentToFigma,
  deleteCommentFromFigma,
  postCommentForViolation,
  postCommentsForProject,
  postCommentsBySeverity,
  resetCommentFlags,
  getPostedComments
};