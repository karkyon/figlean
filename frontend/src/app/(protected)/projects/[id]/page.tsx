/**
 * FIGLEAN Frontend - プロジェクト詳細ページ（Phase 1.6-1.8完全版・型修正版）
 * ファイルパス: frontend/src/app/(protected)/projects/[id]/page.tsx
 * 
 * 機能:
 * - プロジェクト基本情報表示
 * - FIGLEAN適合度スコア表示
 * - タブナビゲーション（Overview / Violations / Predictions / Suggestions）
 * - 診断結果カード表示
 * - ローディング状態管理
 * - エラーハンドリング
 * 
 * 作成日: 2026年1月13日
 * 更新日: 2026年1月14日 - Phase 1.6-1.8実装、型定義をmodels.tsに統一
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ViolationCard } from '@/components/analysis/ViolationCard';
import { PredictionCard } from '@/components/analysis/PredictionCard';
import { SuggestionCard } from '@/components/analysis/SuggestionCard';
import { Project, Violation, Prediction, Suggestion } from '@/types/models';
import apiClient from '@/lib/api/client';

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

type Tab = 'overview' | 'violations' | 'predictions' | 'suggestions';

// =====================================
// メインコンポーネント
// =====================================

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // =====================================
  // State管理
  // =====================================

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  // ローディング状態（タブ別）
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================
  // データ取得
  // =====================================

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    setIsLoadingProject(true);
    setError(null);

    try {
      // プロジェクト基本情報取得
      const projectRes = await apiClient.get(`/projects/${projectId}`);

      if (projectRes.data.success) {
        setProject(projectRes.data.data);
      } else {
        throw new Error('プロジェクトの取得に失敗しました');
      }

      // 解析結果取得
      try {
        const analysisRes = await apiClient.get(`/analysis/${projectId}`);
        
        if (analysisRes.data.success) {
          setAnalysisResult(analysisRes.data.data);
        }
      } catch (analysisErr) {
        // 解析結果が存在しない場合はエラーにしない
        console.log('解析結果なし:', analysisErr);
      }

    } catch (err: any) {
      console.error('データ取得エラー:', err);
      setError(err.message || 'データの取得に失敗しました');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const fetchViolations = async () => {
    if (violations.length > 0) return; // 既に取得済み

    setIsLoadingTab(true);
    try {
      const res = await apiClient.get(`/analysis/${projectId}/violations`);
      if (res.data.success) {
        // Backend response: { success: true, data: { violations: [], total: 1607 } }
        setViolations(res.data.data.violations || []);
      }
    } catch (err) {
      console.error('ルール違反取得エラー:', err);
    } finally {
      setIsLoadingTab(false);
    }
  };

  const fetchPredictions = async () => {
    if (predictions.length > 0) return; // 既に取得済み

    setIsLoadingTab(true);
    try {
      const res = await apiClient.get(`/analysis/${projectId}/predictions`);
      if (res.data.success) {
        // Backend response: { success: true, data: [...predictions] }
        setPredictions(res.data.data || []);
      }
    } catch (err) {
      console.error('崩壊予測取得エラー:', err);
    } finally {
      setIsLoadingTab(false);
    }
  };

  const fetchSuggestions = async () => {
    if (suggestions.length > 0) return; // 既に取得済み

    setIsLoadingTab(true);
    try {
      const res = await apiClient.get(`/analysis/${projectId}/suggestions`);
      if (res.data.success) {
        // Backend response: { success: true, data: [...suggestions] }
        setSuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error('改善提案取得エラー:', err);
    } finally {
      setIsLoadingTab(false);
    }
  };

  // タブ切り替え時にデータ取得
  useEffect(() => {
    if (activeTab === 'violations' && violations.length === 0) {
      fetchViolations();
    } else if (activeTab === 'predictions' && predictions.length === 0) {
      fetchPredictions();
    } else if (activeTab === 'suggestions' && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [activeTab]);

  // =====================================
  // レンダリング
  // =====================================

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">プロジェクトを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-4xl mb-4 block">❌</span>
          <p className="text-red-600 mb-4">{error || 'プロジェクトが見つかりません'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900 mr-4 transition-colors"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        </div>

        <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
          {project.figmaFileUrl && (
            <a
              href={project.figmaFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              🔗 Figmaで開く
            </a>
          )}
          <span>
            最終解析: {project.lastAnalyzedAt ? new Date(project.lastAnalyzedAt).toLocaleString('ja-JP') : '未解析'}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              project.analysisStatus === 'COMPLETED'
                ? 'bg-green-100 text-green-800'
                : project.analysisStatus === 'ANALYZING'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {project.analysisStatus}
          </span>
        </div>
      </div>

      {/* スコア表示 */}
      {analysisResult && (
        <div className="bg-white border rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* FIGLEAN適合度 */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">FIGLEAN適合度</div>
              <div
                className={`text-5xl font-bold mb-2 ${
                  analysisResult.figleanScore >= 90
                    ? 'text-green-600'
                    : analysisResult.figleanScore >= 70
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {analysisResult.figleanScore}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {analysisResult.canGenerateHTML ? '✅ HTML生成可能' : '⚠️ 改善推奨'}
              </div>
            </div>

            {/* Layout */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Layout</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.layoutScore}</div>
              <div className="text-xs text-gray-500 mt-1">レイアウト設計</div>
            </div>

            {/* Component */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Component</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.componentScore}</div>
              <div className="text-xs text-gray-500 mt-1">コンポーネント化</div>
            </div>

            {/* Responsive */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Responsive</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.responsiveScore}</div>
              <div className="text-xs text-gray-500 mt-1">レスポンシブ対応</div>
            </div>

            {/* Semantic */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Semantic</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.semanticScore}</div>
              <div className="text-xs text-gray-500 mt-1">セマンティック</div>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'violations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⚠️ Violations
            {analysisResult && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {analysisResult.violations.critical + analysisResult.violations.major + analysisResult.violations.minor}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'predictions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔮 Predictions
            {predictions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                {predictions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'suggestions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💡 Suggestions
            {suggestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                {suggestions.length}
              </span>
            )}
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
                        <li>• Violationsタブで詳細なルール違反を確認</li>
                        <li>• Predictionsタブで崩れリスクを把握</li>
                        <li>• Suggestionsタブで改善提案を確認</li>
                        {analysisResult.canGenerateHTML && (
                          <li>• HTML Generatorで実際のコードを生成（Phase 3実装予定）</li>
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
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">ルール違反一覧</h2>
                  {violations.length > 0 && (
                    <p className="text-sm text-gray-600">
                      全 {violations.length} 件
                    </p>
                  )}
                </div>

                {violations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {violations.map((violation) => (
                      <ViolationCard key={violation.id} violation={violation} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-lg mb-2">✅ ルール違反はありません</p>
                    <p className="text-sm">素晴らしいデザインです！</p>
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
                    <p className="text-sm">レスポンシブ対応が適切です！</p>
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
                    <p className="text-sm">最高レベルのデザイン品質です！</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}