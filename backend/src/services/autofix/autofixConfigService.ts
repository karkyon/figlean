// =====================================
// ファイルパス: backend/src/services/autofix/autofixConfigService.ts
// 概要: AutoFix設定管理サービス
// 機能説明: ユーザーごとの自動修正設定の取得・更新
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: TypeScriptエラー完全修正
// 依存関係: PrismaClient, types/autofix, utils/logger
// =====================================

import { PrismaClient } from '@prisma/client';
import {
  AutoFixConfigDto,
  UpdateAutoFixConfigDto,
  AutoFixType,
} from '../../types/autofix';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// =====================================
// デフォルト設定
// =====================================

const DEFAULT_CONFIG: AutoFixConfigDto = {
  enableAutoLayout: true,
  enableSizeConstraint: true,
  enableNaming: true,
  enableComponent: false,
  enableStyle: false,
  enabledFixTypes: {
    [AutoFixType.ADD_AUTO_LAYOUT]: true,
    [AutoFixType.CHANGE_DIRECTION]: true,
    [AutoFixType.SET_GAP]: true,
    [AutoFixType.ENABLE_WRAP]: true,
    [AutoFixType.CHANGE_TO_FILL]: true,
    [AutoFixType.CHANGE_TO_HUG]: true,
    [AutoFixType.REMOVE_FIXED_SIZE]: true,
    [AutoFixType.RENAME_SEMANTIC]: true,
    [AutoFixType.CREATE_COMPONENT]: false,
    [AutoFixType.DETACH_INSTANCE]: false,
    [AutoFixType.UNIFY_COLORS]: false,
    [AutoFixType.UNIFY_TYPOGRAPHY]: false,
  },
  autoDeleteComments: false,
};

// =====================================
// AutoFix設定取得
// =====================================

export async function getAutoFixConfig(userId: string): Promise<AutoFixConfigDto> {
  logger.info('AutoFix設定取得', { userId });

  const config = await prisma.autoFixConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    // 設定が存在しない場合はデフォルトを返す
    logger.info('AutoFix設定未作成、デフォルトを返却', { userId });
    return DEFAULT_CONFIG;
  }

  return {
    enableAutoLayout: config.enableAutoLayout,
    enableSizeConstraint: config.enableSizeConstraint,
    enableNaming: config.enableNaming,
    enableComponent: config.enableComponent,
    enableStyle: config.enableStyle,
    enabledFixTypes: config.enabledFixTypes as Record<AutoFixType, boolean>,
    autoDeleteComments: config.autoDeleteComments,
  };
}

// =====================================
// AutoFix設定更新
// =====================================

export async function updateAutoFixConfig(
  userId: string,
  update: UpdateAutoFixConfigDto
): Promise<AutoFixConfigDto> {
  logger.info('AutoFix設定更新', { userId, update });

  // 既存設定取得
  const existingConfig = await prisma.autoFixConfig.findUnique({
    where: { userId },
  });

  if (!existingConfig) {
    // 新規作成
    const created = await prisma.autoFixConfig.create({
      data: {
        userId,
        enableAutoLayout: update.enableAutoLayout ?? DEFAULT_CONFIG.enableAutoLayout,
        enableSizeConstraint: update.enableSizeConstraint ?? DEFAULT_CONFIG.enableSizeConstraint,
        enableNaming: update.enableNaming ?? DEFAULT_CONFIG.enableNaming,
        enableComponent: update.enableComponent ?? DEFAULT_CONFIG.enableComponent,
        enableStyle: update.enableStyle ?? DEFAULT_CONFIG.enableStyle,
        enabledFixTypes: update.enabledFixTypes ?? DEFAULT_CONFIG.enabledFixTypes,
        autoDeleteComments: update.autoDeleteComments ?? DEFAULT_CONFIG.autoDeleteComments,
      },
    });

    logger.info('AutoFix設定作成完了', { userId, configId: created.id });

    return {
      enableAutoLayout: created.enableAutoLayout,
      enableSizeConstraint: created.enableSizeConstraint,
      enableNaming: created.enableNaming,
      enableComponent: created.enableComponent,
      enableStyle: created.enableStyle,
      enabledFixTypes: created.enabledFixTypes as Record<AutoFixType, boolean>,
      autoDeleteComments: created.autoDeleteComments,
    };
  }

  // 更新
  const updatedConfig = await prisma.autoFixConfig.update({
    where: { userId },
    data: {
      enableAutoLayout: update.enableAutoLayout ?? existingConfig.enableAutoLayout,
      enableSizeConstraint: update.enableSizeConstraint ?? existingConfig.enableSizeConstraint,
      enableNaming: update.enableNaming ?? existingConfig.enableNaming,
      enableComponent: update.enableComponent ?? existingConfig.enableComponent,
      enableStyle: update.enableStyle ?? existingConfig.enableStyle,
      enabledFixTypes: update.enabledFixTypes
        ? { ...(existingConfig.enabledFixTypes as any), ...update.enabledFixTypes }
        : existingConfig.enabledFixTypes,
      autoDeleteComments: update.autoDeleteComments ?? existingConfig.autoDeleteComments,
    },
  });

  logger.info('AutoFix設定更新完了', { userId, configId: updatedConfig.id });

  return {
    enableAutoLayout: updatedConfig.enableAutoLayout,
    enableSizeConstraint: updatedConfig.enableSizeConstraint,
    enableNaming: updatedConfig.enableNaming,
    enableComponent: updatedConfig.enableComponent,
    enableStyle: updatedConfig.enableStyle,
    enabledFixTypes: updatedConfig.enabledFixTypes as Record<AutoFixType, boolean>,
    autoDeleteComments: updatedConfig.autoDeleteComments,
  };
}

// =====================================
// AutoFix設定リセット
// =====================================

export async function resetAutoFixConfig(userId: string): Promise<AutoFixConfigDto> {
  logger.info('AutoFix設定リセット', { userId });

  // 既存設定削除
  await prisma.autoFixConfig.deleteMany({
    where: { userId },
  });

  // デフォルト設定で新規作成
  const created = await prisma.autoFixConfig.create({
    data: {
      userId,
      ...DEFAULT_CONFIG,
    },
  });

  logger.info('AutoFix設定リセット完了', { userId, configId: created.id });

  return {
    enableAutoLayout: created.enableAutoLayout,
    enableSizeConstraint: created.enableSizeConstraint,
    enableNaming: created.enableNaming,
    enableComponent: created.enableComponent,
    enableStyle: created.enableStyle,
    enabledFixTypes: created.enabledFixTypes as Record<AutoFixType, boolean>,
    autoDeleteComments: created.autoDeleteComments,
  };
}

// =====================================
// 特定修正タイプの有効/無効切り替え
// =====================================

export async function toggleFixType(
  userId: string,
  fixType: AutoFixType,
  enabled: boolean
): Promise<AutoFixConfigDto> {
  logger.info('修正タイプ切り替え', { userId, fixType, enabled });

  const config = await getAutoFixConfig(userId);

  config.enabledFixTypes[fixType] = enabled;

  return await updateAutoFixConfig(userId, {
    enabledFixTypes: config.enabledFixTypes,
  });
}