// =====================================
// ファイルパス: backend/src/services/autofixPreviewService.ts
// 概要: AutoFix修正プレビュー生成サービス
// 機能説明: 違反項目から修正内容をプレビュー生成、スコア予測計算
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: 新規作成
// 依存関係: PrismaClient, types/autofix, utils/logger
// =====================================

import { PrismaClient } from '@prisma/client';
import {
  AutoFixPreviewRequestDto,
  AutoFixPreviewResponseDto,
  AutoFixPreviewItem,
  AutoFixCategory,
  AutoFixType,
  ViolationToFixMapping,
} from '../../types/autofix';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// =====================================
// プレビュー生成メイン処理
// =====================================

export async function generatePreview(
  projectId: string,
  userId: string,
  request: AutoFixPreviewRequestDto
): Promise<AutoFixPreviewResponseDto> {
  logger.info('AutoFix プレビュー生成開始', {
    projectId,
    userId,
    violationCount: request.violationIds.length,
  });

  // 1. プロジェクト情報取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      figleanScore: true,
      figmaFileKey: true,
      figmaFileUrl: true,
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // 2. 違反情報取得
  const violations = await prisma.ruleViolation.findMany({
    where: {
      id: { in: request.violationIds },
      projectId,
    },
    select: {
      id: true,
      ruleId: true,
      severity: true,
      frameName: true,
      frameId: true,
      scoreImpact: true,
    },
  });

  if (violations.length === 0) {
    throw new Error('No violations found');
  }

  // 3. 各違反を修正内容にマッピング
  const previewItems: AutoFixPreviewItem[] = [];

  for (const violation of violations) {
    const mapping = await mapViolationToFix(
      violation,
      project.figmaFileKey!
    );

    if (mapping) {
      previewItems.push({
        violationId: violation.id,
        category: mapping.category,
        fixType: mapping.fixType,
        frameName: violation.frameName,
        figmaNodeId: mapping.figmaNodeId,
        beforeValue: mapping.beforeValue,
        afterValue: mapping.afterValue,
        description: generateFixDescription(mapping),
      });
    }
  }

  // 4. スコア予測計算
  const totalScoreImpact = violations.reduce(
    (sum, v) => sum + (v.scoreImpact || 0),
    0
  );
  const expectedScore = Math.min(100, project.figleanScore + totalScoreImpact);

  // 5. 推定実行時間計算（1修正あたり2秒と仮定）
  const estimatedTime = previewItems.length * 2;

  logger.info('AutoFix プレビュー生成完了', {
    projectId,
    previewItemCount: previewItems.length,
    expectedScoreDelta: totalScoreImpact,
  });

  return {
    projectId,
    previewItems,
    totalCount: previewItems.length,
    estimatedTime,
    beforeScore: project.figleanScore,
    expectedScore,
    scoreDelta: totalScoreImpact,
  };
}

// =====================================
// 違反→修正内容マッピング
// =====================================

async function mapViolationToFix(
  violation: any,
  figmaFileKey: string
): Promise<ViolationToFixMapping | null> {
  const { ruleId, frameId } = violation;

  // ルールIDに応じて修正カテゴリとタイプを決定
  const mapping = getRuleToFixMapping(ruleId);
  if (!mapping) {
    logger.warn('修正マッピング未定義', { ruleId });
    return null;
  }

  // Figma Node IDはframeIdから抽出（形式: "123:456"）
  const figmaNodeId = frameId;

  // 修正前後の値を生成
  const { beforeValue, afterValue } = generateFixValues(
    mapping.fixType,
    violation
  );

  return {
    violationId: violation.id,
    ruleId,
    severity: violation.severity,
    frameId,
    frameName: violation.frameName,
    figmaFileKey,
    figmaNodeId,
    category: mapping.category,
    fixType: mapping.fixType,
    beforeValue,
    afterValue,
  };
}

// =====================================
// ルールID → 修正マッピング定義
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
        beforeValue: { layoutSizing: 'FIXED', width: 'FIXED' },
        afterValue: { layoutSizing: 'FILL', width: 'FILL' },
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

// =====================================
// セマンティック命名提案
// =====================================

function suggestSemanticName(currentName: string): string {
  // 簡易的な命名提案（実際はより高度なロジックが必要）
  if (currentName.match(/^Frame \d+$/)) {
    return 'Section';
  }
  if (currentName.match(/^Rectangle \d+$/)) {
    return 'Container';
  }
  if (currentName.match(/^Group \d+$/)) {
    return 'Content';
  }
  return currentName;
}

// =====================================
// 修正内容説明生成
// =====================================

function generateFixDescription(mapping: ViolationToFixMapping): string {
  const { fixType, frameName, beforeValue, afterValue } = mapping;

  switch (fixType) {
    case AutoFixType.ADD_AUTO_LAYOUT:
      return `${frameName} に Auto Layout を追加: ${afterValue.layoutMode}`;

    case AutoFixType.CHANGE_TO_FILL:
      return `${frameName} の Width を FILL に変更`;

    case AutoFixType.ENABLE_WRAP:
      return `${frameName} の Wrap を有効化`;

    case AutoFixType.RENAME_SEMANTIC:
      return `${frameName} を "${afterValue.name}" にリネーム`;

    default:
      return `${frameName} を修正`;
  }
}