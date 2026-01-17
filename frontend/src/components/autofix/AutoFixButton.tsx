// =====================================
// ファイルパス: frontend/src/components/autofix/AutoFixButton.tsx
// 概要: 個別修正実行ボタン
// 機能説明: ViolationCard内に配置する個別AutoFixボタン
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 初回作成
// 依存関係: @/lib/api/autofix, @/components/ui/Button
// =====================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { executeIndividualAutoFix } from '@/lib/api/autofix';
import { logger } from '@/lib/logger';

interface AutoFixButtonProps {
  projectId: string;
  violationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  deleteComments?: boolean;
}

export function AutoFixButton({
  projectId,
  violationId,
  onSuccess,
  onError,
  deleteComments = false,
}: AutoFixButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleAutoFix = async () => {
    setIsExecuting(true);

    try {
      logger.info('[AutoFixButton] 個別修正実行開始', {
        projectId,
        violationId,
      });

      const result = await executeIndividualAutoFix(
        projectId,
        violationId,
        deleteComments
      );

      logger.info('[AutoFixButton] 個別修正実行成功', { result });

      if (result.successCount > 0) {
        onSuccess?.();
      } else {
        onError?.('修正に失敗しました');
      }
    } catch (error: any) {
      logger.error('[AutoFixButton] 個別修正実行エラー', { error });
      onError?.(error.message || '修正に失敗しました');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleAutoFix}
      disabled={isExecuting}
    >
      {isExecuting ? '🔧 AutoFix 修正中...' : '🔧 AutoFix'}
    </Button>
  );
}