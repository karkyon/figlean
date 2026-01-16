// =====================================
// ファイルパス: backend/src/services/analysisService.ts
// 概要: 診断サービス - ビジネスロジック層
// 機能説明:
//   - プロジェクト診断サマリー取得ロジック
//   - ルール違反一覧取得ロジック（ページング、フィルター付き）
//   - 崩壊予測一覧取得ロジック
//   - 改善提案一覧取得ロジック
//   - DB操作とビジネスロジックを集約
// 作成日: 2026-01-16
// 更新日: 2026-01-16 - 初回作成（Controller層からロジック分離）
// 依存関係:
//   - @prisma/client
//   - ../lib/prisma
//   - ../utils/logger
//   - ../errors
// =====================================

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { ValidationError } from '../errors';

const prisma = new PrismaClient();

// =====================================
// 型定義
// =====================================

interface ViolationFilters {
  severity?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  commentPosted?: boolean;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

// =====================================
// 診断サマリー取得
// =====================================

export async function fetchAnalysisSummary(userId: string, projectId: string) {
  logger.info('📊 [SERVICE] fetchAnalysisSummary 開始', { userId, projectId });

  // プロジェクトの所有権確認
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new ValidationError('プロジェクトが見つかりません');
  }

  // 診断結果取得
  const analysis = await prisma.analysisResult.findFirst({
    where: { projectId }
  });

  if (!analysis) {
    logger.info('ℹ️ [SERVICE] 診断結果未作成', { projectId });
    return null;
  }

  // 違反統計を集計
  const violationStats = await calculateViolationStats(projectId);

  // フレーム総数を計算
  const totalFrames = await calculateTotalFrames(projectId);

  logger.info('✅ [SERVICE] 診断サマリー取得成功', {
    projectId,
    figleanScore: analysis.figleanScore,
    totalFrames
  });

  return {
    figleanScore: analysis.figleanScore,
    canGenerateHTML: analysis.htmlGeneratable,
    canUseGrid: analysis.figleanScore === 100, // 100点の場合のみGrid可能
    violations: violationStats,
    totalFrames,
    analyzedAt: analysis.createdAt
  };
}

// =====================================
// 違反統計計算（内部ヘルパー）
// =====================================

async function calculateViolationStats(projectId: string) {
  const violationStats = await prisma.ruleViolation.groupBy({
    by: ['severity'],
    where: { projectId },
    _count: { severity: true }
  });

  return {
    critical: violationStats.find((v: any) => v.severity === 'CRITICAL')?._count.severity || 0,
    major: violationStats.find((v: any) => v.severity === 'MAJOR')?._count.severity || 0,
    minor: violationStats.find((v: any) => v.severity === 'MINOR')?._count.severity || 0
  };
}

// =====================================
// フレーム総数計算（内部ヘルパー）
// =====================================

async function calculateTotalFrames(projectId: string) {
  const frames = await prisma.ruleViolation.groupBy({
    by: ['frameId'],
    where: { projectId }
  });

  return frames.length;
}

// =====================================
// ルール違反一覧取得
// =====================================

export async function fetchViolations(
  userId: string,
  projectId: string,
  filters: ViolationFilters,
  pagination: PaginationParams
) {
  logger.info('📋 [SERVICE] fetchViolations 開始', { userId, projectId, filters, pagination });

  // プロジェクトの所有権確認
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new ValidationError('プロジェクトが見つかりません');
  }

  // ページングパラメータ
  const limitNum = Math.min(pagination.limit || 50, 100);
  const offsetNum = pagination.offset || 0;

  // WHERE条件構築
  const whereCondition = buildWhereCondition(projectId, filters);

  // RuleViolation取得
  const violations = await prisma.ruleViolation.findMany({
    where: whereCondition,
    take: limitNum,
    skip: offsetNum,
    orderBy: [
      { severity: 'asc' }, // CRITICAL → MAJOR → MINOR
      { frameName: 'asc' }
    ]
  });

  // 総件数取得
  const total = await prisma.ruleViolation.count({
    where: whereCondition
  });

  logger.info('✅ [SERVICE] ルール違反一覧取得成功', {
    projectId,
    count: violations.length,
    total
  });

  return {
    violations,
    total,
    limit: limitNum,
    offset: offsetNum,
    hasMore: offsetNum + violations.length < total
  };
}

// =====================================
// WHERE条件構築（内部ヘルパー）
// =====================================

function buildWhereCondition(projectId: string, filters: ViolationFilters) {
  const whereCondition: any = { projectId };

  if (filters.severity) {
    whereCondition.severity = filters.severity;
  }

  if (filters.commentPosted !== undefined) {
    whereCondition.commentPosted = filters.commentPosted;
  }

  return whereCondition;
}

// =====================================
// 崩壊予測取得
// =====================================

export async function fetchPredictions(userId: string, projectId: string) {
  logger.info('🔮 [SERVICE] fetchPredictions 開始', { userId, projectId });

  // プロジェクトの所有権確認
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new ValidationError('プロジェクトが見つかりません');
  }

  // 崩壊予測取得
  const predictions = await prisma.breakPrediction.findMany({
    where: { projectId },
    orderBy: [
      { severity: 'desc' }, // CRITICAL → MAJOR → MINOR
      { affectedFrame: 'asc' }
    ]
  });

  logger.info('✅ [SERVICE] 崩壊予測取得成功', {
    projectId,
    count: predictions.length
  });

  return predictions;
}

// =====================================
// 改善提案取得
// =====================================

export async function fetchSuggestions(userId: string, projectId: string) {
  logger.info('💡 [SERVICE] fetchSuggestions 開始', { userId, projectId });

  // プロジェクトの所有権確認
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new ValidationError('プロジェクトが見つかりません');
  }

  // 改善提案取得
  const suggestions = await prisma.improvementSuggestion.findMany({
    where: { projectId },
    orderBy: [
      { priority: 'asc' },
      { scoreImprovement: 'desc' }
    ]
  });

  logger.info('✅ [SERVICE] 改善提案取得成功', {
    projectId,
    count: suggestions.length
  });

  return suggestions;
}

// =====================================
// プロジェクト再解析
// =====================================

export async function reanalyzeProject(userId: string, projectId: string) {
  logger.info('🔄 [SERVICE] reanalyzeProject 開始', { userId, projectId });

  // プロジェクトの所有権確認
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId }
  });

  if (!project) {
    throw new ValidationError('プロジェクトが見つかりません');
  }

  if (!project.figmaFileKey) {
    throw new ValidationError('Figmaファイルキーが設定されていません');
  }

  // Figmaインポートサービスを使用して再解析実行
  const figmaImportService = require('./figmaImportService');
  
  const result = await figmaImportService.startImport({
    userId,
    projectId,
    fileKey: project.figmaFileKey,
    analyzeAll: true
  });

  logger.info('✅ [SERVICE] 再解析ジョブ開始成功', {
    projectId,
    jobId: result.jobId
  });

  return {
    jobId: result.jobId,
    status: result.status,
    message: '再解析を開始しました。完了まで数分かかる場合があります。'
  };
}

// =====================================
// エクスポート
// =====================================

export default {
  fetchAnalysisSummary,
  fetchViolations,
  fetchPredictions,
  fetchSuggestions,
  reanalyzeProject
};