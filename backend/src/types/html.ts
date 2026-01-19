/**
 * ==============================================
 * FIGLEAN - HTML Generator 型定義（完全版）
 * ==============================================
 * ファイルパス: backend/src/types/html.ts
 * 作成日: 2026-01-19
 * 説明: HTML生成機能の全型定義
 * ==============================================
 */

// =====================================
// Figmaノード型定義
// =====================================

/**
 * Figma Auto Layout設定
 */
export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';
export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
export type LayoutSizing = 'FIXED' | 'HUG' | 'FILL';

/**
 * Figmaノード（完全版）
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'VECTOR' | 'RECTANGLE' | 'TEXT' | 'COMPONENT' | 'INSTANCE';
  
  // レイアウト
  layoutMode?: LayoutMode;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: LayoutAlign;
  counterAxisAlignItems?: LayoutAlign;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  
  // サイジング
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
  layoutGrow?: number;
  
  // 絶対配置
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // サイズ
  size?: {
    x: number;
    y: number;
  };
  
  // スタイル
  fills?: Array<{
    type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
    visible?: boolean;
    opacity?: number;
    color?: {
      r: number;
      g: number;
      b: number;
      a?: number;
    };
  }>;
  
  strokes?: Array<{
    type: 'SOLID';
    visible?: boolean;
    color?: {
      r: number;
      g: number;
      b: number;
      a?: number;
    };
  }>;
  
  strokeWeight?: number;
  cornerRadius?: number;
  
  // テキスト
  characters?: string;
  style?: {
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    letterSpacing?: number;
    lineHeightPx?: number;
  };
  
  // 子要素
  children?: FigmaNode[];
}

// =====================================
// レイアウト情報
// =====================================

/**
 * レイアウト情報
 */
export interface LayoutInfo {
  direction: 'horizontal' | 'vertical';
  wrap: boolean;
  spacing: SpacingInfo;
  sizing: SizingInfo;
  alignment: AlignmentInfo;
}

/**
 * スペーシング情報
 */
export interface SpacingInfo {
  gap: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

/**
 * サイジング情報
 */
export interface SizingInfo {
  width: 'FIXED' | 'HUG' | 'FILL';
  height: 'FIXED' | 'HUG' | 'FILL';
  widthValue?: number;
  heightValue?: number;
}

/**
 * アライメント情報
 */
export interface AlignmentInfo {
  alignItems: 'START' | 'CENTER' | 'END' | 'BASELINE' | 'STRETCH';
  justifyContent: 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN' | 'SPACE_AROUND' | 'SPACE_EVENLY';
}

// =====================================
// HTML生成オプション
// =====================================

/**
 * フレームワーク型
 */
export type Framework = 'HTML_TAILWIND' | 'REACT_JSX' | 'VUE_SFC';

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
 * HTML生成オプション
 */
export interface HTMLGeneratorOptions {
  framework: Framework;
  includeResponsive: boolean;
  includeGrid: boolean;
  breakpoints?: ProjectBreakpoints;
  useGrid?: boolean;
  minifyOutput?: boolean;
  includeComments?: boolean;
}

// =====================================
// 生成結果
// =====================================

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
 * 生成されたHTML結果
 */
export interface GeneratedHTMLResult {
  id: string;
  projectId: string;
  userId: string;
  
  framework: Framework;
  includeResponsive: boolean;
  includeGrid: boolean;
  breakpoints?: ProjectBreakpoints;
  
  htmlCode: string;
  cssCode?: string;
  
  metadata: HTMLMetadata;
  
  generationStatus: 'NOT_GENERATED' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  generationTimeMs?: number;
  errorMessage?: string;
  
  previewUrl: string;
  downloadUrl: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// =====================================
// ビルダー設定
// =====================================

/**
 * HTMLビルダー設定
 */
export interface HTMLBuilderConfig {
  indent: number;
  useSemanticTags: boolean;
  includeTailwindCDN: boolean;
  includeMetaTags: boolean;
}

/**
 * Tailwindサイズマッピング
 */
export interface TailwindSizeMap {
  [px: number]: number | string;
}

/**
 * セマンティックタグマッピング
 */
export interface SemanticTagMap {
  [pattern: string]: string;
}

// =====================================
// Export
// =====================================

export default {
  // 型定義のみ
};