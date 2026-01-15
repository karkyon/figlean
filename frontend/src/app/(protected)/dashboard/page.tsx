/**
 * FIGLEAN Frontend - Dashboard（メイン画面）- Phase 3拡張版
 * パス: /dashboard
 * Phase 3.2-3.4: フィルター・ソート・検索機能追加
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
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
  // フィルター・ソート・検索ロジック
  // =====================================

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, statusFilter, sortField, sortOrder, scoreMin, scoreMax, projects]);

  const applyFiltersAndSort = () => {
    let result = [...projects];

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.figmaFileName && p.figmaFileName.toLowerCase().includes(query))
      );
    }

    // ステータスフィルター
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.analysisStatus === statusFilter);
    }

    // スコアフィルター
    if (scoreMin !== null) {
      result = result.filter(p => p.figleanScore !== null && p.figleanScore >= scoreMin);
    }
    if (scoreMax !== null) {
      result = result.filter(p => p.figleanScore !== null && p.figleanScore <= scoreMax);
    }

    // ソート
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
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
  };

  // =====================================
  // イベントハンドラー
  // =====================================

  const handleProjectCreated = (projectId: string) => {
    setIsCreateModalOpen(false);
    fetchProjects();
    router.push(`/projects/${projectId}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setScoreMin(null);
    setScoreMax(null);
    setSortField('createdAt');
    setSortOrder('desc');
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      projectId,
      projectName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return;

    try {
      await projectsApi.deleteProject(deleteModal.projectId);
      setDeleteModal({ isOpen: false, projectId: null, projectName: '' });
      fetchProjects();
    } catch (error: any) {
      console.error('プロジェクト削除エラー:', error);
      alert('プロジェクトの削除に失敗しました');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, projectId: null, projectName: '' });
  };

  // =====================================
  // ヘルパー関数
  // =====================================

  const getScoreColor = (score: number | null) => {
    if (!score) return '#94a3b8';
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#d97706';
    return '#ef4444';
  };

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

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      IMPORTING: 'bg-blue-100 text-blue-800',
      ANALYZING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // =====================================
  // レンダリング
  // =====================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between px-6 shadow-lg">
        <div className="text-2xl font-extrabold">FIGLEAN</div>
        <div className="flex items-center gap-4">
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              プロジェクト一覧 ({filteredProjects.length})
            </h2>
          </div>

          {/* フィルター・ソート・検索UI */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            {/* 検索バー */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 検索
              </label>
              <input
                type="text"
                placeholder="プロジェクト名またはFigmaファイル名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* フィルター行 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* ステータスフィルター */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">すべて</option>
                  <option value="PENDING">待機中</option>
                  <option value="IMPORTING">インポート中</option>
                  <option value="ANALYZING">解析中</option>
                  <option value="COMPLETED">完了</option>
                  <option value="FAILED">失敗</option>
                </select>
              </div>

              {/* スコア範囲フィルター */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  スコア (最小)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={scoreMin ?? ''}
                  onChange={(e) => setScoreMin(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  スコア (最大)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={scoreMax ?? ''}
                  onChange={(e) => setScoreMax(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* クリアボタン */}
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  フィルターをクリア
                </button>
              </div>
            </div>

            {/* ソート行 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  並び替え
                </label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="createdAt">作成日時</option>
                  <option value="updatedAt">更新日時</option>
                  <option value="name">プロジェクト名</option>
                  <option value="figleanScore">FIGLEANスコア</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  順序
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="desc">降順</option>
                  <option value="asc">昇順</option>
                </select>
              </div>
            </div>
          </div>

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
              {(!filteredProjects || filteredProjects.length === 0) ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery || statusFilter !== 'ALL' || scoreMin !== null || scoreMax !== null
                      ? '条件に一致するプロジェクトがありません'
                      : 'プロジェクトがありません'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery || statusFilter !== 'ALL' || scoreMin !== null || scoreMax !== null
                      ? 'フィルター条件を変更してください'
                      : '新規プロジェクトを作成してFigmaデザインを診断しましょう'}
                  </p>
                  {!searchQuery && statusFilter === 'ALL' && scoreMin === null && scoreMax === null && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      プロジェクトを作成
                    </button>
                  )}
                </div>
              ) : (
                /* プロジェクト一覧表示 */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                    　className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 text-left relative"                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base font-bold text-gray-900 flex-1 pr-2">
                          {project.name}
                        </h3>
                        {project.figleanScore !== null && (
                          <div
                            className="text-2xl font-black"
                            style={{ color: getScoreColor(project.figleanScore) }}
                          >
                            {project.figleanScore}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 mb-3">
                        {project.figmaFileName || 'Figma File'}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {/* ステータスバッジ */}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(project.analysisStatus)}`}>
                          {getStatusLabel(project.analysisStatus)}
                        </span>

                        {/* HTML生成可能バッジ */}
                        {project.figleanScore !== null && project.figleanScore >= 90 && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            HTML生成可能
                          </span>
                        )}

                        {/* Grid生成可能バッジ */}
                        {project.figleanScore !== null && project.figleanScore === 100 && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                            Grid生成可能
                          </span>
                        )}
                      </div>

                      {/* 日時表示と削除ボタン */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          更新: {new Date(project.updatedAt).toLocaleDateString('ja-JP')}
                        </div>
                        {/* 削除ボタン */}
                        <button
                          onClick={(e) => handleDeleteClick(e, project.id, project.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="プロジェクトを削除"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />

      {/* Delete Confirm Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">プロジェクトを削除</h3>
            <p className="text-gray-600 mb-2">
              <span className="font-semibold text-gray-900">{deleteModal.projectName}</span> を削除してもよろしいですか?
            </p>
            <p className="text-red-600 text-sm mb-6">
              この操作は取り消せません。すべての診断データも削除されます。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}