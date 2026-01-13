/**
 * FIGLEAN Frontend - プロジェクト作成モーダル
 * ファイルパス: frontend/src/components/project/CreateProjectModal.tsx
 * 
 * 3ステップウィザード形式のプロジェクト作成モーダル
 * Step 1: プロジェクト情報入力
 * Step 2: Figmaファイル選択
 * Step 3: 確認とインポート
 * 
 * 修正履歴:
 * - 2026-01-12: フォーカス問題修正（Step Content を関数からJSXに変更）
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FigmaFileSelector } from './FigmaFileSelector';
import { useProjectStore } from '@/store/projectStore';
import { pollImportJobStatus } from '@/lib/api/figma';
import type { CreateProjectStep1Data, CreateProjectStep2Data } from '@/types/figma';

// =====================================
// 型定義
// =====================================

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

type WizardStep = 1 | 2 | 3;

// =====================================
// メインコンポーネント
// =====================================

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const router = useRouter();
  const { createProject } = useProjectStore();

  // =====================================
  // State管理
  // =====================================

  // ステップ管理
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // ステップ1のデータ
  const [step1Data, setStep1Data] = useState<CreateProjectStep1Data>({
    name: '',
    description: '',
    importSource: 'figma',
  });

  // ステップ2のデータ
  const [step2Data, setStep2Data] = useState<CreateProjectStep2Data>({
    figmaFileKey: '',
    figmaFileUrl: '',
    selectedPages: [],
    selectedFrames: [],
  });

  // バリデーションエラー
  const [errors, setErrors] = useState<Record<string, string>>({});

  // インポート状態
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');

  // =====================================
  // Effect
  // =====================================

  // モーダルが閉じられたらリセット
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setStep1Data({ name: '', description: '', importSource: 'figma' });
      setStep2Data({
        figmaFileKey: '',
        figmaFileUrl: '',
        selectedPages: [],
        selectedFrames: [],
      });
      setErrors({});
      setIsImporting(false);
      setImportError(null);
      setImportProgress(0);
      setImportMessage('');
    }
  }, [isOpen]);

  // =====================================
  // バリデーション
  // =====================================

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!step1Data.name.trim()) {
      newErrors.name = 'プロジェクト名を入力してください';
    } else if (step1Data.name.length > 100) {
      newErrors.name = 'プロジェクト名は100文字以内で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =====================================
  // イベントハンドラー
  // =====================================

  /**
   * 次のステップへ進む
   */
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  /**
   * 前のステップへ戻る
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  /**
   * Figmaファイル選択時のハンドラー
   */
  const handleFileSelect = (file: any) => {
    setStep2Data((prev) => ({
      ...prev,
      figmaFileKey: file.key,
      figmaFileUrl: `https://www.figma.com/file/${file.key}`,
    }));
  };

  /**
   * インポート実行ハンドラー
   */
  const handleImport = async () => {
    try {
      setIsImporting(true);
      setImportError(null);
      setImportProgress(0);
      setImportMessage('プロジェクトを作成中...');

      // プロジェクト作成 + Figmaインポート開始
      const { projectId, jobId } = await createProject({
        name: step1Data.name,
        description: step1Data.description,
        figmaFileKey: step2Data.figmaFileKey,
        figmaFileUrl: step2Data.figmaFileUrl,
      });

      setImportProgress(20);
      setImportMessage('Figmaファイルをインポート中...');

      // ジョブステータスをポーリング
      await pollImportJobStatus(
        jobId,
        (status) => {
          // 進捗更新
          setImportProgress(status.progress.percentage);
          setImportMessage(status.progress.currentStep);
        },
        2000 // 2秒ごとにポーリング
      );

      setImportProgress(100);
      setImportMessage('完了！');

      // 成功時: プロジェクト詳細ページへ遷移
      setTimeout(() => {
        onSuccess(projectId);
        onClose();
        router.push(`/projects/${projectId}`);
      }, 1000);
    } catch (error: any) {
      console.error('プロジェクト作成エラー:', error);
      setImportError(
        error.response?.data?.error?.message ||
          error.message ||
          'プロジェクトの作成に失敗しました。もう一度お試しください。'
      );
      setImportProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  // =====================================
  // レンダリング
  // =====================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新規プロジェクト作成"
      size="lg"
    >
      {/* =====================================
          ステップインジケーター
          ===================================== */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            {/* ステップ円 */}
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold
                ${
                  step === currentStep
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : step < currentStep
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }
              `}
            >
              {step < currentStep ? '✓' : step}
            </div>

            {/* 接続線 */}
            {step < 3 && (
              <div
                className={`
                  w-16 h-1 mx-2
                  ${step < currentStep ? 'bg-green-600' : 'bg-gray-300'}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* =====================================
          コンテンツエリア
          ===================================== */}
      <div className="mb-8">
        {/* =====================================
            Step 1: プロジェクト情報入力
            ===================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                プロジェクト情報を入力
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                新しいFigmaプロジェクトの基本情報を入力してください。
              </p>
            </div>

            {/* プロジェクト名 */}
            <div>
              <Input
                label="プロジェクト名"
                value={step1Data.name}
                onChange={(e) =>
                  setStep1Data((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="例: ランディングページデザイン"
                error={errors.name}
                required
              />
            </div>

            {/* 説明（オプション） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明（オプション）
              </label>
              <textarea
                value={step1Data.description}
                onChange={(e) =>
                  setStep1Data((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="プロジェクトの説明を入力..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* インポート元選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                インポート元
              </label>
              <div className="space-y-3">
                {/* Figmaデザイン */}
                <label className="flex items-center p-4 border-2 border-blue-600 bg-blue-50 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="importSource"
                    value="figma"
                    checked={step1Data.importSource === 'figma'}
                    onChange={(e) =>
                      setStep1Data((prev) => ({
                        ...prev,
                        importSource: e.target.value as 'figma' | 'image',
                      }))
                    }
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🎨</span>
                      <span className="font-semibold text-gray-900">
                        Figmaデザイン
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-10">
                      Figmaファイルからインポート（推奨）
                    </p>
                  </div>
                </label>

                {/* 画像アップロード（Future機能） */}
                <label className="flex items-center p-4 border-2 border-gray-300 bg-gray-50 rounded-lg cursor-not-allowed opacity-60">
                  <input
                    type="radio"
                    name="importSource"
                    value="image"
                    disabled
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">🖼️</span>
                      <span className="font-semibold text-gray-500">
                        画像アップロード
                      </span>
                      <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                        準備中
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 ml-10">
                      画像ファイルからインポート（将来対応予定）
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* =====================================
            Step 2: Figmaファイル選択
            ===================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Figmaファイルを選択
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                インポートするFigmaファイルを選択してください。
              </p>
            </div>

            {/* Figmaファイル選択コンポーネント */}
            <FigmaFileSelector
              onSelect={handleFileSelect}
              selectedFileKey={step2Data.figmaFileKey}
            />

            {/* オプション: フレーム選択の案内 */}
            {step2Data.figmaFileKey && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-xl mr-2">💡</span>
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">ヒント</p>
                    <p className="text-blue-700">
                      選択したファイルの全フレームが自動的に解析されます。
                      特定のフレームのみを解析したい場合は、後から設定できます。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================
            Step 3: 確認とインポート
            ===================================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                内容を確認してインポート
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                以下の内容でプロジェクトを作成し、Figmaファイルをインポートします。
              </p>
            </div>

            {/* 確認情報 */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              {/* プロジェクト名 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">プロジェクト名</p>
                <p className="font-semibold text-gray-900">{step1Data.name}</p>
              </div>

              {/* 説明 */}
              {step1Data.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">説明</p>
                  <p className="text-sm text-gray-700">{step1Data.description}</p>
                </div>
              )}

              {/* Figmaファイル */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Figmaファイル</p>
                <div className="flex items-center">
                  <span className="text-xl mr-2">🎨</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {step2Data.figmaFileKey}
                    </p>
                    <a
                      href={step2Data.figmaFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Figmaで開く →
                    </a>
                  </div>
                </div>
              </div>

              {/* インポート設定 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">インポート設定</p>
                <p className="text-sm text-gray-700">
                  全フレームを自動解析
                </p>
              </div>
            </div>

            {/* 進捗表示 */}
            {isImporting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="animate-spin mr-2">⏳</div>
                  <p className="text-sm font-semibold text-blue-900">
                    {importMessage}
                  </p>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-700 mt-1">{importProgress}%</p>
              </div>
            )}

            {/* エラー表示 */}
            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-xl mr-2">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-red-900">エラー</p>
                    <p className="text-sm text-red-700 mt-1">{importError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-xl mr-2">⏱️</span>
                <div className="text-sm">
                  <p className="font-semibold text-yellow-900 mb-1">お知らせ</p>
                  <p className="text-yellow-700">
                    インポートと解析には数分かかる場合があります。
                    完了すると、プロジェクト詳細ページに自動的に移動します。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================
          フッターボタン
          ===================================== */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="secondary"
          onClick={currentStep === 1 ? onClose : handleBack}
          disabled={isImporting}
        >
          {currentStep === 1 ? 'キャンセル' : '戻る'}
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={handleNext}
            disabled={currentStep === 2 && !step2Data.figmaFileKey}
          >
            次へ
          </Button>
        ) : (
          <Button onClick={handleImport} isLoading={isImporting} disabled={isImporting}>
            {isImporting ? 'インポート中...' : 'インポート開始'}
          </Button>
        )}
      </div>
    </Modal>
  );
}