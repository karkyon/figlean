/**
 * FIGLEAN Frontend - UI状態管理
 * Zustandを使用したUI状態の管理
 */

import { create } from 'zustand';

// =====================================
// 型定義
// =====================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface Modal {
  id: string;
  isOpen: boolean;
  content?: React.ReactNode;
}

interface UIState {
  // サイドバー
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;

  // モーダル
  modals: Modal[];
  openModal: (id: string, content?: React.ReactNode) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;

  // トースト通知
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // ローディング
  globalLoading: boolean;
  setGlobalLoading: (isLoading: boolean) => void;

  // テーマ
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// =====================================
// Zustand Store
// =====================================

export const useUIStore = create<UIState>((set, get) => ({
  // サイドバー
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  // モーダル
  modals: [],
  openModal: (id, content) => {
    const { modals } = get();
    const existingModal = modals.find((m) => m.id === id);
    
    if (existingModal) {
      set({
        modals: modals.map((m) =>
          m.id === id ? { ...m, isOpen: true, content } : m
        ),
      });
    } else {
      set({
        modals: [...modals, { id, isOpen: true, content }],
      });
    }
  },
  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.map((m) =>
        m.id === id ? { ...m, isOpen: false } : m
      ),
    }));
  },
  isModalOpen: (id) => {
    const modal = get().modals.find((m) => m.id === id);
    return modal ? modal.isOpen : false;
  },

  // トースト通知
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, ...toast };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 自動削除（デフォルト: 3秒）
    const duration = toast.duration || 3000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),

  // グローバルローディング
  globalLoading: false,
  setGlobalLoading: (isLoading) => set({ globalLoading: isLoading }),

  // テーマ
  theme: 'light',
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    
    // HTML要素のクラスを更新
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  },
  setTheme: (theme) => {
    set({ theme });
    
    // HTML要素のクラスを更新
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },
}));

// =====================================
// ヘルパー関数
// =====================================

/**
 * 成功トーストを表示
 */
export const showSuccessToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'success', message, duration });
};

/**
 * エラートーストを表示
 */
export const showErrorToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'error', message, duration });
};

/**
 * 情報トーストを表示
 */
export const showInfoToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'info', message, duration });
};

/**
 * 警告トーストを表示
 */
export const showWarningToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'warning', message, duration });
};
