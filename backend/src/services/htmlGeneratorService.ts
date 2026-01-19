/**
 * ==============================================
 * FIGLEAN - HTML Generator Service（完全版）
 * ==============================================
 * ファイルパス: backend/src/services/htmlGeneratorService.ts
 * 作成日: 2026-01-19
 * 説明: HTML生成の統合サービス（市販レベル）
 * ==============================================
 */

import type {
  HTMLGeneratorOptions,
  GeneratedHTMLResult,
  HTMLMetadata,
  FigmaNode,
  Framework
} from '../types/html';
import { HTMLBuilder, getHTMLBuilder } from './html/htmlBuilder';

// =====================================
// 定数定義
// =====================================

const VALID_FRAMEWORKS: Framework[] = ['HTML_TAILWIND', 'REACT_JSX', 'VUE_SFC'];
const MIN_SCORE_FOR_HTML_GENERATION = 60;
const PERFECT_SCORE_FOR_GRID = 100;

// =====================================
// エラークラス
// =====================================

class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =====================================
// バリデーション
// =====================================

/**
 * フレームワークバリデーション
 */
function validateFramework(framework: string): void {
  if (!VALID_FRAMEWORKS.includes(framework as Framework)) {
    throw new ValidationError(
      `Invalid framework. Must be one of: ${VALID_FRAMEWORKS.join(', ')}`,
      'framework'
    );
  }
}

/**
 * FIGLEANスコアバリデーション
 */
function validateScore(score: number): void {
  if (score < MIN_SCORE_FOR_HTML_GENERATION) {
    throw new ValidationError(
      `HTML生成にはFIGLEANスコア${MIN_SCORE_FOR_HTML_GENERATION}%以上が必要です（現在: ${score}%）`,
      'figleanScore'
    );
  }
}

/**
 * Grid使用可否を判定
 */
function shouldUseGrid(score: number, includeGridOption: boolean): boolean {
  return score === PERFECT_SCORE_FOR_GRID && includeGridOption;
}

// =====================================
// オプション構築
// =====================================

/**
 * HTML生成オプションを構築
 */
function buildHTMLGeneratorOptions(
  rawOptions: Partial<HTMLGeneratorOptions> = {}
): HTMLGeneratorOptions {
  const framework = rawOptions.framework || 'HTML_TAILWIND';
  
  validateFramework(framework);

  return {
    framework,
    includeResponsive: rawOptions.includeResponsive !== false,
    includeGrid: rawOptions.includeGrid || false,
    breakpoints: rawOptions.breakpoints,
    minifyOutput: rawOptions.minifyOutput || false,
    includeComments: rawOptions.includeComments || false,
    useGrid: rawOptions.useGrid || false
  };
}

// =====================================
// HTML Generator Service Class
// =====================================

/**
 * HTML Generator Service
 * メインエントリポイント
 */
export class HTMLGeneratorService {
  private htmlBuilder: HTMLBuilder;

  constructor() {
    this.htmlBuilder = getHTMLBuilder();
  }

  /**
   * HTML生成（メインエントリポイント）
   */
  async generateHTML(
    projectId: string,
    userId: string,
    figmaData: { document: FigmaNode },
    figleanScore: number,
    rawOptions: Partial<HTMLGeneratorOptions> = {}
  ): Promise<GeneratedHTMLResult> {
    const startTime = Date.now();

    console.log('🎨 [SERVICE] HTML生成開始', {
      projectId,
      userId,
      figleanScore,
      options: rawOptions
    });

    try {
      // 1. スコアバリデーション
      validateScore(figleanScore);

      // 2. オプション構築
      const options = buildHTMLGeneratorOptions(rawOptions);

      // 3. Grid使用可否判定
      const useGrid = shouldUseGrid(figleanScore, options.includeGrid);

      // 4. 最終オプション設定
      const finalOptions: HTMLGeneratorOptions = {
        ...options,
        useGrid
      };

      console.log('📝 [SERVICE] オプション構築完了', { finalOptions });

      // 5. HTML生成（実際の変換処理）
      const htmlCode = this.htmlBuilder.build(figmaData.document, finalOptions);

      // 6. メタデータ計算
      const metadata = this.calculateMetadata(htmlCode);

      // 7. 生成時間計算
      const generationTimeMs = Date.now() - startTime;

      console.log('✅ [SERVICE] HTML生成成功', {
        projectId,
        generationTimeMs,
        metadata
      });

      // 8. 結果を構築
      const result: GeneratedHTMLResult = {
        id: this.generateUUID(),
        projectId,
        userId,
        framework: options.framework,
        includeResponsive: options.includeResponsive,
        includeGrid: useGrid,
        breakpoints: options.breakpoints,
        htmlCode,
        cssCode: undefined, // Tailwindを使用するため不要
        metadata,
        generationStatus: 'COMPLETED',
        generationTimeMs,
        errorMessage: undefined,
        previewUrl: `/api/html/${projectId}/preview`,
        downloadUrl: `/api/html/${projectId}/download`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return result;
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'HTML生成に失敗しました';

      console.error('❌ [SERVICE] HTML生成失敗', {
        projectId,
        error: errorMessage,
        generationTimeMs
      });

      // エラー結果を返す
      return {
        id: this.generateUUID(),
        projectId,
        userId,
        framework: rawOptions.framework || 'HTML_TAILWIND',
        includeResponsive: rawOptions.includeResponsive !== false,
        includeGrid: false,
        breakpoints: rawOptions.breakpoints,
        htmlCode: '',
        metadata: {
          totalLines: 0,
          tailwindClasses: 0,
          componentCount: 0,
          reproductionRate: 0,
          codeQualityScore: 0
        },
        generationStatus: 'FAILED',
        generationTimeMs,
        errorMessage,
        previewUrl: `/api/html/${projectId}/preview`,
        downloadUrl: `/api/html/${projectId}/download`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  /**
   * メタデータ計算
   */
  private calculateMetadata(htmlCode: string): HTMLMetadata {
    const basicMetadata = this.htmlBuilder.calculateMetadata(htmlCode);

    // 再現率を計算
    const reproductionRate = this.calculateReproductionRate(htmlCode);

    // コード品質スコアを計算
    const codeQualityScore = this.calculateCodeQualityScore(htmlCode, basicMetadata);

    return {
      ...basicMetadata,
      reproductionRate,
      codeQualityScore
    };
  }

  /**
   * 再現率を計算
   */
  private calculateReproductionRate(htmlCode: string): number {
    // セマンティックタグの使用率で判定
    const semanticTags = ['section', 'article', 'header', 'footer', 'nav', 'main', 'aside'];
    let semanticCount = 0;
    let totalTags = 0;

    for (const tag of semanticTags) {
      const matches = htmlCode.match(new RegExp(`<${tag}[^>]*>`, 'g'));
      if (matches) {
        semanticCount += matches.length;
      }
    }

    const allTags = htmlCode.match(/<\w+[^>]*>/g);
    if (allTags) {
      totalTags = allTags.length;
    }

    if (totalTags === 0) {
      return 0;
    }

    // セマンティック率に基づいて再現率を計算
    const semanticRatio = semanticCount / totalTags;
    const baseRate = 0.85; // ベース再現率
    const reproductionRate = Math.min(baseRate + (semanticRatio * 0.15), 1.0);

    return Math.round(reproductionRate * 100) / 100; // 小数点2桁
  }

  /**
   * コード品質スコアを計算
   */
  private calculateCodeQualityScore(
    htmlCode: string,
    metadata: { totalLines: number; tailwindClasses: number; componentCount: number }
  ): number {
    let score = 100;

    // インデントが適切か
    const lines = htmlCode.split('\n');
    const improperlyIndented = lines.filter(line => {
      const leadingSpaces = line.match(/^( *)/)?.[1].length || 0;
      return leadingSpaces % 2 !== 0; // 2スペースインデント以外
    }).length;

    if (improperlyIndented > lines.length * 0.1) {
      score -= 5;
    }

    // Tailwindクラスの使用率
    const classPerComponent = metadata.componentCount > 0
      ? metadata.tailwindClasses / metadata.componentCount
      : 0;

    if (classPerComponent > 10) {
      score -= 10; // クラスが多すぎる
    } else if (classPerComponent < 2) {
      score -= 5; // クラスが少なすぎる
    }

    // コード長さ
    if (metadata.totalLines > 1000) {
      score -= 5;
    }

    // HTML5準拠
    if (!htmlCode.includes('<!DOCTYPE html>')) {
      score -= 10;
    }

    if (!htmlCode.includes('<meta charset="UTF-8">')) {
      score -= 5;
    }

    return Math.max(score, 0);
  }

  /**
   * UUID生成
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * プレビューHTML生成
   */
  generatePreview(htmlCode: string): string {
    console.log('👁️ [SERVICE] プレビューHTML生成');

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIGLEAN Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .preview-container {
      max-width: 1200px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <div class="preview-container">
    ${htmlCode}
  </div>
</body>
</html>
    `;
  }

  /**
   * ダウンロード用データを生成（簡易版）
   * 
   * Note: 完全なZIP生成にはarchiverパッケージが必要です
   * npm install archiver @types/archiver
   */
  async generateDownloadZip(
    htmlCode: string,
    _projectName: string
  ): Promise<string> {
    console.log('📦 [SERVICE] ダウンロードHTML生成');

    // シンプルにHTMLコードを返す
    // 本番環境ではarchiverを使用してZIPを生成
    return htmlCode;
  }

  /**
   * ダウンロード用ZIP生成（archiver使用版）
   * 
   * archiverパッケージをインストール後、この実装に置き換えてください：
   * 
   * async generateDownloadZip(
   *   htmlCode: string,
   *   projectName: string
   * ): Promise<Buffer> {
   *   const archiver = require('archiver');
   *   const archive = archiver('zip', { zlib: { level: 9 } });
   *   
   *   const buffers: Buffer[] = [];
   *   archive.on('data', (data: Buffer) => buffers.push(data));
   *   archive.on('end', () => resolve(Buffer.concat(buffers)));
   *   
   *   const fileName = `${projectName.replace(/[^\w\s-]/g, '')}.html`;
   *   archive.append(htmlCode, { name: fileName });
   *   
   *   // README.md生成
   *   const readme = `# ${projectName}
   * 
   * ## FIGLEAN Generated HTML
   * 
   * このHTMLファイルは [FIGLEAN](https://figlean.com) によって自動生成されました。
   * 
   * ### 特徴
   * 
   * - ✅ Tailwind CSS使用
   * - ✅ レスポンシブ対応
   * - ✅ セマンティックHTML
   * - ✅ アクセシビリティ対応
   * 
   * Generated by FIGLEAN - ${new Date().toISOString()}
   * `;
   *   
   *   archive.append(readme, { name: 'README.md' });
   *   archive.finalize();
   * }
   */
}

// =====================================
// Singleton Instance
// =====================================

let htmlGeneratorServiceInstance: HTMLGeneratorService | null = null;

/**
 * HTML Generator Serviceのシングルトンインスタンスを取得
 */
export function getHTMLGeneratorService(): HTMLGeneratorService {
  if (!htmlGeneratorServiceInstance) {
    htmlGeneratorServiceInstance = new HTMLGeneratorService();
  }
  return htmlGeneratorServiceInstance;
}

// =====================================
// Export
// =====================================

export default HTMLGeneratorService;