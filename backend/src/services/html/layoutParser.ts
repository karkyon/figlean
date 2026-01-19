/**
 * ==============================================
 * FIGLEAN - Layout Parser（完全版）
 * ==============================================
 * ファイルパス: backend/src/services/html/layoutParser.ts
 * 作成日: 2026-01-19
 * 説明: Figma Auto Layoutを解析し、Flex/Grid変換情報を抽出
 * ==============================================
 */

import type {
  FigmaNode,
  LayoutInfo,
  SpacingInfo,
  SizingInfo,
  AlignmentInfo,
  LayoutMode,
  LayoutAlign,
  LayoutSizing
} from '../../types/html';

/**
 * Layout Parser
 * Figma Auto Layout情報を解析
 */
export class LayoutParser {
  /**
   * Auto Layoutが適用されているかチェック
   */
  hasAutoLayout(node: FigmaNode): boolean {
    return node.layoutMode !== undefined && node.layoutMode !== 'NONE';
  }

  /**
   * 絶対配置が使用されているかチェック
   */
  hasAbsolutePositioning(node: FigmaNode): boolean {
    // Auto Layoutが無く、絶対座標が設定されている
    return !this.hasAutoLayout(node) && node.absoluteBoundingBox !== undefined;
  }

  /**
   * Grid候補かどうか判定
   * @param node - Figmaノード
   * @param figleanScore - FIGLEANスコア
   */
  isGridCandidate(node: FigmaNode, figleanScore: number): boolean {
    // 100%スコア + 子要素が3個以上
    if (figleanScore < 100) return false;
    if (!node.children || node.children.length < 3) return false;
    
    // Auto Layoutが適用されている
    if (!this.hasAutoLayout(node)) return false;
    
    // Wrap設定がある（グリッド的なレイアウト）
    return node.layoutWrap === 'WRAP';
  }

  /**
   * レイアウト情報を完全解析
   */
  parseLayout(node: FigmaNode): LayoutInfo {
    return {
      direction: this.parseDirection(node.layoutMode),
      wrap: this.parseWrap(node.layoutWrap),
      spacing: this.parseSpacing(node),
      sizing: this.parseSizing(node),
      alignment: this.parseAlignment(node)
    };
  }

  /**
   * 方向を解析
   */
  private parseDirection(layoutMode?: LayoutMode): 'horizontal' | 'vertical' {
    return layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
  }

  /**
   * Wrap設定を解析
   */
  private parseWrap(layoutWrap?: 'NO_WRAP' | 'WRAP'): boolean {
    return layoutWrap === 'WRAP';
  }

  /**
   * スペーシング情報を解析
   */
  private parseSpacing(node: FigmaNode): SpacingInfo {
    return {
      gap: node.itemSpacing || 0,
      paddingTop: node.paddingTop || 0,
      paddingBottom: node.paddingBottom || 0,
      paddingLeft: node.paddingLeft || 0,
      paddingRight: node.paddingRight || 0
    };
  }

  /**
   * サイジング情報を解析
   */
  private parseSizing(node: FigmaNode): SizingInfo {
    const width = node.layoutSizingHorizontal || 'FIXED';
    const height = node.layoutSizingVertical || 'FIXED';
    
    let widthValue: number | undefined;
    let heightValue: number | undefined;
    
    // FIXED時のサイズ値を取得
    if (width === 'FIXED' && node.absoluteBoundingBox) {
      widthValue = node.absoluteBoundingBox.width;
    }
    
    if (height === 'FIXED' && node.absoluteBoundingBox) {
      heightValue = node.absoluteBoundingBox.height;
    }
    
    return {
      width: this.convertLayoutSizing(width),
      height: this.convertLayoutSizing(height),
      widthValue,
      heightValue
    };
  }

  /**
   * LayoutSizingを内部形式に変換
   */
  private convertLayoutSizing(sizing: LayoutSizing): 'FIXED' | 'HUG' | 'FILL' {
    // Figmaの型定義と内部型が同じなのでそのまま返す
    return sizing;
  }

  /**
   * アライメント情報を解析
   */
  private parseAlignment(node: FigmaNode): AlignmentInfo {
    const alignItems = this.convertToAlignItems(node.counterAxisAlignItems);
    const justifyContent = this.convertToJustifyContent(node.primaryAxisAlignItems);
    
    return {
      alignItems,
      justifyContent
    };
  }

  /**
   * Figma AlignItems → CSS AlignItems
   */
  private convertToAlignItems(align?: LayoutAlign): AlignmentInfo['alignItems'] {
    switch (align) {
      case 'MIN':
        return 'START';
      case 'CENTER':
        return 'CENTER';
      case 'MAX':
        return 'END';
      case 'STRETCH':
        return 'STRETCH';
      case 'INHERIT':
      default:
        return 'STRETCH';
    }
  }

  /**
   * Figma JustifyContent → CSS JustifyContent
   */
  private convertToJustifyContent(align?: LayoutAlign): AlignmentInfo['justifyContent'] {
    switch (align) {
      case 'MIN':
        return 'START';
      case 'CENTER':
        return 'CENTER';
      case 'MAX':
        return 'END';
      case 'STRETCH':
        return 'SPACE_BETWEEN'; // STRETCHはSPACE_BETWEENに変換
      case 'INHERIT':
      default:
        return 'START';
    }
  }

  /**
   * 固定サイズが使用されているかチェック
   */
  hasFixedSize(node: FigmaNode): boolean {
    return (
      node.layoutSizingHorizontal === 'FIXED' ||
      node.layoutSizingVertical === 'FIXED'
    );
  }

  /**
   * Wrap設定が無効かチェック
   */
  hasWrapDisabled(node: FigmaNode): boolean {
    return this.hasAutoLayout(node) && node.layoutWrap === 'NO_WRAP';
  }
}

// =====================================
// Singleton Instance
// =====================================

let layoutParserInstance: LayoutParser | null = null;

/**
 * Layout Parserのシングルトンインスタンスを取得
 */
export function getLayoutParser(): LayoutParser {
  if (!layoutParserInstance) {
    layoutParserInstance = new LayoutParser();
  }
  return layoutParserInstance;
}

// =====================================
// Export
// =====================================

export default LayoutParser;