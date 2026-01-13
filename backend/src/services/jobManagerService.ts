// =====================================
// backend/src/services/jobManagerService.ts
// 非同期ジョブ管理サービス - FIGLEAN Phase 6
// 作成日時: 2026年1月11日
// 依存関係: uuid
// 説明: Figmaインポート＋解析の非同期ジョブ管理（インメモリ実装）
// =====================================

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// =====================================
// 型定義
// =====================================

/**
 * ジョブステータス
 */
export type JobStatus = 
  | 'PENDING'      // ジョブ作成済み、未開始
  | 'IMPORTING'    // Figmaファイル取得中
  | 'ANALYZING'    // ルールチェック実行中
  | 'COMPLETED'    // 完了
  | 'FAILED';      // エラー

/**
 * ジョブ進捗情報
 */
export interface JobProgress {
  current: number;      // 現在の進捗
  total: number;        // 全体数
  percentage: number;   // 進捗率（0-100）
  currentStep: string;  // 現在のステップ名
}

/**
 * ジョブデータ
 */
export interface Job {
  jobId: string;
  userId: string;
  projectId: string;
  fileKey: string;
  status: JobStatus;
  progress: JobProgress;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * ジョブ作成パラメータ
 */
export interface CreateJobParams {
  userId: string;
  projectId: string;
  fileKey: string;
  metadata?: Record<string, any>;
}

// =====================================
// インメモリジョブストア
// =====================================

/**
 * ジョブストア（Map形式）
 * 本番環境ではRedis等の永続化ストレージを使用することを推奨
 */
const jobStore = new Map<string, Job>();

/**
 * ジョブの有効期限（24時間）
 */
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

// =====================================
// ジョブ管理関数
// =====================================

/**
 * 新規ジョブを作成
 * 
 * @param params - ジョブ作成パラメータ
 * @returns 作成されたジョブ
 */
export function createJob(params: CreateJobParams): Job {
  const jobId = `job_${uuidv4()}`;
  
  const job: Job = {
    jobId,
    userId: params.userId,
    projectId: params.projectId,
    fileKey: params.fileKey,
    status: 'PENDING',
    progress: {
      current: 0,
      total: 100,
      percentage: 0,
      currentStep: 'Initializing...'
    },
    startedAt: new Date(),
    metadata: params.metadata
  };

  jobStore.set(jobId, job);

  logger.info('ジョブ作成', {
    jobId,
    userId: params.userId,
    projectId: params.projectId,
    fileKey: params.fileKey
  });

  // TTL後に自動削除（メモリリーク防止）
  setTimeout(() => {
    if (jobStore.has(jobId)) {
      jobStore.delete(jobId);
      logger.info('ジョブ自動削除（TTL expired）', { jobId });
    }
  }, JOB_TTL_MS);

  return job;
}

/**
 * ジョブを取得
 * 
 * @param jobId - ジョブID
 * @returns ジョブデータ（存在しない場合はnull）
 */
export function getJob(jobId: string): Job | null {
  const job = jobStore.get(jobId);
  
  if (!job) {
    logger.warn('ジョブが見つかりません', { jobId });
    return null;
  }

  return job;
}

/**
 * ジョブステータスを更新
 * 
 * @param jobId - ジョブID
 * @param status - 新しいステータス
 * @param progress - 進捗情報（オプション）
 * @param error - エラーメッセージ（オプション）
 */
export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  progress?: Partial<JobProgress>,
  error?: string
): void {
  const job = jobStore.get(jobId);
  
  if (!job) {
    logger.error('ジョブステータス更新失敗: ジョブが見つかりません', { jobId });
    return;
  }

  job.status = status;

  if (progress) {
    job.progress = {
      ...job.progress,
      ...progress,
      percentage: progress.current && progress.total 
        ? Math.round((progress.current / progress.total) * 100)
        : job.progress.percentage
    };
  }

  if (error) {
    job.error = error;
  }

  if (status === 'COMPLETED' || status === 'FAILED') {
    job.completedAt = new Date();
  }

  jobStore.set(jobId, job);

  logger.info('ジョブステータス更新', {
    jobId,
    status,
    progress: job.progress,
    error
  });
}

/**
 * ジョブ進捗を更新
 * 
 * @param jobId - ジョブID
 * @param current - 現在の進捗
 * @param total - 全体数
 * @param currentStep - 現在のステップ名
 */
export function updateJobProgress(
  jobId: string,
  current: number,
  total: number,
  currentStep: string
): void {
  const job = jobStore.get(jobId);
  
  if (!job) {
    logger.error('ジョブ進捗更新失敗: ジョブが見つかりません', { jobId });
    return;
  }

  job.progress = {
    current,
    total,
    percentage: Math.round((current / total) * 100),
    currentStep
  };

  jobStore.set(jobId, job);

  logger.debug('ジョブ進捗更新', {
    jobId,
    progress: job.progress
  });
}

/**
 * ジョブを完了状態にする
 * 
 * @param jobId - ジョブID
 */
export function completeJob(jobId: string): void {
  updateJobStatus(jobId, 'COMPLETED', {
    current: 100,
    total: 100,
    percentage: 100,
    currentStep: 'Completed'
  });

  logger.info('ジョブ完了', { jobId });
}

/**
 * ジョブを失敗状態にする
 * 
 * @param jobId - ジョブID
 * @param error - エラーメッセージ
 */
export function failJob(jobId: string, error: string): void {
  updateJobStatus(jobId, 'FAILED', undefined, error);

  logger.error('ジョブ失敗', { jobId, error });
}

/**
 * ユーザーの全ジョブを取得
 * 
 * @param userId - ユーザーID
 * @returns ジョブ配列
 */
export function getUserJobs(userId: string): Job[] {
  const userJobs: Job[] = [];

  for (const job of jobStore.values()) {
    if (job.userId === userId) {
      userJobs.push(job);
    }
  }

  return userJobs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * プロジェクトの最新ジョブを取得
 * 
 * @param projectId - プロジェクトID
 * @returns ジョブデータ（存在しない場合はnull）
 */
export function getProjectLatestJob(projectId: string): Job | null {
  const projectJobs: Job[] = [];

  for (const job of jobStore.values()) {
    if (job.projectId === projectId) {
      projectJobs.push(job);
    }
  }

  if (projectJobs.length === 0) {
    return null;
  }

  // 最新のジョブを返す
  return projectJobs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
}

/**
 * ジョブを削除
 * 
 * @param jobId - ジョブID
 * @returns 削除成功: true、失敗: false
 */
export function deleteJob(jobId: string): boolean {
  const deleted = jobStore.delete(jobId);

  if (deleted) {
    logger.info('ジョブ削除', { jobId });
  } else {
    logger.warn('ジョブ削除失敗: ジョブが見つかりません', { jobId });
  }

  return deleted;
}

/**
 * すべてのジョブをクリア（テスト用）
 */
export function clearAllJobs(): void {
  const count = jobStore.size;
  jobStore.clear();
  logger.info('すべてのジョブをクリア', { count });
}

/**
 * ジョブ統計情報を取得
 * 
 * @returns ジョブ統計
 */
export function getJobStats(): {
  total: number;
  pending: number;
  importing: number;
  analyzing: number;
  completed: number;
  failed: number;
} {
  const stats = {
    total: jobStore.size,
    pending: 0,
    importing: 0,
    analyzing: 0,
    completed: 0,
    failed: 0
  };

  for (const job of jobStore.values()) {
    switch (job.status) {
      case 'PENDING':
        stats.pending++;
        break;
      case 'IMPORTING':
        stats.importing++;
        break;
      case 'ANALYZING':
        stats.analyzing++;
        break;
      case 'COMPLETED':
        stats.completed++;
        break;
      case 'FAILED':
        stats.failed++;
        break;
    }
  }

  return stats;
}

// =====================================
// エクスポート
// =====================================

export default {
  createJob,
  getJob,
  updateJobStatus,
  updateJobProgress,
  completeJob,
  failJob,
  getUserJobs,
  getProjectLatestJob,
  deleteJob,
  clearAllJobs,
  getJobStats
};