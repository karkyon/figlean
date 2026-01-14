/**
 * FIGLEAN Frontend - プロジェクト詳細ページ（日本語化版）
 * ファイルパス: frontend/src/app/(protected)/projects/[id]/page.tsx
 * 
 * 機能:
 * - プロジェクト基本情報表示
 * - FIGLEAN適合度スコア表示
 * - タブナビゲーション（概要 / 違反 / 崩壊予測 / 改善提案 / 生成）
 * - 診断結果カード表示
 * - HTML生成機能（Generator Tab）
 * - ローディング状態管理
 * - エラーハンドリング
 * 
 * 作成日: 2026年1月13日
 * 更新日: 2026年1月14日 - 日本語化対応
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ViolationCard } from '@/components/analysis/ViolationCard';
import { PredictionCard } from '@/components/analysis/PredictionCard';
import { SuggestionCard } from '@/components/analysis/SuggestionCard';
import GeneratorTab from '@/components/project/GeneratorTab';
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

type Tab = 'overview' | 'violations' | 'predictions' | 'suggestions' | 'generator';

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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab !== 'overview' && activeTab !== 'generator') {
      loadTabData();
    }
  }, [activeTab]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const projectResponse = await apiClient.get(`/projects/${projectId}`);
      setProject(projectResponse.data.data);

      try {
        const analysisResponse = await apiClient.get(`/analysis/${projectId}`);
        setAnalysisResult(analysisResponse.data.data);
      } catch (analysisError: any) {
        if (analysisError.response?.status !== 404) {
          console.error('Failed to load analysis:', analysisError);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'プロジェクトの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!projectId) return;

    try {
      setIsLoadingTab(true);

      if (activeTab === 'violations') {
        const response = await apiClient.get(`/analysis/${projectId}/violations`);
        setViolations(response.data.data.violations || []);
      } else if (activeTab === 'predictions') {
        const response = await apiClient.get(`/analysis/${projectId}/predictions`);
        setPredictions(response.data.data.predictions || []);
      } else if (activeTab === 'suggestions') {
        const response = await apiClient.get(`/analysis/${projectId}/suggestions`);
        setSuggestions(response.data.data.suggestions || []);
      }
    } catch (err: any) {
      console.error(`Failed to load ${activeTab}:`, err);
    } finally {
      setIsLoadingTab(false);
    }
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
              <span>🔗 Figmaで開く</span>
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

          <Button variant="primary">
            再解析
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
                {project.figleanScore >= 90 ? '⚠️ 改善推奨' : ''}
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

            {/* Generator タブ */}
            {activeTab === 'generator' && <GeneratorTab project={project} />}
          </>
        )}
      </div>
    </div>
  );
}