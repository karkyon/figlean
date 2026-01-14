/**
 * FIGLEAN Frontend - プロジェクト詳細ページ
 * ファイルパス: frontend/src/app/(protected)/projects/[id]/page.tsx
 * 
 * 機能:
 * - プロジェクト基本情報表示
 * - FIGLEAN適合度スコア表示
 * - タブナビゲーション（Overview / Violations / Predictions / Suggestions）
 * 
 * 作成日: 2026年1月13日
 * 修正日: 2026年1月14日 - API呼び出しをapiClient経由に修正
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api/client';

// =====================================
// 型定義
// =====================================

interface Project {
  id: string;
  name: string;
  figmaFileUrl: string;
  figmaFileKey: string;
  figleanScore: number | null;
  layoutScore: number | null;
  componentScore: number | null;
  responsiveScore: number | null;
  semanticScore: number | null;
  analysisStatus: string;
  htmlGeneratable: boolean;
  lastAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisResult {
  id: string;
  projectId: string;
  figleanScore: number;
  layoutScore: number;
  componentScore: number;
  responsiveScore: number;
  semanticScore: number;
  totalFrames: number;
  analyzedFrames: number;
  totalViolations: number;
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
  htmlGeneratable: boolean;
  generatableReason: string | null;
  analysisTimeMs: number;
  createdAt: string;
}

interface Violation {
  id: string;
  frameName: string;
  ruleId: string;
  ruleName: string;
  ruleCategory: string;
  severity: string;
  description: string;
  impact: string | null;
  suggestion: string | null;
  commentPosted: boolean;
}

interface Prediction {
  id: string;
  frameName: string;
  breakType: string;
  likelihood: number;
  impact: string;
  triggerCondition: string;
  description: string;
}

interface Suggestion {
  id: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  expectedImprovement: string | null;
  implementationSteps: string | null;
  affectedFramesCount: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =====================================
  // データ取得
  // =====================================

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // プロジェクト基本情報取得（修正: apiClient経由で取得）
      const projectRes = await apiClient.get(`/projects/${projectId}`);

      if (projectRes.data.success) {
        setProject(projectRes.data.data);
      } else {
        throw new Error('プロジェクトの取得に失敗しました');
      }

      // 解析結果取得（修正: apiClient経由で取得）
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
      setIsLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await apiClient.get(`/analysis/${projectId}/violations`);
      if (res.data.success) {
        setViolations(res.data.data || []);
      }
    } catch (err) {
      console.error('ルール違反取得エラー:', err);
    }
  };

  const fetchPredictions = async () => {
    try {
      const res = await apiClient.get(`/analysis/${projectId}/predictions`);
      if (res.data.success) {
        setPredictions(res.data.data || []);
      }
    } catch (err) {
      console.error('崩壊予測取得エラー:', err);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await apiClient.get(`/analysis/${projectId}/suggestions`);
      if (res.data.success) {
        setSuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error('改善提案取得エラー:', err);
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

  if (isLoading) {
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
          <span className="text-4xl mb-4">❌</span>
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
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <a
            href={project.figmaFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline mr-4"
          >
            🔗 Figmaで開く
          </a>
          <span className="mr-4">
            最終解析: {project.lastAnalyzedAt ? new Date(project.lastAnalyzedAt).toLocaleString('ja-JP') : '未解析'}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              project.analysisStatus === 'COMPLETED'
                ? 'bg-green-100 text-green-800'
                : project.analysisStatus === 'IN_PROGRESS'
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
        <div className="bg-white border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* FIGLEAN適合度 */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">FIGLEAN適合度</div>
              <div
                className={`text-4xl font-bold ${
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
                {analysisResult.htmlGeneratable ? '✅ HTML生成可能' : '❌ 改善が必要'}
              </div>
            </div>

            {/* Layout Score */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Layout</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.layoutScore}</div>
            </div>

            {/* Component Score */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Component</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.componentScore}</div>
            </div>

            {/* Responsive Score */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Responsive</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.responsiveScore}</div>
            </div>

            {/* Semantic Score */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Semantic</div>
              <div className="text-3xl font-bold text-gray-900">{analysisResult.semanticScore}</div>
            </div>
          </div>

          {/* 違反数サマリー */}
          <div className="mt-6 pt-6 border-t grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{analysisResult.totalViolations}</div>
              <div className="text-xs text-gray-600">総違反数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{analysisResult.criticalViolations}</div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{analysisResult.majorViolations}</div>
              <div className="text-xs text-gray-600">Major</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{analysisResult.minorViolations}</div>
              <div className="text-xs text-gray-600">Minor</div>
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="bg-white border-b mb-6">
        <nav className="flex">
          {[
            { id: 'overview', label: '📊 概要', count: null },
            { id: 'violations', label: '⚠️ ルール違反', count: violations.length },
            { id: 'predictions', label: '🔮 崩壊予測', count: predictions.length },
            { id: 'suggestions', label: '💡 改善提案', count: suggestions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white border rounded-lg p-6">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-xl font-bold mb-4">プロジェクト概要</h2>
            {analysisResult ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">解析フレーム数</p>
                  <p className="text-lg font-semibold">
                    {analysisResult.analyzedFrames} / {analysisResult.totalFrames} frames
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">解析時間</p>
                  <p className="text-lg font-semibold">{(analysisResult.analysisTimeMs / 1000).toFixed(2)}秒</p>
                </div>
                {analysisResult.generatableReason && (
                  <div>
                    <p className="text-sm text-gray-600">HTML生成可否</p>
                    <p className="text-lg">{analysisResult.generatableReason}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600">解析結果がありません</p>
            )}
          </div>
        )}

        {activeTab === 'violations' && (
          <div>
            <h2 className="text-xl font-bold mb-4">ルール違反一覧</h2>
            {violations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frame</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ルール</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">深刻度</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">説明</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {violations.slice(0, 50).map((v) => (
                      <tr key={v.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{v.frameName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{v.ruleName}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              v.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-800'
                                : v.severity === 'MAJOR'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{v.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {violations.length > 50 && (
                  <p className="text-sm text-gray-600 mt-4 text-center">
                    最初の50件を表示中（全{violations.length}件）
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-600">ルール違反はありません</p>
            )}
          </div>
        )}

        {activeTab === 'predictions' && (
          <div>
            <h2 className="text-xl font-bold mb-4">崩壊予測</h2>
            {predictions.length > 0 ? (
              <div className="space-y-4">
                {predictions.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{p.frameName}</h3>
                      <span className="text-sm text-gray-600">{p.breakType}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{p.description}</p>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 mr-4">発生確率: {p.likelihood}%</span>
                      <span className="text-gray-600">影響度: {p.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">崩壊予測はありません</p>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div>
            <h2 className="text-xl font-bold mb-4">改善提案</h2>
            {suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((s) => (
                  <div key={s.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{s.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          s.priority === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : s.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{s.description}</p>
                    {s.expectedImprovement && (
                      <p className="text-sm text-green-600 mb-2">期待効果: {s.expectedImprovement}</p>
                    )}
                    <div className="text-xs text-gray-600">
                      影響フレーム数: {s.affectedFramesCount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">改善提案はありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}