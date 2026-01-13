/**
 * FIGLEAN Frontend - Dashboard（メイン画面）
 * パス: /dashboard
 * ワイヤーフレーム: figlean-wireframe-complete.html に基づく実装
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import * as projectsApi from '@/lib/api/projects';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import type { Project } from '@/types/models';

// =====================================
// ダッシュボードページ
// =====================================

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プロジェクト一覧取得
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await projectsApi.getProjects({ offset: 0, limit: 20 });
      
      // APIレスポンスの形式に応じて適切にプロジェクトを取得
      const projectsData = (response as any).projects || (response as any).items || [];
      
      setProjects(projectsData);
    } catch (error: any) {
      console.error('プロジェクト取得エラー:', error);
      setError('プロジェクトの取得に失敗しました');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // プロジェクト作成成功時のハンドラー
  const handleProjectCreated = (projectId: string) => {
    // モーダルを閉じる
    setIsCreateModalOpen(false);
    
    // プロジェクト一覧を再取得
    fetchProjects();
    
    // プロジェクト詳細ページへ遷移
    router.push(`/projects/${projectId}`);
  };

  // スコアの色を取得
  const getScoreColor = (score: number | null) => {
    if (!score) return '#94a3b8';
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#d97706';
    return '#ef4444';
  };

  // ステータスのラベルを取得
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '待機中',
      IMPORTING: 'インポート中',
      ANALYZING: '解析中',
      COMPLETED: '完了',
      FAILED: '失敗',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between px-6 shadow-lg">
        <div className="text-2xl font-extrabold">FIGLEAN</div>
        <div className="flex items-center gap-4">
          {/* Figma接続状態 */}
          {user?.hasFigmaToken ? (
            <div className="flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              Figma Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              Figma Not Connected
            </div>
          )}
          {/* ユーザー情報 */}
          <div className="bg-gray-700 px-3 py-1.5 rounded-full text-sm">
            {user?.name || user?.email}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Figmaデザインを診断して、最適なHTMLコードを生成しましょう
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* 新規プロジェクト作成 */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-white rounded-2xl p-8 shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 text-left"
          >
            <div className="text-5xl mb-4">➕</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              新規プロジェクト
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Figmaデザインをインポートして診断を開始します
            </p>
          </button>

          {/* Figma連携設定 */}
          <button
            onClick={() => router.push('/settings/figma')}
            className="bg-white rounded-2xl p-8 shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 text-left"
          >
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Figma連携設定
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Figmaトークンを設定してファイルにアクセスします
            </p>
          </button>

          {/* ドキュメント */}
          <button
            onClick={() => window.open('https://docs.figlean.com', '_blank')}
            className="bg-white rounded-2xl p-8 shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 text-left"
          >
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ドキュメント
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              使い方ガイドとAPIリファレンスを確認します
            </p>
          </button>
        </div>

        {/* Projects Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            最近のプロジェクト
          </h2>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-semibold">⚠️ エラー</span>
                <span className="text-red-800">{error}</span>
              </div>
              <button
                onClick={fetchProjects}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-semibold underline"
              >
                再試行
              </button>
            </div>
          )}

          {/* ローディング状態 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <>
              {/* プロジェクトなし */}
              {(!projects || projects.length === 0) ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    プロジェクトがありません
                  </h3>
                  <p className="text-gray-600 mb-6">
                    新規プロジェクトを作成してFigmaデザインを診断しましょう
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    プロジェクトを作成
                  </button>
                </div>
              ) : (
                /* プロジェクト一覧表示 */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 text-left"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base font-bold text-gray-900 flex-1 pr-2">
                          {project.name}
                        </h3>
                        {project.score !== null && (
                          <div
                            className="text-2xl font-black"
                            style={{ color: getScoreColor(project.score) }}
                          >
                            {project.score}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 mb-3">
                        {project.figmaFileName || 'Figma File'} ・{' '}
                        {getStatusLabel(project.status)}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {project.score !== null && project.score >= 90 && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            HTML生成可能
                          </span>
                        )}
                        {project.score !== null && project.score === 100 && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                            Grid生成可能
                          </span>
                        )}
                        {project.status === 'COMPLETED' && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            診断完了
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Project Modal - 実装済みコンポーネントを使用 */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}