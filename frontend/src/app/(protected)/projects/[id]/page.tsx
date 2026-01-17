/**
 * FIGLEAN Frontend - プロジェクト詳細ページ（AutoFix統合版）
 * ファイルパス: frontend/src/app/(protected)/projects/[id]/page.tsx
 * 
 * 機能:
 * - プロジェクト基本情報表示
 * - FIGLEAN適合度スコア表示
 * - タブナビゲーション（概要 / 違反 / 崩壊予測 / 改善提案 / 生成 / AutoFix履歴）
 * - 診断結果カード表示
 * - HTML生成機能（Generator Tab）
 * - Figmaコメント一括投稿機能
 * - AutoFix機能（個別修正・一括修正・履歴・Rollback）
 * - ローディング状態管理
 * - エラーハンドリング
 * 
 * 作成日: 2026年1月13日
 * 更新日: 2026年1月17日 - AutoFix機能統合
 * 依存関係: @/components/ui/Button, @/components/analysis/*, @/components/autofix/*, @/lib/api/client
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ViolationActionButtons } from '@/components/analysis/ViolationActionButtons';
import { PredictionCard } from '@/components/analysis/PredictionCard';
import { SuggestionCard } from '@/components/analysis/SuggestionCard';
import GeneratorTab from '@/components/project/GeneratorTab';
import { AutoFixPreviewModal } from '@/components/autofix/AutoFixPreviewModal';
import { AutoFixHistoryPanel } from '@/components/autofix/AutoFixHistoryPanel';
import { Project, Violation, Prediction, Suggestion } from '@/types/models';
import type { AutoFixExecuteResponse } from '@/types/autofix';
import apiClient from '@/lib/api/client';
import { logger } from '@/lib/logger';

// =====================================
// ローカル型定義（API専用）
// =====================================

interface AnalysisResult {
  figleanScore: number;
  layoutScore: number;
  componentScore: number;
  responsiveScore: number;
  semanticScore: number;
  canGenerateHTML: boolean;
  canUseGrid: boolean;
  violations: {
    critical: number;
    major: number;
    minor: number;
  };
  totalFrames: number;
  analyzedAt: string;
}

type Tab = 'overview' | 'violations' | 'predictions' | 'suggestions' | 'generator' | 'autofix';

// =====================================
// メインコンポーネント
// =====================================

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationsTotal, setViolationsTotal] = useState<number>(0);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Figmaコメント一括投稿状態
  const [isBulkPosting, setIsBulkPosting] = useState(false);

  // 再解析状態
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // 違反フィルター・ページング状態
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'MAJOR' | 'MINOR'>('ALL');
  const [commentPostedFilter, setCommentPostedFilter] = useState<'ALL' | 'POSTED' | 'NOT_POSTED'>('ALL');
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // AutoFix状態
  const [selectedViolationIds, setSelectedViolationIds] = useState<string[]>([]);
  const [isAutoFixModalOpen, setIsAutoFixModalOpen] = useState(false);
  const [autoFixDeleteComments, setAutoFixDeleteComments] = useState(false);

  // 詳細開閉状態
  const [openDetailIds, setOpenDetailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) {
      logger.component('ProjectDetailPage', 'Mount', { projectId });
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    logger.component('ProjectDetailPage', `Tab Changed: ${activeTab}`, { projectId, activeTab });
    if (activeTab !== 'overview' && activeTab !== 'generator' && activeTab !== 'autofix') {
      loadTabData();
    }
  }, [activeTab]);

  const loadProject = async () => {
    try {
      logger.info('プロジェクト読み込み開始', { projectId });
      setIsLoading(true);
      setError(null);

      logger.api('GET', `/projects/${projectId}`);
      const projectResponse = await apiClient.get(`/projects/${projectId}`);
      setProject(projectResponse.data.data);
      logger.apiSuccess('GET', `/projects/${projectId}`, { project: projectResponse.data.data });

      try {
        logger.api('GET', `/analysis/${projectId}`);
        const analysisResponse = await apiClient.get(`/analysis/${projectId}`);
        setAnalysisResult(analysisResponse.data.data);
        logger.apiSuccess('GET', `/analysis/${projectId}`, { analysisResult: analysisResponse.data.data });
      } catch (analysisError: any) {
        if (analysisError.response?.status !== 404) {
          logger.apiError('GET', `/analysis/${projectId}`, analysisError);
          console.error('Failed to load analysis:', analysisError);
        } else {
          logger.warn('解析結果が見つかりません', { projectId });
        }
      }

      logger.success('プロジェクト読み込み完了', { projectId });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'プロジェクトの読み込みに失敗しました';
      logger.error('プロジェクト読み込み失敗', err, { projectId, errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!projectId) return;

    try {
      logger.info(`タブデータ読み込み開始: ${activeTab}`, { projectId, activeTab });
      setIsLoadingTab(true);

      if (activeTab === 'violations') {
        logger.api('GET', `/analysis/${projectId}/violations`);
        const response = await apiClient.get(`/analysis/${projectId}/violations`);
        
        setViolations(response.data.data.violations || []);
        setViolationsTotal(response.data.data.total || 0);
        
        logger.apiSuccess('GET', `/analysis/${projectId}/violations`, { 
          count: response.data.data.violations?.length || 0,
          total: response.data.data.total || 0
        });
      } else if (activeTab === 'predictions') {
        logger.api('GET', `/analysis/${projectId}/predictions`);
        const response = await apiClient.get(`/analysis/${projectId}/predictions`);
        setPredictions(response.data.data.predictions || []);
        logger.apiSuccess('GET', `/analysis/${projectId}/predictions`, { count: response.data.data.predictions?.length || 0 });
      } else if (activeTab === 'suggestions') {
        logger.api('GET', `/analysis/${projectId}/suggestions`);
        const response = await apiClient.get(`/analysis/${projectId}/suggestions`);
        setSuggestions(response.data.data.suggestions || []);
        logger.apiSuccess('GET', `/analysis/${projectId}/suggestions`, { count: response.data.data.suggestions?.length || 0 });
      }

      logger.success(`タブデータ読み込み完了: ${activeTab}`, { projectId, activeTab });
    } catch (err: any) {
      logger.apiError('GET', `/analysis/${projectId}/${activeTab}`, err);
      console.error(`Failed to load ${activeTab}:`, err);
    } finally {
      setIsLoadingTab(false);
    }
  };

  // 再解析実行
  const handleReanalyze = async () => {
    if (!projectId) return;

    const confirmed = confirm(
      'プロジェクトの再解析を実行しますか?\n\nFigmaデータを再取得し、FIGLEAN適合度スコアを再計算します。'
    );

    if (!confirmed) return;

    try {
      setIsReanalyzing(true);
      logger.info('再解析開始', { projectId });

      await apiClient.post(`/analysis/${projectId}/reanalyze`);

      alert('再解析が完了しました');
      logger.success('再解析完了', { projectId });

      await loadProject();
      if (activeTab !== 'overview' && activeTab !== 'generator' && activeTab !== 'autofix') {
        await loadTabData();
      }
    } catch (error: any) {
      console.error('再解析エラー:', error);
      const errorMessage = error.response?.data?.error?.message || '再解析に失敗しました';
      alert(errorMessage);
      logger.error('再解析失敗', error, { projectId, errorMessage });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const filteredViolations = violations.filter(v => {
    if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false;
    if (commentPostedFilter === 'POSTED' && !v.commentPosted) return false;
    if (commentPostedFilter === 'NOT_POSTED' && v.commentPosted) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredViolations.length / itemsPerPage);

  const paginatedViolations = filteredViolations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Figmaコメント一括投稿
  const handleBulkPostComments = async () => {
    if (!projectId || !violations.length) return;

    const confirmed = confirm(
      `全 ${violations.length} 件のルール違反をFigmaにコメント投稿しますか?\n\n※投稿済みの違反は除外されます`
    );

    if (!confirmed) return;

    try {
      setIsBulkPosting(true);
      logger.info('一括コメント投稿開始', { projectId, violationCount: violations.length });

      await apiClient.post(`/figma/comments/${projectId}`, {
        includeFixSteps: true,
        includeDetectedValue: true,
        language: 'ja'
      });

      await loadTabData();

      alert('Figmaコメントの一括投稿が完了しました');
      logger.success('一括コメント投稿完了', { projectId });
    } catch (error: any) {
      console.error('一括コメント投稿エラー:', error);
      alert('一括コメント投稿に失敗しました');
      logger.error('一括コメント投稿失敗', error, { projectId });
    } finally {
      setIsBulkPosting(false);
    }
  };

  // AutoFix: 違反選択トグル
  const handleToggleViolationSelect = (violationId: string) => {
    setSelectedViolationIds(prev => {
      if (prev.includes(violationId)) {
        return prev.filter(id => id !== violationId);
      } else {
        return [...prev, violationId];
      }
    });
  };

  // AutoFix: 全選択/全解除
  const handleToggleSelectAll = () => {
    if (selectedViolationIds.length === paginatedViolations.length) {
      setSelectedViolationIds([]);
    } else {
      setSelectedViolationIds(paginatedViolations.map(v => v.id));
    }
  };

  // AutoFix: 一括修正実行
  const handleBulkAutoFix = () => {
    if (selectedViolationIds.length === 0) {
      alert('修正する違反を選択してください');
      return;
    }
    setIsAutoFixModalOpen(true);
  };

  // AutoFix: 修正成功時
  const handleAutoFixSuccess = async (result: AutoFixExecuteResponse) => {
    logger.success('AutoFix修正完了', { 
      historyId: result.historyId,
      successCount: result.successCount,
      failedCount: result.failedCount,
    });

    alert(`🔧 AutoFix完了\n\n成功: ${result.successCount}件\n失敗: ${result.failedCount}件`);

    // 違反リストとプロジェクト情報を再読み込み
    await loadProject();
    await loadTabData();

    // 選択状態をリセット
    setSelectedViolationIds([]);
  };

  // AutoFix: エラー時
  const handleAutoFixError = (error: string) => {
    logger.error('AutoFix修正エラー', new Error(error), { projectId });
    alert(`❌ AutoFix失敗\n\n${error}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'プロジェクトが見つかりません'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
        >
          ← 戻る
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <a
                href={`https://www.figma.com/file/${project.figmaFileKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                🔗 Figmaで開く
              </a>
              <span>📊 最終解析: {analysisResult ? new Date(analysisResult.analyzedAt).toLocaleDateString('ja-JP') : '未解析'}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                project.analysisStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                project.analysisStatus === 'ANALYZING' ? 'bg-blue-100 text-blue-800' :
                project.analysisStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.analysisStatus === 'COMPLETED' ? '完了' :
                 project.analysisStatus === 'ANALYZING' ? '解析中' :
                 project.analysisStatus === 'FAILED' ? '失敗' : '未解析'}
              </span>
            </div>
          </div>

          <Button 
            variant="primary"
            onClick={handleReanalyze}
            disabled={isReanalyzing}
          >
            {isReanalyzing ? '再解析中...' : '🔄 再解析'}
          </Button>
        </div>
      </div>

      {/* FIGLEAN適合度スコア */}
      {project.figleanScore !== null && (
        <div className="bg-white rounded-lg border p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <h3 className="text-sm text-gray-600 mb-2">FIGLEAN適合度</h3>
              <div className={`text-4xl font-bold ${
                project.figleanScore >= 90 ? 'text-green-600' :
                project.figleanScore >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {project.figleanScore}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {project.figleanScore < 70 ? '⚠️ 改善推奨' : ''}
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-sm text-gray-600 mb-2">Layout</h3>
              <div className="text-3xl font-bold text-gray-900">
                {project.layoutScore || '-'}
              </div>
              <p className="text-xs text-gray-500 mt-1">レイアウト設計</p>
            </div>

            <div className="text-center">
              <h3 className="text-sm text-gray-600 mb-2">Component</h3>
              <div className="text-3xl font-bold text-gray-900">
                {project.componentScore || '-'}
              </div>
              <p className="text-xs text-gray-500 mt-1">コンポーネント化</p>
            </div>

            <div className="text-center">
              <h3 className="text-sm text-gray-600 mb-2">Responsive</h3>
              <div className="text-3xl font-bold text-gray-900">
                {project.responsiveScore || '-'}
              </div>
              <p className="text-xs text-gray-500 mt-1">レスポンシブ対応</p>
            </div>

            <div className="text-center">
              <h3 className="text-sm text-gray-600 mb-2">Semantic</h3>
              <div className="text-3xl font-bold text-gray-900">
                {project.semanticScore || '-'}
              </div>
              <p className="text-xs text-gray-500 mt-1">セマンティック</p>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="mb-6">
        <nav className="flex gap-6 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 概要
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'violations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⚠️ 違反
            {analysisResult && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {analysisResult.violations.critical + analysisResult.violations.major + analysisResult.violations.minor}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'predictions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔮 崩壊予測
            {predictions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                {predictions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'suggestions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💡 改善提案
            {suggestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                {suggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'generator'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎨 生成
          </button>
          <button
            onClick={() => setActiveTab('autofix')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'autofix'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔧 AutoFix履歴
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-lg border p-6 shadow-sm min-h-[400px]">
        {isLoadingTab ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-600">読み込み中...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview タブ */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">診断サマリー</h2>
                
                {analysisResult ? (
                  <div className="space-y-6">
                    {/* 解析情報 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">解析フレーム数</p>
                        <p className="text-2xl font-bold text-gray-900">{analysisResult.totalFrames}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">HTML生成</p>
                        <p className="text-2xl font-bold">
                          {analysisResult.canGenerateHTML ? '✅ 可能' : '⚠️ 要改善'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Grid変換</p>
                        <p className="text-2xl font-bold">
                          {analysisResult.canUseGrid ? '✅ 可能' : '❌ 不可'}
                        </p>
                      </div>
                    </div>

                    {/* 違反統計 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">ルール違反統計</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <p className="text-sm text-red-800 mb-1">🔴 重大</p>
                          <p className="text-3xl font-bold text-red-600">
                            {analysisResult.violations.critical}
                          </p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <p className="text-sm text-yellow-800 mb-1">🟡 警告</p>
                          <p className="text-3xl font-bold text-yellow-600">
                            {analysisResult.violations.major}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-sm text-blue-800 mb-1">🔵 軽微</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {analysisResult.violations.minor}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 次のステップ */}
                    <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                      <h3 className="text-lg font-semibold text-indigo-900 mb-3">
                        💡 次のステップ
                      </h3>
                      <ul className="space-y-2 text-sm text-indigo-800">
                        <li>• 違反タブで詳細なルール違反を確認</li>
                        <li>• 🔧 AutoFixで自動修正を実行して即座にスコア改善</li>
                        <li>• 崩壊予測タブで崩れリスクを把握</li>
                        <li>• 改善提案タブで改善提案を確認</li>
                        {analysisResult.canGenerateHTML && (
                          <li>• 生成タブで実際のHTMLコードを生成</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-lg mb-2">解析結果がまだありません</p>
                    <p className="text-sm">プロジェクトの解析を実行してください</p>
                  </div>
                )}
              </div>
            )}

            {/* Violations タブ */}
            {activeTab === 'violations' && (
              <div className="space-y-6">

                {/* フィルター・ページング */}
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex flex-wrap items-end justify-between gap-4">

                    <div className="flex flex-wrap gap-4">
                      {/* 重要度 */}
                      <div>
                        <label className="block text-sm font-medium mb-1">重要度</label>
                        <select
                          value={severityFilter}
                          onChange={(e) => {
                            setSeverityFilter(e.target.value as any);
                            setCurrentPage(1);
                          }}
                          className="border rounded-lg px-3 py-2"
                        >
                          <option value="ALL">すべて</option>
                          <option value="CRITICAL">🔴 重大</option>
                          <option value="MAJOR">🟡 警告</option>
                          <option value="MINOR">🔵 軽微</option>
                        </select>
                      </div>

                      {/* コメント */}
                      <div>
                        <label className="block text-sm font-medium mb-1">コメント投稿</label>
                        <select
                          value={commentPostedFilter}
                          onChange={(e) => {
                            setCommentPostedFilter(e.target.value as any);
                            setCurrentPage(1);
                          }}
                          className="border rounded-lg px-3 py-2"
                        >
                          <option value="ALL">すべて</option>
                          <option value="NOT_POSTED">未投稿のみ</option>
                          <option value="POSTED">投稿済みのみ</option>
                        </select>
                      </div>

                      {/* 表示件数 */}
                      <div>
                        <label className="block text-sm font-medium mb-1">表示件数</label>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setItemsPerPage(value);
                            setCurrentPage(1);
                          }}
                          className="border rounded-lg px-3 py-2"
                        >
                          <option value={5}>5件</option>
                          <option value={20}>20件</option>
                          <option value={30}>30件</option>
                          <option value={50}>50件</option>
                        </select>
                      </div>
                    </div>

                    {/* 表示情報 */}
                    <div className="text-sm text-gray-600">
                      全 {violationsTotal} 件中{' '}
                      {filteredViolations.length > 0 
                        ? `${Math.min((currentPage - 1) * itemsPerPage + 1, filteredViolations.length)} – ${Math.min(currentPage * itemsPerPage, filteredViolations.length)}`
                        : '0'
                      } 件を表示
                    </div>
                  </div>
                </div>

                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">ルール違反一覧</h2>

                    {/* 全選択チェックボックス */}
                    {paginatedViolations.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedViolationIds.length === paginatedViolations.length && paginatedViolations.length > 0}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">
                          全選択 ({selectedViolationIds.length}件)
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* AutoFix一括修正ボタン */}
                    {selectedViolationIds.length > 0 && (
                      <button
                        onClick={handleBulkAutoFix}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        🔧 AutoFix ({selectedViolationIds.length}件)
                      </button>
                    )}

                    {/* Figmaコメント一括投稿 */}
                    <button
                      onClick={handleBulkPostComments}
                      disabled={isBulkPosting || violations.length === 0}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isBulkPosting ? '投稿中...' : '💬 Figmaに一括投稿'}
                    </button>
                  </div>
                </div>

                {/* 一覧 */}
                {paginatedViolations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {paginatedViolations.map(v => {
                      const isDetailOpen = openDetailIds.has(v.id);

                      const toggleDetail = () => {
                        setOpenDetailIds(prev => {
                          const next = new Set(prev);
                          if (next.has(v.id)) {
                            next.delete(v.id);
                          } else {
                            next.add(v.id);
                          }
                          return next;
                        });
                      };

                      return (
                        <div key={v.id} className="bg-white border rounded-lg p-4 hover:border-gray-300 transition-colors">
                          {/* ヘッダー部分: チェックボックス + タイトル + アクションボタン */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            {/* 左: チェックボックス + タイトル */}
                            <div className="flex items-start gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedViolationIds.includes(v.id)}
                                onChange={() => handleToggleViolationSelect(v.id)}
                                className="mt-1 w-4 h-4 rounded border-gray-300 cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    v.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                    v.severity === 'MAJOR' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {v.severity === 'CRITICAL' ? '🔴 重大' :
                                     v.severity === 'MAJOR' ? '🟡 警告' : '🔵 軽微'}
                                  </span>
                                  <span className="text-xs text-gray-500">{v.ruleCategory}</span>
                                  {v.commentPosted && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700 border border-green-200">
                                      ✓ Figmaコメント投稿済み
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-gray-900">{v.ruleName}</h3>
                                <p className="text-sm text-gray-600 mt-1">{v.description}</p>
                              </div>
                            </div>

                            {/* 右: アクションボタン */}
                            <div className="flex items-center gap-2">
                              <ViolationActionButtons
                                violation={v}
                                projectId={projectId}
                                project={project}
                                onSuccess={async () => {
                                  await loadProject();
                                  await loadTabData();
                                }}
                                onError={handleAutoFixError}
                              />
                              <button
                                onClick={toggleDetail}
                                className="px-3 py-1.5 text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                              >
                                <span>{isDetailOpen ? '▼' : '▶'}</span>
                                <span>詳細</span>
                              </button>
                            </div>
                          </div>

                          {/* 詳細情報（開閉可能） */}
                          {isDetailOpen && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {v.frameName && (
                                <div className="text-sm">
                                  <span className="text-gray-600 font-medium">対象フレーム: </span>
                                  <span className="text-gray-900">{v.frameName}</span>
                                </div>
                              )}
                              {v.detectedValue && (
                                <div className="text-sm">
                                  <span className="text-gray-600 font-medium">検出値: </span>
                                  <span className="text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                                    {v.detectedValue}
                                  </span>
                                </div>
                              )}
                              {v.expectedValue && (
                                <div className="text-sm">
                                  <span className="text-gray-600 font-medium">期待値: </span>
                                  <span className="text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                                    {v.expectedValue}
                                  </span>
                                </div>
                              )}
                              {v.impact && (
                                <div className="text-sm">
                                  <span className="text-gray-600 font-medium">影響: </span>
                                  <span className="text-gray-900">{v.impact}</span>
                                </div>
                              )}
                              {v.suggestion && (
                                <div className="text-sm">
                                  <span className="text-gray-600 font-medium">提案: </span>
                                  <span className="text-gray-900">{v.suggestion}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    条件に一致する違反はありません
                  </div>
                )}

                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1 text-sm font-medium"
                      title="最初のページ"
                    >
                      <span className="text-gray-600">⏮</span>
                    </button>

                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                    >
                      ← 前へ
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[40px] h-[40px] rounded-lg border transition-all duration-200 text-sm font-medium ${
                                  page === currentPage
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                    >
                      次へ →
                    </button>

                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1 text-sm font-medium"
                      title="最後のページ"
                    >
                      <span className="text-gray-600">⏭</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Predictions タブ */}
            {activeTab === 'predictions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">崩壊予測</h2>
                  {predictions.length > 0 && (
                    <p className="text-sm text-gray-600">
                      全 {predictions.length} 件
                    </p>
                  )}
                </div>

                {predictions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {predictions.map((prediction) => (
                      <PredictionCard key={prediction.id} prediction={prediction} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-lg mb-2">✅ 崩壊予測はありません</p>
                    <p className="text-sm">レスポンシブ対応が適切です!</p>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions タブ */}
            {activeTab === 'suggestions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">改善提案</h2>
                  {suggestions.length > 0 && (
                    <p className="text-sm text-gray-600">
                      全 {suggestions.length} 件
                    </p>
                  )}
                </div>

                {suggestions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {suggestions.map((suggestion) => (
                      <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-lg mb-2">✅ 改善提案はありません</p>
                    <p className="text-sm">最高レベルのデザイン品質です!</p>
                  </div>
                )}
              </div>
            )}

            {/* Generator タブ */}
            {activeTab === 'generator' && <GeneratorTab project={project} />}

            {/* AutoFix履歴タブ */}
            {activeTab === 'autofix' && (
              <AutoFixHistoryPanel
                projectId={projectId}
                onRollbackSuccess={async () => {
                  await loadProject();
                  // 違反データを再読み込み（違反タブに戻った時のため）
                  const currentTab = activeTab;
                  setActiveTab('violations');
                  await loadTabData();
                  setActiveTab(currentTab);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* AutoFixプレビューモーダル */}
      <AutoFixPreviewModal
        projectId={projectId}
        violationIds={selectedViolationIds}
        isOpen={isAutoFixModalOpen}
        onClose={() => setIsAutoFixModalOpen(false)}
        onSuccess={handleAutoFixSuccess}
        onError={handleAutoFixError}
        deleteComments={autoFixDeleteComments}
      />
    </div>
  );
}