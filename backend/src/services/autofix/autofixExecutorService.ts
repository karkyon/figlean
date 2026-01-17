// =====================================
// ファイルパス: backend/src/services/autofix/autofixExecutorService.ts
// 概要: AutoFix実行サービス（Figma API修正処理）
// 機能説明: Figma APIを使用してデザインを実際に修正する
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: TypeScriptエラー修正（import修正、nullチェック追加、未使用変数削除）
// 依存関係: PrismaClient, utils/figmaModifier, types/autofix, utils/logger
// =====================================

import { PrismaClient } from '@prisma/client';
import {
  AutoFixExecuteRequestDto,
  AutoFixExecuteResponseDto,
  AutoFixItemResult,
  AutoFixStatus,
  AutoFixCategory,
  AutoFixType,
  FigmaNodeUpdate,
} from '../../types/autofix';
import { modifyFigmaNodes } from '../../utils/figmaModifier';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// =====================================
// AutoFix実行メイン処理
// =====================================

export async function executeAutoFix(
  userId: string,
  projectId: string,
  request: AutoFixExecuteRequestDto
): Promise<AutoFixExecuteResponseDto> {
  logger.info('AutoFix 実行開始', {
    projectId,
    userId,
    violationCount: request.violationIds.length,
  });

  // 1. プロジェクトとユーザー情報取得
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    include: {
      user: {
        select: {
          figmaAccessToken: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (!project.user.figmaAccessToken) {
    throw new Error('Figma access token not found');
  }

  if (!project.figleanScore) {
    throw new Error('プロジェクトスコアが計算されていません');
  }

  const figmaAccessToken = project.user.figmaAccessToken;
  const beforeScore = project.figleanScore;

  // 2. 違反情報取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      id: { in: request.violationIds },
      projectId,
    },
  });

  if (violations.length === 0) {
    throw new Error('No violations found');
  }

  // 3. AutoFixHistory作成
  const history = await prisma.autoFixHistory.create({
    data: {
      projectId,
      userId,
      isIndividual: request.violationIds.length === 1,
      violationId: request.violationIds.length === 1 ? request.violationIds[0] : null,
      fixedCount: 0,
      fixedViolations: [],
      beforeScore,
      afterScore: beforeScore,
      scoreDelta: 0,
      status: AutoFixStatus.EXECUTING,
      figmaChanges: {},
      deleteComments: request.deleteComments || false,
    },
  });

  // 4. 各違反を処理
  const itemResults: AutoFixItemResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  const figmaChanges: any[] = [];
  const deletedComments: string[] = [];

  for (const violation of violations) {
    try {
      // frameIdのnullチェック
      if (!violation.frameId) {
        logger.warn('Frame IDが存在しないためスキップ', { violationId: violation.id });
        failedCount++;
        itemResults.push({
          id: '',
          violationId: violation.id,
          category: AutoFixCategory.AUTO_LAYOUT,
          fixType: AutoFixType.ADD_AUTO_LAYOUT,
          frameName: violation.frameName,
          figmaNodeId: '',
          status: AutoFixStatus.FAILED,
          beforeValue: {},
          afterValue: {},
          errorMessage: 'Frame IDが存在しません',
        });
        continue;
      }

      const result = await processViolationFix(
        violation,
        project.figmaFileKey!,
        figmaAccessToken
      );

      itemResults.push(result);

      if (result.status === AutoFixStatus.COMPLETED) {
        successCount++;
        figmaChanges.push({
          violationId: violation.id,
          nodeId: result.figmaNodeId,
          change: result.afterValue,
        });
      } else {
        failedCount++;
      }

      // コメント削除処理（Figma Comment API未実装のため将来拡張）
      if (request.deleteComments && violation.commentPosted && violation.figmaCommentId) {
        try {
          // TODO: Figma Comment API実装後に有効化
          // await deleteFigmaComment(figmaAccessToken, project.figmaFileKey!, violation.figmaCommentId);
          logger.info('コメント削除スキップ（未実装）', { 
            violationId: violation.id,
            commentId: violation.figmaCommentId 
          });
          // deletedComments.push(violation.figmaCommentId);
        } catch (err) {
          logger.warn('コメント削除失敗', { violationId: violation.id, err });
        }
      }
    } catch (error: any) {
      logger.error('違反修正処理エラー', { violationId: violation.id, error });
      failedCount++;
      itemResults.push({
        id: '',
        violationId: violation.id,
        category: AutoFixCategory.AUTO_LAYOUT,
        fixType: AutoFixType.ADD_AUTO_LAYOUT,
        frameName: violation.frameName,
        figmaNodeId: violation.frameId || '',
        status: AutoFixStatus.FAILED,
        beforeValue: {},
        afterValue: {},
        errorMessage: error.message,
      });
    }
  }

  // 5. スコア再計算（成功した修正の件数でスコア改善を計算、1件あたり+5点と仮定）
  const totalScoreImpact = successCount * 5;

  const afterScore = Math.min(100, beforeScore + totalScoreImpact);
  const scoreDelta = afterScore - beforeScore;

  // 6. 履歴更新
  await prisma.autoFixHistory.update({
    where: { id: history.id },
    data: {
      fixedCount: successCount,
      fixedViolations: itemResults
        .filter((r) => r.status === AutoFixStatus.COMPLETED)
        .map((r) => r.violationId),
      afterScore,
      scoreDelta,
      status: failedCount === 0 ? AutoFixStatus.COMPLETED : AutoFixStatus.FAILED,
      figmaChanges: { changes: figmaChanges },
      deletedComments: deletedComments.length > 0 ? deletedComments : undefined,
      completedAt: new Date(),
    },
  });

  // 7. AutoFixItem作成
  for (const itemResult of itemResults) {
    await prisma.autoFixItem.create({
      data: {
        historyId: history.id,
        violationId: itemResult.violationId,
        category: itemResult.category,
        fixType: itemResult.fixType,
        figmaFileKey: project.figmaFileKey!,
        figmaNodeId: itemResult.figmaNodeId,
        frameName: itemResult.frameName,
        beforeValue: itemResult.beforeValue as any,
        afterValue: itemResult.afterValue as any,
        status: itemResult.status,
        errorMessage: itemResult.errorMessage,
      },
    });
  }

  // 8. プロジェクトスコア更新
  await prisma.project.update({
    where: { id: projectId },
    data: { figleanScore: afterScore },
  });

  logger.info('AutoFix 実行完了', {
    projectId,
    historyId: history.id,
    successCount,
    failedCount,
    scoreDelta,
  });

  return {
    historyId: history.id,
    status: failedCount === 0 ? AutoFixStatus.COMPLETED : AutoFixStatus.FAILED,
    fixedCount: successCount,
    failedCount,
    beforeScore,
    afterScore,
    scoreDelta,
    items: itemResults,
    message: `${successCount}件の修正が完了しました。${failedCount}件が失敗しました。`,
  };
}

// =====================================
// 個別違反修正処理
// =====================================

async function processViolationFix(
  violation: any,
  figmaFileKey: string,
  figmaAccessToken: string
): Promise<AutoFixItemResult> {
  const { ruleId, frameId, frameName } = violation;

  // ルールIDに応じた修正内容決定
  const fixMapping = getRuleToFixMapping(ruleId);
  if (!fixMapping) {
    throw new Error(`Unsupported rule: ${ruleId}`);
  }

  // 修正前後の値生成
  const { beforeValue, afterValue } = generateFixValues(fixMapping.fixType, violation);

  // Figma API呼び出し
  try {
    const nodeUpdate: FigmaNodeUpdate = {
      nodeId: frameId,
      properties: afterValue,
    };

    await modifyFigmaNodes(figmaAccessToken, figmaFileKey, [nodeUpdate]);

    return {
      id: '', // AutoFixItemのIDは後でPrismaが割り当て
      violationId: violation.id,
      category: fixMapping.category,
      fixType: fixMapping.fixType,
      frameName,
      figmaNodeId: frameId,
      status: AutoFixStatus.COMPLETED,
      beforeValue,
      afterValue,
    };
  } catch (error: any) {
    logger.error('Figma修正API呼び出しエラー', { frameId, error });
    return {
      id: '',
      violationId: violation.id,
      category: fixMapping.category,
      fixType: fixMapping.fixType,
      frameName,
      figmaNodeId: frameId,
      status: AutoFixStatus.FAILED,
      beforeValue,
      afterValue,
      errorMessage: error.message,
    };
  }
}

// =====================================
// ルールID → 修正マッピング
// =====================================

interface FixMapping {
  category: AutoFixCategory;
  fixType: AutoFixType;
}

function getRuleToFixMapping(ruleId: string): FixMapping | null {
  const mappings: Record<string, FixMapping> = {
    AUTO_LAYOUT_REQUIRED: {
      category: AutoFixCategory.AUTO_LAYOUT,
      fixType: AutoFixType.ADD_AUTO_LAYOUT,
    },
    ABSOLUTE_POSITIONING: {
      category: AutoFixCategory.AUTO_LAYOUT,
      fixType: AutoFixType.ADD_AUTO_LAYOUT,
    },
    FIXED_SIZE_DETECTED: {
      category: AutoFixCategory.SIZE_CONSTRAINT,
      fixType: AutoFixType.CHANGE_TO_FILL,
    },
    WRAP_DISABLED: {
      category: AutoFixCategory.AUTO_LAYOUT,
      fixType: AutoFixType.ENABLE_WRAP,
    },
    NON_SEMANTIC_NAME: {
      category: AutoFixCategory.NAMING,
      fixType: AutoFixType.RENAME_SEMANTIC,
    },
  };

  return mappings[ruleId] || null;
}

// =====================================
// 修正前後の値生成
// =====================================

function generateFixValues(
  fixType: AutoFixType,
  violation: any
): { beforeValue: any; afterValue: any } {
  switch (fixType) {
    case AutoFixType.ADD_AUTO_LAYOUT:
      return {
        beforeValue: { layoutMode: 'NONE' },
        afterValue: {
          layoutMode: 'HORIZONTAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO',
          itemSpacing: 16,
        },
      };

    case AutoFixType.CHANGE_TO_FILL:
      return {
        beforeValue: { layoutSizing: 'FIXED' },
        afterValue: { layoutSizing: 'FILL' },
      };

    case AutoFixType.ENABLE_WRAP:
      return {
        beforeValue: { layoutWrap: 'NO_WRAP' },
        afterValue: { layoutWrap: 'WRAP' },
      };

    case AutoFixType.RENAME_SEMANTIC:
      return {
        beforeValue: { name: violation.frameName },
        afterValue: { name: suggestSemanticName(violation.frameName) },
      };

    default:
      return {
        beforeValue: {},
        afterValue: {},
      };
  }
}

function suggestSemanticName(currentName: string): string {
  if (currentName.match(/^Frame \d+$/)) return 'Section';
  if (currentName.match(/^Rectangle \d+$/)) return 'Container';
  if (currentName.match(/^Group \d+$/)) return 'Content';
  return currentName;
}