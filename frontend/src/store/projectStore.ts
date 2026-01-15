/**
 * FIGLEAN Frontend - プロジェクト状態管理
 * ファイルパス: frontend/src/store/projectStore.ts
 * 
 * Zustandを使用したプロジェクト関連の状態管理
 * 
 * 作成日: 2026年1月12日
 * 更新日: 2026年1月15日
 * 更新理由: createProject関数のバグ修正 - projectId取得後にインポート実行
 * 依存関係: zustand, @/types/models, @/lib/api/projects, @/lib/api/figma, @/types/figma
 */

import { create } from 'zustand';
import type { Project, ProjectDetail } from '@/types/models';
import * as projectApi from '@/lib/api/projects';
import * as figmaApi from '@/lib/api/figma';
import type { FigmaImportRequest } from '@/types/figma';

// =====================================
// 型定義
// =====================================

interface ProjectState {
  // 状態
  projects: Project[];
  currentProject: ProjectDetail | null;
  isLoading: boolean;
  error: string | null;

  // ページネーション
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;

  // アクション
  fetchProjects: (params?: any) => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: {
    name: string;
    description?: string;
    figmaFileKey: string;
    figmaFileUrl: string;
  }) => Promise<{ projectId: string; jobId: string }>;
  updateProject: (id: string, data: any) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: ProjectDetail | null) => void;
  clearError: () => void;
}

// =====================================
// Zustand Store
// =====================================

export const useProjectStore = create<ProjectState>((set, get) => ({
  // 初期状態
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  pagination: null,

  // プロジェクト一覧取得
  fetchProjects: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectApi.getProjects(params);
      set({
        projects: response.projects,
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        'プロジェクト一覧の取得に失敗しました';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // プロジェクト詳細取得
  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectApi.getProjectById(id);
      set({
        currentProject: project,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        'プロジェクトの取得に失敗しました';
      set({
        error: errorMessage,
        isLoading: false,
        currentProject: null,
      });
      throw error;
    }
  },

  // プロジェクト作成 + Figmaインポート
  // 修正: projectIdを取得してからインポート実行
  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      // 1. プロジェクト作成
      const project = await projectApi.createProject(data);

      // 2. Figmaインポート開始（projectIdを渡す）
      const importRequest: FigmaImportRequest = {
        projectId: project.id,  // ← 修正: projectIdを追加
        projectName: data.name,
        description: data.description,
        figmaFileKey: data.figmaFileKey,
        figmaFileUrl: data.figmaFileUrl,
        analyzeAll: true,
      };
      const importResponse = await figmaApi.importFigmaFile(importRequest);

      // 3. プロジェクト一覧を更新
      await get().fetchProjects();

      set({ isLoading: false });

      return {
        projectId: project.id,
        jobId: importResponse.jobId,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        'プロジェクトの作成に失敗しました';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // プロジェクト更新
  updateProject: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await projectApi.updateProject(id, data);
      
      // 現在のプロジェクトを更新
      if (get().currentProject?.id === id) {
        set({ currentProject: updated });
      }

      // プロジェクト一覧も更新
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        'プロジェクトの更新に失敗しました';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // プロジェクト削除
  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await projectApi.deleteProject(id);

      // 状態から削除
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        'プロジェクトの削除に失敗しました';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // 現在のプロジェクトを設定
  setCurrentProject: (project: ProjectDetail | null) => {
    set({ currentProject: project });
  },

  // エラークリア
  clearError: () => {
    set({ error: null });
  },
}));