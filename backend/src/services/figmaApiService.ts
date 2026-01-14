// =====================================
// backend/src/services/figmaApiService.ts
// Figma APIクライアントサービス - FIGLEAN Phase 6
// 作成日時: 2026年1月11日
// 更新日時: 2026年1月13日 - getFigmaFiles実装完了
// 依存関係: figmaTokenService, config/env, errors
// 説明: Figma REST API v1との連携、ファイル取得、ノード走査
// =====================================

import * as figmaTokenService from './figmaTokenService';
import { config } from '../config/env';
import { NotFoundError, ExternalServiceError } from '../errors';
import logger from '../utils/logger';

// =====================================
// 型定義
// =====================================

/**
 * Figmaファイル情報
 */
export interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string | null;
  last_modified: string;
}

/**
 * Figmaファイル一覧レスポンス
 */
export interface FigmaFilesResponse {
  files: FigmaFile[];
}

/**
 * Figmaノード（簡略版）
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  // Auto Layout情報
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  // サイズ情報
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // 制約情報
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  // その他
  visible?: boolean;
  locked?: boolean;
}

/**
 * Figmaファイル詳細
 */
export interface FigmaFileDetail {
  name: string;
  lastModified: string;
  thumbnailUrl: string | null;
  version: string;
  document: FigmaNode;
  components?: Record<string, any>;
  componentSets?: Record<string, any>;
  schemaVersion: number;
}

/**
 * Figmaユーザー情報
 */
export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url: string | null;
}

/**
 * ノード走査オプション
 */
export interface NodeTraversalOptions {
  maxDepth?: number;  // 最大階層深度（デフォルト: 10）
  includeHidden?: boolean;  // 非表示ノードを含めるか（デフォルト: false）
  filterTypes?: string[];  // フィルタするノードタイプ（例: ['FRAME', 'GROUP']）
}

/**
 * ノード走査結果
 */
export interface NodeTraversalResult {
  totalNodes: number;
  frames: FigmaNode[];
  depth: number;
}

// =====================================
// Figma APIクライアント
// =====================================

/**
 * Figma APIリクエストヘッダーを生成
 * 
 * @param token - Figmaアクセストークン
 * @returns リクエストヘッダー
 */
function createFigmaHeaders(token: string): Record<string, string> {
  return {
    'X-Figma-Token': token,
    'Content-Type': 'application/json'
  };
}

/**
 * Figma APIエラーハンドリング
 * 
 * @param response - Fetchレスポンス
 * @param context - エラーコンテキスト
 * @throws ExternalServiceError
 */
async function handleFigmaApiError(
  response: Response,
  context: string
): Promise<never> {
  let errorMessage = `Figma API error: ${response.status} ${response.statusText}`;
  
  try {
    const errorData = await response.json() as any;
    if (errorData.err || errorData.message) {
      errorMessage = errorData.err || errorData.message;
    }
  } catch {
    // JSONパースエラーは無視
  }

  logger.error(`Figma API エラー: ${context}`, {
    status: response.status,
    statusText: response.statusText,
    errorMessage
  });

  throw new ExternalServiceError(
    `Figma API エラー: ${errorMessage}`,
    response.status
  );
}

// =====================================
// ユーザー情報取得
// =====================================

/**
 * Figmaユーザー情報を取得
 * 
 * @param userId - FIGLEANユーザーID
 * @returns Figmaユーザー情報
 * @throws NotFoundError - トークンが見つからない
 * @throws ExternalServiceError - Figma APIエラー
 */
export async function getFigmaUser(userId: string): Promise<FigmaUser> {
  logger.info('Figmaユーザー情報取得開始', { userId });

  // トークンを取得
  const token = await figmaTokenService.getFigmaToken(userId);
  
  if (!token) {
    throw new NotFoundError('Figmaトークンが登録されていません');
  }

  try {
    const response = await fetch(`${config.figmaApiBaseUrl}/me`, {
      method: 'GET',
      headers: createFigmaHeaders(token)
    });

    if (!response.ok) {
      await handleFigmaApiError(response, 'ユーザー情報取得');
    }

    const data = await response.json() as any;

    logger.info('Figmaユーザー情報取得成功', { 
      userId, 
      figmaUserId: data.id 
    });

    return {
      id: data.id,
      email: data.email,
      handle: data.handle,
      img_url: data.img_url
    };
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Figmaユーザー情報取得エラー', { userId, error });
    throw new ExternalServiceError('Figmaユーザー情報の取得に失敗しました');
  }
}

// =====================================
// ファイル一覧取得
// =====================================

/**
 * ユーザーのFigmaファイル一覧を取得
 * 
 * Figma APIの制約:
 * - Figma API v1には「全ファイル一覧」を取得するエンドポイントが存在しません
 * - ファイル一覧を取得するには以下の方法があります:
 *   1. チームIDとプロジェクトIDを使用してファイルを取得
 *   2. Recent Filesを取得（ブラウザのlocalStorageに依存）
 * 
 * この実装では、ユーザーが所属する全チームの全プロジェクトから
 * ファイルを収集する方式を採用しています。
 * 
 * @param userId - FIGLEANユーザーID
 * @returns Figmaファイル一覧
 * @throws NotFoundError - トークンが見つからない
 * @throws ExternalServiceError - Figma APIエラー
 */
export async function getFigmaFiles(userId: string): Promise<FigmaFilesResponse> {
  logger.info('Figmaファイル一覧取得開始', { userId });

  // トークンを取得
  const token = await figmaTokenService.getFigmaToken(userId);
  
  if (!token) {
    throw new NotFoundError('Figmaトークンが登録されていません');
  }

  try {
    // =====================================
    // ステップ1: ユーザー情報を取得（チーム情報を含む）
    // =====================================
    logger.info('Figmaユーザー情報取得（ファイル一覧用）', { userId });
    
    const userResponse = await fetch(`${config.figmaApiBaseUrl}/me`, {
      method: 'GET',
      headers: createFigmaHeaders(token)
    });

    if (!userResponse.ok) {
      await handleFigmaApiError(userResponse, 'ユーザー情報取得（ファイル一覧用）');
    }

    const userData = await userResponse.json() as any;

    // チームが存在しない場合は空配列を返す
    if (!userData.teams || userData.teams.length === 0) {
      logger.warn('ユーザーがどのチームにも所属していません', { userId });
      return { files: [] };
    }

    logger.info('所属チーム取得成功', { 
      userId, 
      teamsCount: userData.teams.length 
    });

    // =====================================
    // ステップ2: 各チームのプロジェクト一覧を取得
    // =====================================
    const allFiles: FigmaFile[] = [];
    const processedFileKeys = new Set<string>(); // 重複排除用

    for (const team of userData.teams) {
      try {
        logger.info('チームプロジェクト取得開始', { 
          userId, 
          teamId: team.id,
          teamName: team.name 
        });

        // プロジェクト一覧を取得
        const projectsResponse = await fetch(
          `${config.figmaApiBaseUrl}/teams/${team.id}/projects`,
          {
            method: 'GET',
            headers: createFigmaHeaders(token)
          }
        );

        if (!projectsResponse.ok) {
          logger.warn('プロジェクト一覧取得失敗（スキップ）', {
            userId,
            teamId: team.id,
            status: projectsResponse.status
          });
          continue; // このチームはスキップして次へ
        }

        const projectsData = await projectsResponse.json() as any;

        if (!projectsData.projects || projectsData.projects.length === 0) {
          logger.info('プロジェクトなし（スキップ）', {
            userId,
            teamId: team.id
          });
          continue;
        }

        logger.info('プロジェクト一覧取得成功', {
          userId,
          teamId: team.id,
          projectsCount: projectsData.projects.length
        });

        // =====================================
        // ステップ3: 各プロジェクトのファイル一覧を取得
        // =====================================
        for (const project of projectsData.projects) {
          try {
            logger.info('プロジェクトファイル取得開始', {
              userId,
              projectId: project.id,
              projectName: project.name
            });

            const filesResponse = await fetch(
              `${config.figmaApiBaseUrl}/projects/${project.id}/files`,
              {
                method: 'GET',
                headers: createFigmaHeaders(token)
              }
            );

            if (!filesResponse.ok) {
              logger.warn('ファイル一覧取得失敗（スキップ）', {
                userId,
                projectId: project.id,
                status: filesResponse.status
              });
              continue;
            }

            const filesData = await filesResponse.json() as any;

            if (!filesData.files || filesData.files.length === 0) {
              logger.info('ファイルなし（スキップ）', {
                userId,
                projectId: project.id
              });
              continue;
            }

            // ファイルを収集（重複排除）
            for (const file of filesData.files) {
              if (!processedFileKeys.has(file.key)) {
                allFiles.push({
                  key: file.key,
                  name: file.name,
                  thumbnail_url: file.thumbnail_url || null,
                  last_modified: file.last_modified
                });
                processedFileKeys.add(file.key);
              }
            }

            logger.info('ファイル一覧取得成功', {
              userId,
              projectId: project.id,
              filesCount: filesData.files.length
            });

          } catch (error) {
            logger.warn('プロジェクトファイル取得エラー（スキップ）', {
              userId,
              projectId: project.id,
              error
            });
            // エラーが発生してもこのプロジェクトはスキップして続行
            continue;
          }
        }

      } catch (error) {
        logger.warn('チームプロジェクト取得エラー（スキップ）', {
          userId,
          teamId: team.id,
          error
        });
        // エラーが発生してもこのチームはスキップして続行
        continue;
      }
    }

    // =====================================
    // ステップ4: 結果を返す
    // =====================================
    logger.info('Figmaファイル一覧取得成功', {
      userId,
      filesCount: allFiles.length
    });

    return {
      files: allFiles
    };

  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Figmaファイル一覧取得エラー', { userId, error });
    throw new ExternalServiceError('Figmaファイル一覧の取得に失敗しました');
  }
}

// =====================================
// ファイル詳細取得
// =====================================

/**
 * Figmaファイルの詳細情報を取得
 * 
 * @param userId - FIGLEANユーザーID
 * @param fileKey - FigmaファイルKey
 * @returns ファイル詳細情報
 * @throws NotFoundError - トークンまたはファイルが見つからない
 * @throws ExternalServiceError - Figma APIエラー
 */
export async function getFigmaFile(
  userId: string,
  fileKey: string
): Promise<FigmaFileDetail> {
  logger.info('Figmaファイル詳細取得開始', { userId, fileKey });

  // トークンを取得
  const token = await figmaTokenService.getFigmaToken(userId);
  
  if (!token) {
    throw new NotFoundError('Figmaトークンが登録されていません');
  }

  try {
    const response = await fetch(`${config.figmaApiBaseUrl}/files/${fileKey}`, {
      method: 'GET',
      headers: createFigmaHeaders(token)
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(`Figmaファイルが見つかりません: ${fileKey}`);
      }
      await handleFigmaApiError(response, 'ファイル詳細取得');
    }

    const data = await response.json() as any;

    logger.info('Figmaファイル詳細取得成功', { 
      userId, 
      fileKey,
      fileName: data.name 
    });

    return {
      name: data.name,
      lastModified: data.lastModified,
      thumbnailUrl: data.thumbnailUrl || null,
      version: data.version,
      document: data.document,
      components: data.components,
      componentSets: data.componentSets,
      schemaVersion: data.schemaVersion
    };
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Figmaファイル詳細取得エラー', { userId, fileKey, error });
    throw new ExternalServiceError('Figmaファイル詳細の取得に失敗しました');
  }
}

// =====================================
// ノード走査
// =====================================

/**
 * Figmaノードを再帰的に走査
 * 
 * @param node - 走査開始ノード
 * @param options - 走査オプション
 * @param currentDepth - 現在の深さ（内部使用）
 * @returns 走査結果
 */
export function traverseNodes(
  node: FigmaNode,
  options: NodeTraversalOptions = {},
  currentDepth: number = 0
): NodeTraversalResult {
  const {
    maxDepth = 10,
    includeHidden = false,
    filterTypes
  } = options;

  let totalNodes = 0;
  const frames: FigmaNode[] = [];

  // 深さ制限チェック
  if (currentDepth > maxDepth) {
    return { totalNodes: 0, frames: [], depth: currentDepth };
  }

  // 非表示ノードのスキップ
  if (!includeHidden && node.visible === false) {
    return { totalNodes: 0, frames: [], depth: currentDepth };
  }

  // ノードカウント
  totalNodes++;

  // タイプフィルタリング
  const shouldInclude = !filterTypes || filterTypes.includes(node.type);

  // FRAMEタイプのノードを収集
  if (shouldInclude && node.type === 'FRAME') {
    frames.push(node);
  }

  // 子ノードを再帰的に走査
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childResult = traverseNodes(child, options, currentDepth + 1);
      totalNodes += childResult.totalNodes;
      frames.push(...childResult.frames);
    }
  }

  return {
    totalNodes,
    frames,
    depth: currentDepth
  };
}

/**
 * Figmaファイルから全Frameを抽出
 * 
 * @param userId - FIGLEANユーザーID
 * @param fileKey - FigmaファイルKey
 * @param options - 走査オプション
 * @returns Frame一覧
 */
export async function extractFrames(
  userId: string,
  fileKey: string,
  options: NodeTraversalOptions = {}
): Promise<FigmaNode[]> {
  logger.info('Figma Frame抽出開始', { userId, fileKey });

  // ファイル詳細を取得
  const fileDetail = await getFigmaFile(userId, fileKey);

  // ドキュメントルートから走査
  const result = traverseNodes(fileDetail.document, options);

  logger.info('Figma Frame抽出完了', {
    userId,
    fileKey,
    totalNodes: result.totalNodes,
    framesCount: result.frames.length,
    maxDepth: result.depth
  });

  return result.frames;
}

// =====================================
// ノード情報取得
// =====================================

/**
 * 特定のノード情報を取得
 * 
 * @param userId - FIGLEANユーザーID
 * @param fileKey - FigmaファイルKey
 * @param nodeId - ノードID
 * @returns ノード情報
 * @throws NotFoundError - トークンまたはノードが見つからない
 * @throws ExternalServiceError - Figma APIエラー
 */
export async function getFigmaNode(
  userId: string,
  fileKey: string,
  nodeId: string
): Promise<FigmaNode> {
  logger.info('Figmaノード情報取得開始', { userId, fileKey, nodeId });

  // トークンを取得
  const token = await figmaTokenService.getFigmaToken(userId);
  
  if (!token) {
    throw new NotFoundError('Figmaトークンが登録されていません');
  }

  try {
    const response = await fetch(
      `${config.figmaApiBaseUrl}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
      {
        method: 'GET',
        headers: createFigmaHeaders(token)
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(`Figmaノードが見つかりません: ${nodeId}`);
      }
      await handleFigmaApiError(response, 'ノード情報取得');
    }

    const data = await response.json() as any;

    if (!data.nodes || !data.nodes[nodeId]) {
      throw new NotFoundError(`Figmaノードが見つかりません: ${nodeId}`);
    }

    const nodeData = data.nodes[nodeId];

    logger.info('Figmaノード情報取得成功', { 
      userId, 
      fileKey,
      nodeId,
      nodeType: nodeData.document?.type
    });

    return nodeData.document;
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Figmaノード情報取得エラー', { userId, fileKey, nodeId, error });
    throw new ExternalServiceError('Figmaノード情報の取得に失敗しました');
  }
}

// =====================================
// エクスポート
// =====================================

export default {
  getFigmaUser,
  getFigmaFiles,
  getFigmaFile,
  getFigmaNode,
  extractFrames,
  traverseNodes
};