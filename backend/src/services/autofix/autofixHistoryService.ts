// =====================================
// ファイルパス: backend/src/services/autofixHistoryService.ts
// 概要: AutoFix履歴管理サービス
// 機能説明: 修正履歴の取得、Rollback処理
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: 新規作成
// 依存関係: PrismaClient, figmaApiService, types/autofix, utils/logger
// =====================================

import { PrismaClient } from '@prisma/client';
import {
  AutoFixHistoryListQuery,
  AutoFixHistoryDto,
  AutoFixHistoryListResponseDto,
  AutoFixRollbackRequestDto,
  AutoFixRollbackResponseDto,
  AutoFixStatus,
  AutoFixItemResult,
} from '../../types/autofix';
import { modifyFigmaNodes } from '../../utils/figmaModifier';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// =====================================
// AutoFix履歴取得
// =====================================

export async function getAutoFixHistories(
  userId: string,
  query: AutoFixHistoryListQuery
): Promise<AutoFixHistoryListResponseDto> {
  const {
    projectId,
    limit = 20,
    offset = 0,
    status,
  } = query;

  logger.info('AutoFix履歴取得開始', { userId, query });

  // クエリ条件構築
  const where: any = {
    userId,
  };

  if (projectId) {
    where.projectId = projectId;
  }

  if (status) {
    where.status = status;
  }

  // 総数取得
  const total = await prisma.autoFixHistory.count({ where });

  // 履歴取得
  const histories = await prisma.autoFixHistory.findMany({
    where,
    include: {
      items: {
        include: {
          violation: {
            select: {
              ruleId: true,
              severity: true,
            },
          },
        },
      },
      project: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      executedAt: 'desc',
    },
    skip: offset,
    take: limit,
  });

  // DTOに変換
  const historyDtos: AutoFixHistoryDto[] = histories.map((h) => ({
    id: h.id,
    projectId: h.projectId,
    userId: h.userId,
    isIndividual: h.isIndividual,
    violationId: h.violationId || undefined,
    fixedCount: h.fixedCount,
    beforeScore: h.beforeScore,
    afterScore: h.afterScore,
    scoreDelta: h.scoreDelta,
    status: h.status as AutoFixStatus,
    deleteComments: h.deleteComments,
    deletedCommentCount: Array.isArray(h.deletedComments)
      ? (h.deletedComments as any[]).length
      : undefined,
    isRolledBack: h.isRolledBack,
    rollbackAt: h.rollbackAt || undefined,
    executedAt: h.executedAt,
    completedAt: h.completedAt || undefined,
    items: h.items.map((item) => ({
      id: item.id,
      violationId: item.violationId,
      category: item.category as any,
      fixType: item.fixType as any,
      frameName: item.frameName,
      figmaNodeId: item.figmaNodeId,
      status: item.status as AutoFixStatus,
      beforeValue: item.beforeValue,
      afterValue: item.afterValue,
      errorMessage: item.errorMessage || undefined,
    })),
  }));

  logger.info('AutoFix履歴取得完了', { total, count: historyDtos.length });

  return {
    histories: historyDtos,
    pagination: {
      total,
      limit,
      offset,
    },
  };
}

// =====================================
// AutoFix履歴詳細取得
// =====================================

export async function getAutoFixHistoryDetail(
  historyId: string,
  userId: string
): Promise<AutoFixHistoryDto> {
  logger.info('AutoFix履歴詳細取得', { historyId, userId });

  const history = await prisma.autoFixHistory.findFirst({
    where: {
      id: historyId,
      userId,
    },
    include: {
      items: {
        include: {
          violation: {
            select: {
              ruleId: true,
              severity: true,
            },
          },
        },
      },
      project: {
        select: {
          name: true,
          figmaFileKey: true,
        },
      },
    },
  });

  if (!history) {
    throw new Error('AutoFix history not found');
  }

  return {
    id: history.id,
    projectId: history.projectId,
    userId: history.userId,
    isIndividual: history.isIndividual,
    violationId: history.violationId || undefined,
    fixedCount: history.fixedCount,
    beforeScore: history.beforeScore,
    afterScore: history.afterScore,
    scoreDelta: history.scoreDelta,
    status: history.status as AutoFixStatus,
    deleteComments: history.deleteComments,
    deletedCommentCount: Array.isArray(history.deletedComments)
      ? (history.deletedComments as any[]).length
      : undefined,
    isRolledBack: history.isRolledBack,
    rollbackAt: history.rollbackAt || undefined,
    executedAt: history.executedAt,
    completedAt: history.completedAt || undefined,
    items: history.items.map((item) => ({
      id: item.id,
      violationId: item.violationId,
      category: item.category as any,
      fixType: item.fixType as any,
      frameName: item.frameName,
      figmaNodeId: item.figmaNodeId,
      status: item.status as AutoFixStatus,
      beforeValue: item.beforeValue,
      afterValue: item.afterValue,
      errorMessage: item.errorMessage || undefined,
    })),
  };
}

// =====================================
// Rollback処理
// =====================================

export async function rollbackAutoFix(
  userId: string,
  request: AutoFixRollbackRequestDto
): Promise<AutoFixRollbackResponseDto> {
  logger.info('AutoFix Rollback開始', { userId, historyIds: request.historyIds });

  const successHistories: string[] = [];
  const failedHistories: { historyId: string; reason: string }[] = [];

  // ユーザーのFigmaトークン取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { figmaAccessToken: true },
  });

  if (!user || !user.figmaAccessToken) {
    throw new Error('Figma access token not found');
  }

  const figmaAccessToken = user.figmaAccessToken;

  for (const historyId of request.historyIds) {
    try {
      // 履歴取得
      const history = await prisma.autoFixHistory.findFirst({
        where: {
          id: historyId,
          userId,
          isRolledBack: false,
        },
        include: {
          items: true,
          project: {
            select: {
              id: true,
              figmaFileKey: true,
              figleanScore: true,
            },
          },
        },
      });

      if (!history) {
        failedHistories.push({
          historyId,
          reason: 'History not found or already rolled back',
        });
        continue;
      }

      // 各修正項目をロールバック
      const rollbackUpdates = history.items
        .filter((item) => item.status === AutoFixStatus.COMPLETED)
        .map((item) => ({
          nodeId: item.figmaNodeId,
          properties: item.beforeValue,
        }));

      if (rollbackUpdates.length > 0) {
        await modifyFigmaNodes(
          figmaAccessToken,
          history.project.figmaFileKey!,
          rollbackUpdates
        );
      }

      // 履歴をロールバック済みに更新
      await prisma.autoFixHistory.update({
        where: { id: historyId },
        data: {
          isRolledBack: true,
          rollbackAt: new Date(),
          rollbackBy: userId,
          status: AutoFixStatus.ROLLED_BACK,
        },
      });

      // プロジェクトスコアを元に戻す
      const newScore = Math.max(0, history.beforeScore);
      await prisma.project.update({
        where: { id: history.projectId },
        data: { figleanScore: newScore },
      });

      successHistories.push(historyId);
      logger.info('Rollback成功', { historyId });
    } catch (error: any) {
      logger.error('Rollback失敗', { historyId, error });
      failedHistories.push({
        historyId,
        reason: error.message,
      });
    }
  }

  // 最新のプロジェクトスコア取得
  let currentScore = 0;
  if (request.historyIds.length > 0) {
    const firstHistory = await prisma.autoFixHistory.findFirst({
      where: { id: request.historyIds[0] },
      select: {
        project: {
          select: { figleanScore: true },
        },
      },
    });
    currentScore = firstHistory?.project.figleanScore || 0;
  }

  logger.info('AutoFix Rollback完了', {
    successCount: successHistories.length,
    failedCount: failedHistories.length,
  });

  return {
    successCount: successHistories.length,
    failedCount: failedHistories.length,
    rolledBackHistories: successHistories,
    failedHistories,
    currentScore,
    message: `${successHistories.length}件のロールバックが完了しました。`,
  };
}