// =====================================
// backend/src/services/projectService.ts
// プロジェクト管理サービス - FIGLEAN版
// 作成日時: 2026年1月11日 00:11
// 更新日時: 2026年1月11日 00:11 - Prismaスキーマ完全準拠版
// 依存関係: @prisma/client, types/project
// 説明: プロジェクトCRUD操作、UserRole準拠プラン制限チェック
// =====================================

/**
 * Project Service
 * プロジェクト管理のビジネスロジック
 */

import { PrismaClient, UserRole, AnalysisStatus } from '@prisma/client';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectListQuery,
  ProjectListItem,
  ProjectListResponse,
  ProjectDetail,
  ProjectStats,
  PlanLimits
} from '../types/project';

const prisma = new PrismaClient();

/**
 * プロジェクト一覧取得
 */
export async function getProjects(
  userId: string,
  query: ProjectListQuery = {}
): Promise<ProjectListResponse> {
  const {
    limit = 20,
    offset = 0,
    sort = 'createdAt',
    order = 'desc',
    status,
    search
  } = query;

  // WHERE条件構築
  const where: any = { userId };

  if (status) {
    where.analysisStatus = status;
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive'
    };
  }

  // 総件数取得
  const total = await prisma.project.count({
    where
  });

  // プロジェクト一覧取得
  const projects = await prisma.project.findMany({
    where,
    orderBy: { [sort]: order },
    take: limit,
    skip: offset,
    include: {
      analysisResults: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          totalFrames: true,
          totalViolations: true,
          criticalViolations: true,
          majorViolations: true,
          minorViolations: true
        }
      }
    }
  });

  // レスポンス形式に変換
  const projectList: ProjectListItem[] = projects.map((project): ProjectListItem => {
    const analysis = project.analysisResults[0]; // 最新の解析結果

    const stats: ProjectStats | null = analysis ? {
      totalFrames: analysis.totalFrames,
      totalViolations: analysis.totalViolations,
      criticalCount: analysis.criticalViolations,
      majorCount: analysis.majorViolations,
      minorCount: analysis.minorViolations
    } : null;

    return {
      id: project.id,
      name: project.name,
      figmaFileUrl: project.figmaFileUrl,
      figleanScore: project.figleanScore,
      analysisStatus: project.analysisStatus,
      lastAnalyzedAt: project.lastAnalyzedAt,
      stats,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  });

  return {
    projects: projectList,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
}

/**
 * プロジェクト詳細取得
 */
export async function getProjectById(
  projectId: string,
  userId: string
): Promise<ProjectDetail | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return null;
  }

  // 所有権確認
  if (project.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  return {
    id: project.id,
    name: project.name,
    userId: project.userId,
    description: project.description,
    figmaFileKey: project.figmaFileKey,
    figmaFileUrl: project.figmaFileUrl,
    figmaFileName: project.figmaFileName,
    figmaNodeId: project.figmaNodeId,
    figleanScore: project.figleanScore,
    layoutScore: project.layoutScore,
    componentScore: project.componentScore,
    responsiveScore: project.responsiveScore,
    semanticScore: project.semanticScore,
    analysisStatus: project.analysisStatus,
    lastAnalyzedAt: project.lastAnalyzedAt,
    analysisCount: project.analysisCount,
    htmlGeneratable: project.htmlGeneratable,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

/**
 * プロジェクト作成
 */
export async function createProject(
  userId: string,
  data: CreateProjectDto
): Promise<ProjectDetail> {
  // プラン制限チェック
  await checkPlanLimits(userId);

  // プロジェクト作成
  const project = await prisma.project.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      figmaFileKey: data.figmaFileKey,
      figmaFileUrl: data.figmaFileUrl,
      figmaFileName: data.figmaFileName,
      figmaNodeId: data.figmaNodeId,
      analysisStatus: AnalysisStatus.PENDING
    }
  });

  return {
    id: project.id,
    name: project.name,
    userId: project.userId,
    description: project.description,
    figmaFileKey: project.figmaFileKey,
    figmaFileUrl: project.figmaFileUrl,
    figmaFileName: project.figmaFileName,
    figmaNodeId: project.figmaNodeId,
    figleanScore: project.figleanScore,
    layoutScore: project.layoutScore,
    componentScore: project.componentScore,
    responsiveScore: project.responsiveScore,
    semanticScore: project.semanticScore,
    analysisStatus: project.analysisStatus,
    lastAnalyzedAt: project.lastAnalyzedAt,
    analysisCount: project.analysisCount,
    htmlGeneratable: project.htmlGeneratable,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

/**
 * プロジェクト更新
 */
export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectDto
): Promise<ProjectDetail | null> {
  // 既存プロジェクト取得
  const existing = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!existing) {
    return null;
  }

  // 所有権確認
  if (existing.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  // プロジェクト更新
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: data.name || existing.name,
      description: data.description ?? existing.description,
      figmaFileUrl: data.figmaFileUrl ?? existing.figmaFileUrl,
      figmaFileName: data.figmaFileName ?? existing.figmaFileName,
      figmaNodeId: data.figmaNodeId ?? existing.figmaNodeId
    }
  });

  return {
    id: project.id,
    name: project.name,
    userId: project.userId,
    description: project.description,
    figmaFileKey: project.figmaFileKey,
    figmaFileUrl: project.figmaFileUrl,
    figmaFileName: project.figmaFileName,
    figmaNodeId: project.figmaNodeId,
    figleanScore: project.figleanScore,
    layoutScore: project.layoutScore,
    componentScore: project.componentScore,
    responsiveScore: project.responsiveScore,
    semanticScore: project.semanticScore,
    analysisStatus: project.analysisStatus,
    lastAnalyzedAt: project.lastAnalyzedAt,
    analysisCount: project.analysisCount,
    htmlGeneratable: project.htmlGeneratable,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

/**
 * プロジェクト削除
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  // 既存プロジェクト取得
  const existing = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!existing) {
    return false;
  }

  // 所有権確認
  if (existing.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  // プロジェクト削除
  await prisma.project.delete({
    where: { id: projectId }
  });

  return true;
}

/**
 * プラン制限チェック
 */
async function checkPlanLimits(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // プラン別の月間作成上限
  const limits: Record<UserRole, number> = {
    [UserRole.FREE]: 10,
    [UserRole.PRO]: 100,
    [UserRole.TEAM]: 500,
    [UserRole.ADMIN]: 999999
  };

  const maxProjects = limits[user.role];

  // 今月作成されたプロジェクト数をカウント
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentCount = await prisma.project.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth
      }
    }
  });

  if (currentCount >= maxProjects) {
    throw new Error('PLAN_LIMIT_EXCEEDED');
  }
}

/**
 * プラン制限情報取得
 */
export async function getPlanLimits(userId: string): Promise<PlanLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // プラン別の月間作成上限
  const limits: Record<UserRole, number> = {
    [UserRole.FREE]: 10,
    [UserRole.PRO]: 100,
    [UserRole.TEAM]: 500,
    [UserRole.ADMIN]: 999999
  };

  const maxProjects = limits[user.role];

  // 今月作成されたプロジェクト数をカウント
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentCount = await prisma.project.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth
      }
    }
  });

  return {
    maxProjects,
    currentCount
  };
}