// =====================================
// ファイルパス: backend/src/services/figmaCommentService.ts
// 概要: Figmaコメント投稿サービス（MVC準拠版）
// 機能説明:
//   - Figmaへのコメント投稿（単一/一括）
//   - レート制限エラー時の自動リトライ
//   - バリデーション、オプション構築、エラー処理の統一管理
//   - 投稿済みコメント管理（取得/削除/リセット）
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - レート制限対策強化、投稿間隔延長
//         2026-01-16 - MVC/三層アーキテクチャ準拠に修正
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
// 定数定義
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

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 2000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2
};

const RATE_LIMIT_CONFIG = {
  BULK_INTERVAL_MS: 1000, // 一括投稿時のインターバル（1秒）
  RATE_LIMIT_CODES: [429, 'RATE_LIMIT', 'TOO_MANY_REQUESTS']
};

// =====================================
// オプション構築（内部ヘルパー）
// =====================================

function buildCommentOptions(options: Partial<CommentMessageOptions> = {}): CommentMessageOptions {
  return {
    includeFixSteps: options.includeFixSteps !== undefined ? options.includeFixSteps : true,
    includeDetectedValue: options.includeDetectedValue !== undefined ? options.includeDetectedValue : true,
    language: options.language || 'ja'
  };
}

// =====================================
// バリデーション（内部ヘルパー）
// =====================================

function validateSeverity(severity: string): asserts severity is Severity {
  const validSeverities: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR'];
  if (!validSeverities.includes(severity as Severity)) {
    throw new ValidationError(
      'minSeverityは CRITICAL, MAJOR, MINOR のいずれかである必要があります'
    );
  }
}

async function validateProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new NotFoundError('プロジェクトが見つかりません');
  }

  return project;
}

async function validateViolationOwnership(violationId: string, userId: string) {
  const violation = await prisma.ruleViolation.findUnique({
    where: { id: violationId },
    include: { project: true }
  });

  if (!violation) {
    throw new NotFoundError('ルール違反が見つかりません');
  }

  if (violation.project.userId !== userId) {
    throw new ValidationError('このプロジェクトへのアクセス権限がありません');
  }

  return violation;
}

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

/**
 * Figma APIコメント投稿
 * 
 * @param userId - FIGLEANユーザーID
 * @param fileKey - FigmaファイルKey
 * @throws ExternalServiceError - Figma APIエラー
 */
async function postCommentToFigma(
  userId: string,
  fileKey: string,
  commentRequest: FigmaCommentRequest
): Promise<FigmaCommentResponse> {
  const accessToken = await figmaTokenService.getDecryptedToken(userId);

  if (!accessToken) {
    throw new ExternalServiceError('Figmaトークンが設定されていません');
  }

  const url = `${config.figma.apiBaseUrl}/v1/files/${fileKey}/comments`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'X-Figma-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commentRequest)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExternalServiceError(
        `Figma API エラー: ${response.status} ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error: any) {
    logger.error('Figmaコメント投稿エラー', { error, fileKey });
    throw new ExternalServiceError(
      error.message || 'Figmaへのコメント投稿に失敗しました'
    );
  }
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
  logger.info('🗑️ [SERVICE] deleteCommentFromFigma 開始', { userId, fileKey, commentId });

  const accessToken = await figmaTokenService.getDecryptedToken(userId);

  if (!accessToken) {
    throw new ExternalServiceError('Figmaトークンが設定されていません');
  }

  const url = `${config.figma.apiBaseUrl}/v1/files/${fileKey}/comments/${commentId}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Figma-Token': accessToken
      }
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        `Figmaコメント削除エラー: ${response.status}`
      );
    }

    logger.info('✅ [SERVICE] Figmaコメント削除成功', { commentId });
  } catch (error: any) {
    logger.error('❌ [SERVICE] Figmaコメント削除失敗', { error, commentId });
    throw new ExternalServiceError(
      error.message || 'Figmaコメント削除に失敗しました'
    );
  }
}

// =====================================
// レート制限対応付きFetch
// =====================================

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // レート制限エラー検出
    if (response.status === 429 && retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delay = Math.min(
        RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
        RETRY_CONFIG.MAX_DELAY
      );

      logger.warn(`レート制限検出、${delay}ms後にリトライします`, {
        retryCount,
        url
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
      
      logger.warn(`ネットワークエラー、${delay}ms後にリトライします`, {
        retryCount,
        error
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retryCount + 1);
    }

    throw error;
  }
}

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
  options: Partial<CommentMessageOptions> = {}
): Promise<CommentPostResult> {
  logger.info('💬 [SERVICE] postCommentForViolation 開始', { userId, violationId });

  try {
    // バリデーション
    const violation = await validateViolationOwnership(violationId, userId);

    // 既に投稿済みチェック
    if (violation.commentPosted) {
      logger.info('既に投稿済み', { violationId });
      return {
        success: false,
        violationId,
        error: 'このルール違反には既にコメントが投稿されています'
      };
    }

    // オプション構築
    const commentOptions = buildCommentOptions(options);

    // コメントメッセージ生成
    const message = generateCommentMessage(violation, commentOptions);

    // Figma APIリクエスト構築
    const commentRequest: FigmaCommentRequest = {
      message,
      client_meta: {
        node_id: violation.frameId,
        node_offset: { x: 0, y: 0 }
      }
    };

    // Figmaにコメント投稿
    const result = await postCommentToFigma(
      userId,
      violation.project.figmaFileKey,
      commentRequest
    );

    // データベース更新
    await prisma.ruleViolation.update({
      where: { id: violationId },
      data: {
        commentPosted: true,
        figmaCommentId: result.id
      }
    });

    logger.info('✅ [SERVICE] コメント投稿成功', { violationId, commentId: result.id });

    return {
      success: true,
      commentId: result.id,
      violationId
    };
  } catch (error: any) {
    logger.error('❌ [SERVICE] コメント投稿失敗', { error, violationId });
    return {
      success: false,
      violationId,
      error: error.message || 'コメント投稿に失敗しました'
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
  options: Partial<CommentMessageOptions> = {}
): Promise<BulkCommentPostResult> {
  logger.info('📝 [SERVICE] postCommentsForProject 開始', { userId, projectId });

  // プロジェクト所有権確認
  await validateProjectOwnership(projectId, userId);

  // オプション構築
  const commentOptions = buildCommentOptions(options);

  // 未投稿のルール違反を取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      projectId,
      commentPosted: false
    },
    include: {
      project: true
    }
  });

  logger.info(`対象ルール違反: ${violations.length}件`, { projectId });

  const results: CommentPostResult[] = [];

  // 一括投稿（レート制限対策でインターバルを設ける）
  for (const violation of violations) {
    const result = await postCommentForViolation(
      userId,
      violation.id,
      commentOptions
    );

    results.push(result);

    // レート制限回避のための待機
    if (violations.indexOf(violation) < violations.length - 1) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT_CONFIG.BULK_INTERVAL_MS)
      );
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info('✅ [SERVICE] 一括コメント投稿完了', {
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
  options: Partial<CommentMessageOptions> = {}
): Promise<BulkCommentPostResult> {
  logger.info('📝 [SERVICE] postCommentsBySeverity 開始', { userId, projectId, minSeverity });

  // バリデーション
  validateSeverity(minSeverity);
  await validateProjectOwnership(projectId, userId);

  // オプション構築
  const commentOptions = buildCommentOptions(options);

  // 重要度順序
  const severityOrder: Record<Severity, number> = {
    'CRITICAL': 1,
    'MAJOR': 2,
    'MINOR': 3
  };

  // 未投稿のルール違反を重要度フィルタで取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      projectId,
      commentPosted: false
    },
    include: {
      project: true
    }
  });

  // 重要度フィルタリング
  const filteredViolations = violations.filter(
    v => severityOrder[v.severity] <= severityOrder[minSeverity]
  );

  logger.info(`対象ルール違反: ${filteredViolations.length}件（${minSeverity}以上）`, { projectId });

  const results: CommentPostResult[] = [];

  // 一括投稿
  for (const violation of filteredViolations) {
    const result = await postCommentForViolation(
      userId,
      violation.id,
      commentOptions
    );

    results.push(result);

    // レート制限回避のための待機
    if (filteredViolations.indexOf(violation) < filteredViolations.length - 1) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT_CONFIG.BULK_INTERVAL_MS)
      );
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info('✅ [SERVICE] 重要度フィルタ付き一括投稿完了', {
    projectId,
    minSeverity,
    totalViolations: filteredViolations.length,
    successCount,
    failureCount
  });

  return {
    totalViolations: filteredViolations.length,
    successCount,
    failureCount,
    results
  };
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
  logger.info('📋 [SERVICE] getPostedComments 開始', { userId, projectId });

  // プロジェクト所有権確認
  await validateProjectOwnership(projectId, userId);

  // 投稿済みコメントを取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      projectId,
      commentPosted: true
    },
    orderBy: [
      { severity: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  logger.info('✅ [SERVICE] 投稿済みコメント取得成功', {
    projectId,
    count: violations.length
  });

  return violations;
}


// =====================================
// ルール違反のコメント削除
// =====================================

export async function deleteCommentForViolation(
  userId: string,
  projectId: string,
  violationId: string
): Promise<void> {
  logger.info('🗑️ [SERVICE] deleteCommentForViolation 開始', { userId, projectId, violationId });

  // プロジェクト所有権確認
  const project = await validateProjectOwnership(projectId, userId);

  // ルール違反取得
  const violation = await prisma.ruleViolation.findUnique({
    where: { id: violationId, projectId }
  });

  if (!violation) {
    throw new NotFoundError('指定されたルール違反が見つかりません');
  }

  if (!violation.commentPosted || !violation.figmaCommentId) {
    throw new ValidationError('このルール違反にはコメントが投稿されていません');
  }

  // Figmaからコメント削除
  await deleteCommentFromFigma(userId, project.figmaFileKey, violation.figmaCommentId);

  // データベース更新
  await prisma.ruleViolation.update({
    where: { id: violationId },
    data: {
      commentPosted: false,
      figmaCommentId: null
    }
  });

  logger.info('✅ [SERVICE] コメント削除完了', { violationId });
}

// =====================================
// コメントフラグリセット
// =====================================

export async function resetCommentFlags(
  userId: string,
  projectId: string
): Promise<number> {
  logger.info('🔄 [SERVICE] resetCommentFlags 開始', { userId, projectId });

  // プロジェクト所有権確認
  await validateProjectOwnership(projectId, userId);

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

  logger.info('✅ [SERVICE] コメントフラグリセット完了', {
    projectId,
    resetCount: result.count
  });

  return result.count;
}

// =====================================
// コメントプレビュー生成
// =====================================

export async function generateCommentPreview(
  userId: string,
  violationId: string,
  options: Partial<CommentMessageOptions> = {}
): Promise<{ message: string; options: CommentMessageOptions }> {
  logger.info('👁️ [SERVICE] generateCommentPreview 開始', { userId, violationId });

  // バリデーション
  const violation = await validateViolationOwnership(violationId, userId);

  // オプション構築
  const commentOptions = buildCommentOptions(options);

  // メッセージ生成
  const message = generateCommentMessage(violation, commentOptions);

  logger.info('✅ [SERVICE] コメントプレビュー生成成功', { violationId });

  return {
    message,
    options: commentOptions
  };
}

// =====================================
// エクスポート
// =====================================

export default {
  generateCommentMessage,
  postCommentForViolation,
  postCommentsForProject,
  postCommentsBySeverity,
  getPostedComments,
  deleteCommentFromFigma,
  deleteCommentForViolation,
  resetCommentFlags,
  generateCommentPreview
};