/**
 * FIGLEAN Frontend - Dashboard（メイン画面）修正版
 * ファイルパス: frontend/src/app/(protected)/dashboard/page.tsx
 * 機能: プロジェクト一覧表示、フィルター・ソート・検索機能、ユーザーメニュー、Figma連携設定Modal
 * 作成日: 2026-01-13
 * 更新日: 2026-01-17 - DashboardHeader統合、フィルター初期状態Closed、FigmaSettingsModal追加
 * 依存関係: @/components/layout/DashboardHeader, @/components/settings/FigmaSettingsModal, @/lib/api/projects
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { FigmaSettingsModal } from '@/components/settings/FigmaSettingsModal';
import * as projectsApi from '@/lib/api/projects';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import type { Project } from '@/types/models';

// =====================================
// 型定義
// =====================================

type SortField = 'createdAt' | 'updatedAt' | 'figleanScore' | 'name';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'PENDING' | 'IMPORTING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

// =====================================
// ダッシュボードページ
// =====================================

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // プロジェクト関連
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // モーダル
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFigmaSettingsModalOpen, setIsFigmaSettingsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    projectId: string | null;
    projectName: string;
  }>({
    isOpen: false,
    projectId: null,
    projectName: '',
  });
  
  // フィルター・ソート・検索
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [scoreMin, setScoreMin] = useState<number | null>(null);
  const [scoreMax, setScoreMax] = useState<number | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false); // 初期状態: Closed

  // =====================================
  // データ取得
  // =====================================

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await projectsApi.getProjects({ offset: 0, limit: 100 });
      
      const projectsData = (response as any).projects || (response as any).items || [];
      
      setProjects(projectsData);
      setFilteredProjects(projectsData);
    } catch (error: any) {
      console.error('プロジェクト取得エラー:', error);
      setError('プロジェクトの取得に失敗しました');
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // フィルター・ソート処理
  // =====================================

  useEffect(() => {
    let result = [...projects];

    // 検索フィルター
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ステータスフィルター
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.analysisStatus === statusFilter);
    }

    // スコアフィルター
    if (scoreMin !== null) {
      result = result.filter((p) => p.figleanScore !== null && p.figleanScore >= scoreMin);
    }
    if (scoreMax !== null) {
      result = result.filter((p) => p.figleanScore !== null && p.figleanScore <= scoreMax);
    }

    // ソート
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'figleanScore':
          aValue = a.figleanScore ?? -1;
          bValue = b.figleanScore ?? -1;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredProjects(result);
  }, [projects, searchQuery, statusFilter, sortField, sortOrder, scoreMin, scoreMax]);

  // =====================================
  // 削除処理
  // =====================================

  const handleDeleteClick = (project: Project) => {
    setDeleteModal({
      isOpen: true,
      projectId: project.id,
      projectName: project.name || 'Unnamed Project',
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return;

    try {
      await projectsApi.deleteProject(deleteModal.projectId);
      await fetchProjects();
      setDeleteModal({ isOpen: false, projectId: null, projectName: '' });
    } catch (error: any) {
      console.error('削除エラー:', error);
      alert('プロジェクトの削除に失敗しました');
    }
  };

  // =====================================
  // レンダリング
  // =====================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <DashboardHeader />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-8 py-8 mt-16">
        {/* ダッシュボードヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Figmaデザインを診断して、最適なHTMLコードを生成しましょう
          </p>
        </div>

        {/* アクションカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

          <button
            onClick={() => setIsFigmaSettingsModalOpen(true)}
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

          <button
            onClick={() => window.open('https://docs.figlean.com', '_blank')}
            className="bg-white rounded-2xl p-8 shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 text-left"
          >
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ドキュメント
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              使い方やルールの詳細を確認します
            </p>
          </button>
        </div>

        {/* プロジェクト一覧セクション */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              プロジェクト一覧
            </h2>
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              {isFilterExpanded ? '検索・フィルターを閉じる' : '検索・フィルターを開く'}
            </button>
          </div>

          {/* フィルター・検索エリア（開閉可能） */}
          {isFilterExpanded && (
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 検索 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    検索
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="プロジェクト名で検索..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* ステータスフィルター */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="ALL">すべて</option>
                    <option value="PENDING">待機中</option>
                    <option value="IMPORTING">インポート中</option>
                    <option value="ANALYZING">解析中</option>
                    <option value="COMPLETED">完了</option>
                    <option value="FAILED">失敗</option>
                  </select>
                </div>

                {/* ソートフィールド */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    並び替え
                  </label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="createdAt">作成日時</option>
                    <option value="updatedAt">更新日時</option>
                    <option value="figleanScore">スコア</option>
                    <option value="name">名前</option>
                  </select>
                </div>

                {/* ソート順序 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    順序
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="desc">降順</option>
                    <option value="asc">昇順</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* ローディング */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-200">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                プロジェクトがありません
              </h3>
              <p className="text-gray-600 mb-6">
                新規プロジェクトを作成して診断を開始しましょう
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                プロジェクトを作成
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {project.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(project);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {project.figleanScore !== null && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          FIGLEAN適合度
                        </span>
                        <span className={`text-2xl font-bold ${
                          project.figleanScore >= 90 ? 'text-green-600' :
                          project.figleanScore >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {project.figleanScore}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            project.figleanScore >= 90 ? 'bg-green-600' :
                            project.figleanScore >= 70 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${project.figleanScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(project.createdAt).toLocaleDateString('ja-JP')}</span>
                    <span className={`px-2 py-1 rounded ${
                      project.analysisStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      project.analysisStatus === 'ANALYZING' ? 'bg-blue-100 text-blue-800' :
                      project.analysisStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.analysisStatus === 'COMPLETED' ? '完了' :
                       project.analysisStatus === 'ANALYZING' ? '解析中' :
                       project.analysisStatus === 'FAILED' ? '失敗' : '待機中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* モーダル */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchProjects}
      />

      <FigmaSettingsModal
        isOpen={isFigmaSettingsModalOpen}
        onClose={() => setIsFigmaSettingsModalOpen(false)}
        onSuccess={fetchProjects}
      />

      {/* 削除確認モーダル */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              プロジェクトを削除
            </h3>
            <p className="text-gray-600 mb-6">
              「{deleteModal.projectName}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, projectId: null, projectName: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}