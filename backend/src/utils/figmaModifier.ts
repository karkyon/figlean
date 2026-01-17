// =====================================
// ファイルパス: backend/src/utils/figmaModifier.ts
// 概要: Figma API修正ユーティリティ
// 機能説明: Figma APIを使用してノードを修正する処理
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: 戻り値の型を修正（successCount, errorCountに統一）
// 依存関係: axios, utils/logger
// =====================================

import axios, { AxiosError } from 'axios';
import logger from './logger';
import { FigmaNodeUpdate } from '../types/autofix';

const FIGMA_API_BASE_URL = 'https://api.figma.com/v1';

// =====================================
// Figmaノード修正
// =====================================

export async function modifyFigmaNodes(
  accessToken: string,
  fileKey: string,
  updates: FigmaNodeUpdate[]
): Promise<{ successCount: number; errorCount: number }> {
  logger.info('Figmaノード修正開始', { fileKey, updateCount: updates.length });

  const modifiedNodes: string[] = [];
  const errors: { nodeId: string; error: string }[] = [];

  for (const update of updates) {
    try {
      await modifyFigmaNode(accessToken, fileKey, update.nodeId, update.properties);
      modifiedNodes.push(update.nodeId);
      logger.info('Figmaノード修正成功', { fileKey, nodeId: update.nodeId });
    } catch (error: any) {
      logger.error('Figmaノード修正失敗', { fileKey, nodeId: update.nodeId, error });
      errors.push({
        nodeId: update.nodeId,
        error: error.message,
      });
    }
  }

  logger.info('Figmaノード修正完了', {
    fileKey,
    successCount: modifiedNodes.length,
    errorCount: errors.length,
  });

  return {
    successCount: modifiedNodes.length,
    errorCount: errors.length,
  };
}

// =====================================
// 単一ノード修正
// =====================================

async function modifyFigmaNode(
  accessToken: string,
  fileKey: string,
  nodeId: string,
  properties: Record<string, any>
): Promise<void> {
  const url = `${FIGMA_API_BASE_URL}/files/${fileKey}/nodes/${nodeId}`;

  try {
    const response = await axios.patch(
      url,
      { properties },
      {
        headers: {
          'X-Figma-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`Figma API returned status ${response.status}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('Figma API修正エラー', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        nodeId,
      });
      throw new Error(
        `Figma API error: ${axiosError.response?.status} - ${JSON.stringify(
          axiosError.response?.data
        )}`
      );
    }
    throw error;
  }
}

// =====================================
// コメント削除
// =====================================

export async function deleteComment(
  accessToken: string,
  fileKey: string,
  commentId: string
): Promise<void> {
  logger.info('Figmaコメント削除', { fileKey, commentId });

  const url = `${FIGMA_API_BASE_URL}/files/${fileKey}/comments/${commentId}`;

  try {
    const response = await axios.delete(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (response.status === 200 || response.status === 204) {
      logger.info('Figmaコメント削除成功', { fileKey, commentId });
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('Figmaコメント削除エラー', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        commentId,
      });
      throw new Error(
        `Figma comment delete error: ${
          axiosError.response?.status
        } - ${JSON.stringify(axiosError.response?.data)}`
      );
    }
    throw error;
  }
}

// =====================================
// Auto Layout設定
// =====================================

export interface AutoLayoutConfig {
  layoutMode: 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'AUTO' | 'FIXED';
  counterAxisSizingMode?: 'AUTO' | 'FIXED';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
}

export async function setAutoLayout(
  accessToken: string,
  fileKey: string,
  nodeId: string,
  config: AutoLayoutConfig
): Promise<void> {
  logger.info('Auto Layout設定', { fileKey, nodeId, config });

  await modifyFigmaNode(accessToken, fileKey, nodeId, {
    layoutMode: config.layoutMode,
    primaryAxisSizingMode: config.primaryAxisSizingMode || 'AUTO',
    counterAxisSizingMode: config.counterAxisSizingMode || 'AUTO',
    itemSpacing: config.itemSpacing || 0,
    paddingLeft: config.paddingLeft || 0,
    paddingRight: config.paddingRight || 0,
    paddingTop: config.paddingTop || 0,
    paddingBottom: config.paddingBottom || 0,
    layoutWrap: config.layoutWrap || 'NO_WRAP',
  });
}

// =====================================
// サイズ制約変更
// =====================================

export async function changeSizingMode(
  accessToken: string,
  fileKey: string,
  nodeId: string,
  mode: 'FILL' | 'HUG' | 'FIXED'
): Promise<void> {
  logger.info('サイズ制約変更', { fileKey, nodeId, mode });

  await modifyFigmaNode(accessToken, fileKey, nodeId, {
    layoutSizing: mode,
  });
}

// =====================================
// ノード名変更
// =====================================

export async function renameNode(
  accessToken: string,
  fileKey: string,
  nodeId: string,
  newName: string
): Promise<void> {
  logger.info('ノード名変更', { fileKey, nodeId, newName });

  await modifyFigmaNode(accessToken, fileKey, nodeId, {
    name: newName,
  });
}