// =====================================
// ファイルパス: frontend/src/app/(protected)/projects/[id]/page.tsx
// 概要: プロジェクト詳細ページ - ページング・フィルター対応版
// 機能説明:
//   - プロジェクト基本情報表示
//   - タブナビゲーション（概要/違反/崩壊/提案/生成）
//   - ルール違反一覧（ページング、フィルター、一括コメント投稿）
//   - 崩壊予測一覧
//   - 改善提案一覧
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - ページング機能追加、コメント投稿済みフィルター追加、一括投稿エラー対策
// 依存関係:
//   - react
//   - next/navigation
//   - @/lib/api/projects
//   - @/lib/api/analysis
//   - @/lib/api/figma
//   - @/store/authStore
//   - @/lib/logger
// =====================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import * as projectsApi from '@/lib/api/projects';
import * as analysisApi from '@/lib/api/analysis';
import * as figmaApi from '@/lib/api/figma';
import type { Project, Violation, Prediction, Suggestion } from '@/types/models';
import logger from '@/lib/logger';

// ローカル型定義（API専用）
interface AnalysisResult {
  figleanScore: number;
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

// =====================================
// 型定義
// =====================================

type TabType = 'overview' | 'violations' | 'predictions' | 'suggestions' | 'generate';

interface ViolationsResponse {
  violations: RuleViolation[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// =====================================
// プロジェクト詳細ページ
// =====================================

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const projectId = params.id;

  // プロジェクト情報
  const [project, setProject] = useState<Project | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // タブ管理
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // 違反データ
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationsTotal, setViolationsTotal] = useState(0);
  const [violationsLoading, setViolationsLoading] = useState(false);

  // ページング・フィルター
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [commentPostedFilter, setCommentPostedFilter] = useState<string>('ALL');

  // 崩壊予測データ
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // 改善提案データ
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // 一括コメント投稿
  const [isBulkPosting, setIsBulkPosting] = useState(false);
  const [bulkPostProgress, setBulkPostProgress] = useState<{
    current: number;
    total: number;
    successCount: number;
    failureCount: number;
  } | null>(null);

  // =====================================
  // データ取得
  // =====================================

  useEffect(() => {
    fetchProjectAndAnalysis();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'violations') {
      fetchViolations();
    } else if (activeTab === 'predictions') {
      fetchPredictions();
    } else if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab, currentPage, itemsPerPage, severityFilter, commentPostedFilter]);

  const fetchProjectAndAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      logger.info('プロジェクト読み込み開始', { projectId });

      // プロジェクト取得
      const projectResponse = await projectsApi.getProjectById(projectId);
      setProject(projectResponse);

      // 診断結果取得
      const analysisResponse = await analysisApi.getAnalysisSummary(projectId);
      setAnalysisResult(analysisResponse.data);

      logger.success('プロジェクト読み込み完了', { projectId });
    } catch (error: any) {
      console.error('プロジェクト読み込みエラー:', error);
      logger.error('プロジェクト読み込みエラー', error);
      setError('プロジェクトの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      setViolationsLoading(true);
      logger.info('タブデータ読み込み開始: violations', { projectId, currentPage, itemsPerPage });

      const offset = (currentPage - 1) * itemsPerPage;
      
      const params: any = {
        limit: itemsPerPage,
        offset
      };

      if (severityFilter !== 'ALL') {
        params.severity = severityFilter;
      }

      if (commentPostedFilter !== 'ALL') {
        params.commentPosted = commentPostedFilter === 'POSTED' ? 'true' : 'false';
      }

      const response = await analysisApi.getViolations(projectId, params);
      setViolations(response.data.violations);
      setViolationsTotal(response.data.total);

      logger.success('タブデータ読み込み完了: violations', { 
        projectId, 
        count: response.data.violations.length,
        total: response.data.total
      });
    } catch (error: any) {
      console.error('違反データ取得エラー:', error);
      logger.error('違反データ取得エラー', error);
    } finally {
      setViolationsLoading(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      logger.info('タブデータ読み込み開始: predictions', { projectId });

      const response = await analysisApi.getPredictions(projectId);
      setPredictions(response.data.predictions);

      logger.success('タブデータ読み込み完了: predictions', { 
        projectId, 
        count: response.data.predictions.length 
      });
    } catch (error: any) {
      console.error('崩壊予測取得エラー:', error);
      logger.error('崩壊予測取得エラー', error);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      logger.info('タブデータ読み込み開始: suggestions', { projectId });

      const response = await analysisApi.getSuggestions(projectId);
      setSuggestions(response.data.suggestions);

      logger.success('タブデータ読み込み完了: suggestions', { 
        projectId, 
        count: response.data.suggestions.length 
      });
    } catch (error: any) {
      console.error('改善提案取得エラー:', error);
      logger.error('改善提案取得エラー', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // =====================================
  // ページネーション
  // =====================================

  const totalPages = Math.ceil(violationsTotal / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // ページをリセット
  };

  // =====================================
  // コメント投稿
  // =====================================

  const handleSingleCommentPost = async (violationId: string) => {
    try {
      logger.info('個別コメント投稿開始', { projectId, violationId });
      await figmaApi.postFigmaComment(projectId, violationId);
      logger.success('個別コメント投稿成功', { projectId, violationId });
      
      // データ再取得
      await fetchViolations();
      alert('Figmaにコメントを投稿しました！');
    } catch (error: any) {
      console.error('個別コメント投稿エラー:', error);
      logger.error('個別コメント投稿失敗', error, { projectId, violationId });
      alert('コメント投稿に失敗しました');
    }
  };

  const handleBulkPostComments = async () => {
    if (!confirm('未投稿のルール違反すべてにFigmaコメントを一括投稿しますか？\n※大量の違反がある場合は時間がかかります')) {
      return;
    }

    try {
      setIsBulkPosting(true);
      logger.info('一括コメント投稿開始', { projectId });

      // 未投稿の違反数を取得
      const unpostedResponse = await analysisApi.getViolations(projectId, {
        commentPosted: 'false',
        limit: 1000
      });
      const unpostedCount = unpostedResponse.data.total;

      setBulkPostProgress({
        current: 0,
        total: unpostedCount,
        successCount: 0,
        failureCount: 0
      });

      // Backend APIで一括投稿（レート制限対策済み）
      const response = await fetch(`/api/figma/comments/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          includeFixSteps: true,
          includeDetectedValue: true,
          language: 'ja'
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      
      logger.success('一括コメント投稿完了', { 
        projectId,
        successCount: result.data.successCount,
        failureCount: result.data.failureCount
      });

      setBulkPostProgress({
        current: result.data.totalViolations,
        total: result.data.totalViolations,
        successCount: result.data.successCount,
        failureCount: result.data.failureCount
      });

      // データ再取得
      await fetchViolations();

      if (result.data.failureCount > 0) {
        alert(
          `一括コメント投稿が完了しました。\n` +
          `成功: ${result.data.successCount}件\n` +
          `失敗: ${result.data.failureCount}件\n\n` +
          `※失敗した投稿はFigma APIのレート制限が原因の可能性があります。\n` +
          `しばらく時間を置いてから再度お試しください。`
        );
      } else {
        alert(`一括コメント投稿が完了しました！\n成功: ${result.data.successCount}件`);
      }

    } catch (error: any) {
      console.error('一括コメント投稿エラー:', error);
      logger.error('一括コメント投稿失敗', error, { projectId });
      alert('一括コメント投稿に失敗しました。\nしばらく時間を置いてから再度お試しください。');
    } finally {
      setIsBulkPosting(false);
      setBulkPostProgress(null);
    }
  };

  // =====================================
  // レンダリング
  // =====================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
              >
                ← ダッシュボードに戻る
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Figmaファイル: {project.figmaFileName || 'N/A'}
              </p>
            </div>
            
            {analysisResult && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">FIGLEANスコア</p>
                <p className={`text-5xl font-bold ${
                  analysisResult.figleanScore >= 90 ? 'text-green-600' :
                  analysisResult.figleanScore >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {analysisResult.figleanScore}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 概要' },
              { id: 'violations', label: `⚠️ 違反${analysisResult ? ` ${analysisResult.violations.critical + analysisResult.violations.major + analysisResult.violations.minor}` : ''}` },
              { id: 'predictions', label: '🔮 崩壊予測' },
              { id: 'suggestions', label: '💡 改善提案' },
              { id: 'generate', label: '🚀 コード生成' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  logger.component('ProjectDetailPage - Tab Changed: ' + tab.id, { tab: tab.id });
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {analysisResult ? (
              <div className="space-y-6">
                {/* HTML生成可否 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">生成機能</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                診断結果がまだありません
              </div>
            )}
          </div>
        )}

        {/* 違反タブ */}
        {activeTab === 'violations' && (
          <div className="space-y-6">
            {/* フィルター・ページング制御 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* 左側: フィルター */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* 重要度フィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      重要度
                    </label>
                    <select
                      value={severityFilter}
                      onChange={(e) => {
                        setSeverityFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">すべて</option>
                      <option value="CRITICAL">🔴 重大</option>
                      <option value="MAJOR">🟡 警告</option>
                      <option value="MINOR">🔵 軽微</option>
                    </select>
                  </div>

                  {/* コメント投稿済みフィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      コメント投稿
                    </label>
                    <select
                      value={commentPostedFilter}
                      onChange={(e) => {
                        setCommentPostedFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">すべて</option>
                      <option value="NOT_POSTED">未投稿のみ</option>
                      <option value="POSTED">投稿済みのみ</option>
                    </select>
                  </div>

                  {/* 表示件数 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      表示件数
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="20">20件</option>
                      <option value="30">30件</option>
                      <option value="50">50件</option>
                    </select>
                  </div>
                </div>

                {/* 右側: 一括投稿ボタン */}
                <div>
                  <button
                    onClick={handleBulkPostComments}
                    disabled={isBulkPosting || violations.length === 0}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isBulkPosting || violations.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isBulkPosting ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        投稿中...
                      </span>
                    ) : (
                      '💬 一括コメント投稿'
                    )}
                  </button>
                </div>
              </div>

              {/* 進捗表示 */}
              {bulkPostProgress && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    投稿進捗: {bulkPostProgress.current} / {bulkPostProgress.total}
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkPostProgress.current / bulkPostProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-800">
                    成功: {bulkPostProgress.successCount} / 失敗: {bulkPostProgress.failureCount}
                  </p>
                </div>
              )}

              {/* 表示情報 */}
              <div className="mt-4 text-sm text-gray-600">
                全 {violationsTotal} 件中 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, violationsTotal)} 件を表示
              </div>
            </div>

            {/* 違反リスト */}
            {violationsLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : violations.length > 0 ? (
              <div className="space-y-4">
                {violations.map((violation) => (
                  <div key={violation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* ヘッダー */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            violation.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            violation.severity === 'MAJOR' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {violation.severity === 'CRITICAL' ? '🔴 重大' :
                             violation.severity === 'MAJOR' ? '🟡 警告' : '🔵 軽微'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {violation.ruleCategory}
                          </span>
                          {violation.commentPosted && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              ✓ 投稿済み
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {violation.frameName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          ルール: {violation.ruleName}
                        </p>
                      </div>
                    </div>

                    {/* 説明 */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-700">{violation.description}</p>
                      {violation.impact && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">影響:</span> {violation.impact}
                        </p>
                      )}
                    </div>

                    {/* 提案 */}
                    {violation.suggestion && (
                      <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-indigo-900 mb-1">💡 推奨</p>
                        <p className="text-sm text-indigo-800">{violation.suggestion}</p>
                      </div>
                    )}

                    {/* アクション */}
                    <div className="flex items-center gap-4">
                      {!violation.commentPosted && violation.frameId && (
                        <button
                          onClick={() => handleSingleCommentPost(violation.id)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          💬 Figmaにコメント投稿
                        </button>
                      )}
                      {violation.commentPosted && violation.figmaCommentId && (
                        <a
                          href={`https://www.figma.com/file/${project.figmaFileKey}?node-id=${violation.frameId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          🔗 Figmaで確認
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                ルール違反はありません
              </div>
            )}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  ← 前へ
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  次へ →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 崩壊予測タブ */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            {predictionsLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : predictions.length > 0 ? (
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <div key={prediction.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            prediction.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                            prediction.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {prediction.riskLevel === 'HIGH' ? '🔴 高リスク' :
                             prediction.riskLevel === 'MEDIUM' ? '🟡 中リスク' : '🟢 低リスク'}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {prediction.frameName}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{prediction.riskDescription}</p>
                    {prediction.recommendation && (
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-yellow-900 mb-1">💡 推奨対策</p>
                        <p className="text-sm text-yellow-800">{prediction.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                崩壊予測データはありません
              </div>
            )}
          </div>
        )}

        {/* 改善提案タブ */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {suggestionsLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={suggestion.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {suggestion.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            スコア改善: +{suggestion.scoreImprovement}点 | 
                            所要時間: {suggestion.estimatedTime} | 
                            難易度: {suggestion.difficulty}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">{suggestion.description}</p>
                    {suggestion.actionSteps && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">🛠️ 実施手順</p>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                          {JSON.parse(suggestion.actionSteps).map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                改善提案データはありません
              </div>
            )}
          </div>
        )}

        {/* 生成タブ */}
        {activeTab === 'generate' && (
          <div className="text-center py-20 text-gray-500">
            コード生成機能は開発中です
          </div>
        )}
      </div>
    </div>
  );
}