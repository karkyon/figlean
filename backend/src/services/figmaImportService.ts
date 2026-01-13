// =====================================
// backend/src/services/figmaImportService.ts
// Figmaインポート＋解析サービス - FIGLEAN Phase 6 + Phase 8統合
// 作成日時: 2026年1月11日
// 更新日時: 2026年1月12日 - Phase 8統合（崩壊予測・改善提案）
// 依存関係: figmaApiService, jobManagerService, projectService, Prisma
// 説明: Figmaファイル取得、Frame走査、ルールチェック実行（非同期）
// =====================================

import { 
  PrismaClient, 
  AnalysisStatus, 
  RuleCategory as PrismaRuleCategory, 
  Severity as PrismaSeverity 
} from '@prisma/client';
import * as figmaApiService from './figmaApiService';
import * as jobManagerService from './jobManagerService';
import * as predictionService from './predictionService';
import * as suggestionService from './suggestionService';
import { NotFoundError } from '../errors';
import logger from '../utils/logger';
import { getRuleEngine } from '../rules/RuleEngine';
import { getScoreCalculator } from '../rules/ScoreCalculator';
import type { AnalysisResultSummary } from '../types/rules';

const prisma = new PrismaClient();

// =====================================
// 型定義
// =====================================

export interface ImportRequest {
  userId: string;
  projectId: string;
  fileKey: string;
  pageIds?: string[];
  analyzeAll?: boolean;
}

export interface ImportResult {
  jobId: string;
  status: string;
  message: string;
}

// =====================================
// インポート＋解析実行
// =====================================

export async function startImport(request: ImportRequest): Promise<ImportResult> {
  logger.info('Figmaインポート開始', {
    userId: request.userId,
    projectId: request.projectId,
    fileKey: request.fileKey
  });

  const project = await prisma.project.findUnique({
    where: {
      id: request.projectId,
      userId: request.userId
    }
  });

  if (!project) {
    throw new NotFoundError('プロジェクトが見つかりません');
  }

  const job = jobManagerService.createJob({
    userId: request.userId,
    projectId: request.projectId,
    fileKey: request.fileKey,
    metadata: {
      pageIds: request.pageIds,
      analyzeAll: request.analyzeAll
    }
  });

  executeImportJob(job.jobId, request).catch((error) => {
    logger.error('バックグラウンドジョブ実行エラー', {
      jobId: job.jobId,
      error
    });
  });

  return {
    jobId: job.jobId,
    status: 'ACTIVE' as AnalysisStatus,
    message: '解析を開始しました。完了まで数分かかる場合があります。'
  };
}

async function executeImportJob(
  jobId: string,
  request: ImportRequest
): Promise<void> {
  try {
    logger.info('インポートジョブ実行開始', { jobId });

    await updateProjectStatus(request.projectId, 'IN_PROGRESS' as AnalysisStatus);
    jobManagerService.updateJobStatus(jobId, 'IMPORTING', {
      current: 10,
      total: 100,
      currentStep: 'Fetching file metadata'
    });

    logger.info('Figmaファイル取得開始', { jobId, fileKey: request.fileKey });
    const fileDetail = await figmaApiService.getFigmaFile(
      request.userId,
      request.fileKey
    );

    logger.info('Frame抽出開始', { jobId });
    const frames = await figmaApiService.extractFrames(
      request.userId,
      request.fileKey,
      {
        maxDepth: 10,
        includeHidden: false
      }
    );

    jobManagerService.updateJobProgress(
      jobId,
      40,
      100,
      `Found ${frames.length} frames`
    );

    logger.info('Frame抽出完了', {
      jobId,
      framesCount: frames.length
    });

    await updateProjectStatus(request.projectId, 'IN_PROGRESS' as AnalysisStatus);
    jobManagerService.updateJobStatus(jobId, 'ANALYZING', {
      current: 50,
      total: 100,
      currentStep: 'Analyzing frames'
    });

    logger.info('ルールチェック開始', { jobId, framesCount: frames.length });
    
    const analysisResult = await analyzeFrames(
      request.projectId,
      frames,
      fileDetail,
      jobId
    );

    jobManagerService.updateJobProgress(
      jobId,
      90,
      100,
      'Saving results'
    );

    await saveAnalysisResult(request.projectId, analysisResult);

    await updateProjectStatus(request.projectId, 'COMPLETED');
    await updateProjectScores(request.projectId, analysisResult);

    jobManagerService.completeJob(jobId);

    logger.info('インポートジョブ完了', {
      jobId,
      projectId: request.projectId,
      framesAnalyzed: frames.length
    });

  } catch (error) {
    logger.error('インポートジョブ失敗', { jobId, error });

    await updateProjectStatus(request.projectId, 'FAILED');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    jobManagerService.failJob(jobId, errorMessage);
  }
}

// =====================================
// 解析処理
// =====================================

async function analyzeFrames(
  projectId: string,
  frames: figmaApiService.FigmaNode[],
  fileDetail: figmaApiService.FigmaFileDetail,
  jobId: string
): Promise<AnalysisResultSummary> {
  logger.info('Frame解析開始（ルールエンジン使用）', {
    projectId,
    framesCount: frames.length,
    jobId
  });

  const ruleEngine = getRuleEngine();
  const scoreCalculator = getScoreCalculator();

  jobManagerService.updateJobProgress(
    jobId,
    50,
    100,
    'Starting rule engine analysis'
  );

  let summary = ruleEngine.analyzeDocument(fileDetail.document, projectId);

  jobManagerService.updateJobProgress(
    jobId,
    80,
    100,
    'Calculating scores'
  );
  
  summary = scoreCalculator.calculateScores(summary);

  logger.info('Frame解析完了', {
    projectId,
    figleanScore: summary.scoreResult.figleanScore,
    violationsCount: summary.violations.length,
    canGenerateHTML: summary.scoreResult.canGenerateHTML
  });

  return summary;
}

// =====================================
// 型変換関数
// =====================================

function mapRuleCategoryToPrisma(category: string): PrismaRuleCategory {
  const mapping: Record<string, PrismaRuleCategory> = {
    'LAYOUT': 'LAYOUT',
    'COMPONENT': 'COMPONENT',
    'RESPONSIVE': 'RESPONSIVE',
    'SEMANTIC': 'SEMANTIC',
    'CONSTRAINT': 'CONSTRAINT',
    'STRUCTURE': 'STRUCTURE'
  };
  return mapping[category] || 'LAYOUT';
}

function mapSeverityToPrisma(severity: string): PrismaSeverity {
  const mapping: Record<string, PrismaSeverity> = {
    'CRITICAL': 'CRITICAL',
    'MAJOR': 'MAJOR',
    'MINOR': 'MINOR'
  };
  return mapping[severity] || 'MINOR';
}

// =====================================
// DB保存
// =====================================

async function saveAnalysisResult(
  projectId: string,
  summary: AnalysisResultSummary
): Promise<void> {
  logger.info('解析結果保存開始', { projectId });

  // =====================================
  // Phase 8統合: 既存データクリア
  // =====================================
  logger.info('既存の解析データクリア開始', { projectId });

  // 既存のルール違反を削除
  await prisma.ruleViolation.deleteMany({
    where: { projectId }
  });

  // 既存の崩壊予測を削除
  await prisma.breakPrediction.deleteMany({
    where: { projectId }
  });

  // 既存の改善提案を削除
  await prisma.improvementSuggestion.deleteMany({
    where: { projectId }
  });

  // 既存の解析結果を削除
  await prisma.analysisResult.deleteMany({
    where: { projectId }
  });

  logger.info('既存の解析データクリア完了', { projectId });

  // =====================================
  // 解析結果保存
  // =====================================
  const analysisResult = await prisma.analysisResult.create({
    data: {
      projectId,
      figleanScore: summary.scoreResult.figleanScore,
      layoutScore: summary.scoreResult.layoutScore,
      componentScore: summary.scoreResult.componentScore,
      responsiveScore: summary.scoreResult.responsiveScore,
      semanticScore: summary.scoreResult.semanticScore,
      totalFrames: summary.totalFrames,
      analyzedFrames: summary.analyzedFrames,
      autoLayoutFrames: summary.stats.autoLayoutFrames,
      componentUsage: summary.stats.componentUsage,
      totalViolations: summary.violations.length,
      criticalViolations: summary.scoreResult.violations.critical,
      majorViolations: summary.scoreResult.violations.major,
      minorViolations: summary.scoreResult.violations.minor,
      htmlGeneratable: summary.scoreResult.canGenerateHTML,
      generatableReason: summary.scoreResult.canGenerateHTML 
        ? 'FIGLEAN適合度90%以上' 
        : 'FIGLEAN適合度が90%未満のため生成不可',
      mobileReady: false,
      tabletReady: false,
      desktopReady: true,
      analysisTimeMs: 0
    }
  });

  logger.info('AnalysisResult保存完了', {
    analysisResultId: analysisResult.id,
    figleanScore: analysisResult.figleanScore
  });

  // =====================================
  // ルール違反保存
  // =====================================
  if (summary.violations.length > 0) {
    logger.info('RuleViolation保存開始', {
      count: summary.violations.length
    });

    const violationData = summary.violations.map(v => ({
      // 必須フィールド
      projectId,
      frameName: v.frameName,
      ruleId: v.ruleId,
      ruleName: v.ruleName,
      ruleCategory: mapRuleCategoryToPrisma(v.category),
      severity: mapSeverityToPrisma(v.severity),
      description: v.description,
      commentPosted: false,
      
      // オプショナルフィールド（値がある場合のみ設定）
      ...(analysisResult.id && { analysisId: analysisResult.id }),
      ...(v.frameId && { frameId: v.frameId }),
      ...(v.impact && { impact: v.impact }),
      ...(v.suggestion && { suggestion: v.suggestion }),
      ...(v.detectedValue && { detectedValue: v.detectedValue }),
      ...(v.expectedValue && { expectedValue: v.expectedValue })
    }));

    await prisma.ruleViolation.createMany({
      data: violationData
    });

    logger.info('RuleViolation保存完了', {
      count: summary.violations.length
    });

    // =====================================
    // Phase 8統合: 崩壊予測生成
    // =====================================
    logger.info('崩壊予測生成開始', { projectId });

    // 保存したルール違反を取得（frameIdを含む完全なデータ）
    const savedViolations = await prisma.ruleViolation.findMany({
      where: { projectId }
    });

    const predictionCount = await predictionService.generatePredictions(
      projectId,
      savedViolations
    );

    logger.info('崩壊予測生成完了', { 
      projectId, 
      predictionCount 
    });

    // =====================================
    // Phase 8統合: 改善提案生成
    // =====================================
    logger.info('改善提案生成開始', { projectId });

    const suggestionCount = await suggestionService.generateSuggestions(
      projectId,
      savedViolations
    );

    logger.info('改善提案生成完了', { 
      projectId, 
      suggestionCount 
    });

  } else {
    logger.info('ルール違反なし - 崩壊予測・改善提案のスキップ', { projectId });
  }

  logger.info('解析結果保存完了（Phase 8統合）', { 
    projectId,
    violationsCount: summary.violations.length
  });
}

async function updateProjectStatus(
  projectId: string,
  status: AnalysisStatus
): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      analysisStatus: status,
      lastAnalyzedAt: status === 'COMPLETED' ? new Date() : undefined
    }
  });

  logger.info('Projectステータス更新', { projectId, status });
}

async function updateProjectScores(
  projectId: string,
  summary: AnalysisResultSummary
): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      figleanScore: summary.scoreResult.figleanScore,
      layoutScore: summary.scoreResult.layoutScore,
      componentScore: summary.scoreResult.componentScore,
      responsiveScore: summary.scoreResult.responsiveScore,
      semanticScore: summary.scoreResult.semanticScore,
      htmlGeneratable: summary.scoreResult.canGenerateHTML
    }
  });

  logger.info('Projectスコア更新', { projectId });
}

// =====================================
// ジョブステータス取得
// =====================================

export async function getImportStatus(jobId: string): Promise<{
  jobId: string;
  status: string;
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentStep: string;
  };
  error?: string;
}> {
  const job = jobManagerService.getJob(jobId);

  if (!job) {
    throw new NotFoundError('ジョブが見つかりません');
  }

  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    error: job.error
  };
}

// =====================================
// エクスポート
// =====================================

export default {
  startImport,
  getImportStatus
};