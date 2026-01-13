// =====================================
// backend/src/types/html.ts
// HTML生成関連の型定義 - FIGLEAN Phase 9
// 作成日時: 2026年1月12日
// 説明: HTML Generator機能で使用する型定義
// =====================================

/**
 * レイアウト方向
 */
export type LayoutDirection = 'horizontal' | 'vertical';

/**
 * サイジングモード
 */
export type SizingMode = 'FIXED' | 'HUG' | 'FILL' | 'AUTO';

/**
 * アライメント
 */
export type AlignItems = 'START' | 'CENTER' | 'END' | 'BASELINE' | 'STRETCH';
export type JustifyContent = 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN' | 'SPACE_AROUND' | 'SPACE_EVENLY';

/**
 * レイアウト情報
 */
export interface LayoutInfo {
  direction: LayoutDirection;
  sizing: SizingInfo;
  spacing: SpacingInfo;
  alignment: AlignmentInfo;
  wrap: boolean;
}

/**
 * サイジング情報
 */
export interface SizingInfo {
  width: SizingMode;
  height: SizingMode;
  widthValue?: number;
  heightValue?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * スペーシング情報
 */
export interface SpacingInfo {
  gap: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * アライメント情報
 */
export interface AlignmentInfo {
  alignItems: AlignItems;
  justifyContent: JustifyContent;
}

/**
 * Figmaノード（簡略版）
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  
  // Auto Layout関連
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  
  // Padding
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  
  // サイズ
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  
  // テキスト関連（TEXTノードの場合）
  characters?: string;
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
  };
  
  // 背景・ボーダー
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  cornerRadius?: number;
  
  // 子要素
  children?: FigmaNode[];
}

/**
 * HTML生成オプション
 */
export interface HTMLGeneratorOptions {
  // フレームワーク選択
  framework: 'HTML_TAILWIND' | 'REACT_JSX' | 'VUE_SFC';
  
  // レスポンシブ設定
  includeResponsive: boolean;
  includeGrid: boolean;
  
  // Breakpoint設定
  breakpoints?: ProjectBreakpoints;
  
  // その他オプション
  useGrid?: boolean; // 内部で判定後に設定される
  minifyOutput?: boolean;
  includeComments?: boolean;
}

/**
 * プロジェクトBreakpoint設定
 */
export interface ProjectBreakpoints {
  mobile?: number;   // デフォルト: 640
  tablet?: number;   // デフォルト: 768
  desktop?: number;  // デフォルト: 1024
  wide?: number;     // デフォルト: 1280
}

/**
 * 生成されたHTML結果
 */
export interface GeneratedHTMLResult {
  id: string;
  projectId: string;
  userId: string;
  
  // 生成オプション
  framework: 'HTML_TAILWIND' | 'REACT_JSX' | 'VUE_SFC';
  includeResponsive: boolean;
  includeGrid: boolean;
  breakpoints?: ProjectBreakpoints;
  
  // 生成コード
  htmlCode: string;
  cssCode?: string;
  
  // メタデータ
  metadata: HTMLMetadata;
  
  // ステータス
  generationStatus: 'NOT_GENERATED' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  generationTimeMs?: number;
  errorMessage?: string;
  
  // URL
  previewUrl: string;
  downloadUrl: string;
  
  // タイムスタンプ
  createdAt: Date;
  updatedAt: Date;
}

/**
 * HTMLメタデータ
 */
export interface HTMLMetadata {
  totalLines: number;
  tailwindClasses: number;
  componentCount: number;
  reproductionRate: number;  // 0.0-1.0
  codeQualityScore: number;  // 0-100
}

/**
 * Tailwindクラス情報
 */
export interface TailwindClassInfo {
  flexClasses: string[];
  sizingClasses: string[];
  spacingClasses: string[];
  colorClasses: string[];
  borderClasses: string[];
  responsiveClasses: string[];
}

/**
 * HTMLビルダー設定
 */
export interface HTMLBuilderConfig {
  indent: number;              // インデント幅（スペース数）
  useSemanticTags: boolean;    // セマンティックHTMLタグを使用
  includeTailwindCDN: boolean; // Tailwind CDNを含める
  includeMetaTags: boolean;    // メタタグを含める
}

/**
 * ノードHTML変換結果
 */
export interface NodeHTMLResult {
  html: string;
  classes: string[];
  children: NodeHTMLResult[];
}

/**
 * セマンティックタグマッピング
 */
export interface SemanticTagMap {
  [pattern: string]: string;
}

/**
 * Tailwindサイズマッピング
 */
export interface TailwindSizeMap {
  [px: number]: number;
}

// =====================================
// Export
// =====================================

export default {
  // 型定義のみなので、エクスポートするものはない
};