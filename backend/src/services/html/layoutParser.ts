// =====================================
// backend/src/services/html/layoutParser.ts
// レイアウトパーサー - FIGLEAN Phase 9
// 作成日時: 2026年1月12日
// 説明: Figma Auto LayoutからFlexbox/Grid情報を抽出
// =====================================

import type {
  FigmaNode,
  LayoutInfo,
  LayoutDirection,
  SizingInfo,
  SizingMode,
  SpacingInfo,
  AlignmentInfo,
  AlignItems,
  JustifyContent
} from '../../types/html';

/**
 * Layout Parser
 * Figma Auto Layoutを解析してFlexbox/Grid情報を抽出
 */
export class LayoutParser {
  /**
   * Auto Layout情報を解析
   * 
   * @param node - 解析対象のFigmaノード
   * @returns レイアウト情報
   */
  parseLayout(node: FigmaNode): LayoutInfo {
    return {
      direction: this.getDirection(node),
      sizing: this.getSizing(node),
      spacing: this.getSpacing(node),
      alignment: this.getAlignment(node),
      wrap: this.getWrap(node)
    };
  }

  /**
   * レイアウト方向を取得
   * 
   * @param node - Figmaノード
   * @returns horizontal or vertical
   */
  private getDirection(node: FigmaNode): LayoutDirection {
    if (node.layoutMode === 'HORIZONTAL') {
      return 'horizontal';
    } else if (node.layoutMode === 'VERTICAL') {
      return 'vertical';
    }
    
    // デフォルトはvertical
    return 'vertical';
  }

  /**
   * サイジング情報を取得
   * 
   * @param node - Figmaノード
   * @returns サイジング情報
   */
  private getSizing(node: FigmaNode): SizingInfo {
    const widthMode = this.parseSizingMode(
      node.primaryAxisSizingMode || 'FIXED'
    );
    const heightMode = this.parseSizingMode(
      node.counterAxisSizingMode || 'FIXED'
    );

    const sizing: SizingInfo = {
      width: widthMode,
      height: heightMode
    };

    // 絶対サイズがある場合は値を設定
    if (node.absoluteBoundingBox) {
      sizing.widthValue = Math.round(node.absoluteBoundingBox.width);
      sizing.heightValue = Math.round(node.absoluteBoundingBox.height);
    }

    // 最小・最大サイズ
    if (node.minWidth !== undefined) {
      sizing.minWidth = node.minWidth;
    }
    if (node.maxWidth !== undefined) {
      sizing.maxWidth = node.maxWidth;
    }
    if (node.minHeight !== undefined) {
      sizing.minHeight = node.minHeight;
    }
    if (node.maxHeight !== undefined) {
      sizing.maxHeight = node.maxHeight;
    }

    return sizing;
  }

  /**
   * サイジングモードを変換
   * 
   * @param mode - Figmaのサイジングモード
   * @returns 標準化されたサイジングモード
   */
  private parseSizingMode(mode: string): SizingMode {
    switch (mode) {
      case 'FIXED':
        return 'FIXED';
      case 'AUTO':
        return 'HUG';
      case 'FILL':
        return 'FILL';
      default:
        return 'AUTO';
    }
  }

  /**
   * スペーシング情報を取得
   * 
   * @param node - Figmaノード
   * @returns スペーシング情報
   */
  private getSpacing(node: FigmaNode): SpacingInfo {
    return {
      gap: node.itemSpacing || 0,
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0
      }
    };
  }

  /**
   * アライメント情報を取得
   * 
   * @param node - Figmaノード
   * @returns アライメント情報
   */
  private getAlignment(node: FigmaNode): AlignmentInfo {
    const alignItems = this.parseAlignItems(
      node.primaryAxisAlignItems || 'MIN'
    );
    const justifyContent = this.parseJustifyContent(
      node.counterAxisAlignItems || 'MIN'
    );

    return {
      alignItems,
      justifyContent
    };
  }

  /**
   * AlignItemsを変換
   * 
   * @param align - Figmaのアライメント値
   * @returns 標準化されたAlignItems
   */
  private parseAlignItems(align: string): AlignItems {
    switch (align) {
      case 'MIN':
        return 'START';
      case 'CENTER':
        return 'CENTER';
      case 'MAX':
        return 'END';
      case 'BASELINE':
        return 'BASELINE';
      case 'STRETCH':
        return 'STRETCH';
      default:
        return 'START';
    }
  }

  /**
   * JustifyContentを変換
   * 
   * @param align - Figmaのアライメント値
   * @returns 標準化されたJustifyContent
   */
  private parseJustifyContent(align: string): JustifyContent {
    switch (align) {
      case 'MIN':
        return 'START';
      case 'CENTER':
        return 'CENTER';
      case 'MAX':
        return 'END';
      case 'SPACE_BETWEEN':
        return 'SPACE_BETWEEN';
      case 'SPACE_AROUND':
        return 'SPACE_AROUND';
      case 'SPACE_EVENLY':
        return 'SPACE_EVENLY';
      default:
        return 'START';
    }
  }

  /**
   * Wrap設定を取得
   * 
   * @param node - Figmaノード
   * @returns Wrap有効か
   */
  private getWrap(node: FigmaNode): boolean {
    return node.layoutWrap === 'WRAP';
  }

  /**
   * Auto Layoutが適用されているかチェック
   * 
   * @param node - Figmaノード
   * @returns Auto Layout適用済みか
   */
  hasAutoLayout(node: FigmaNode): boolean {
    return node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL';
  }

  /**
   * Grid候補かチェック
   * 
   * @param node - Figmaノード
   * @param score - FIGLEANスコア
   * @returns Grid使用候補か
   */
  isGridCandidate(node: FigmaNode, score: number): boolean {
    // スコアが100%でない場合はGrid不可
    if (score !== 100) {
      return false;
    }

    // Auto Layoutが必須
    if (!this.hasAutoLayout(node)) {
      return false;
    }

    // Wrapが有効
    if (!this.getWrap(node)) {
      return false;
    }

    // 子要素が4個以上
    const childCount = node.children?.length || 0;
    if (childCount < 4) {
      return false;
    }

    return true;
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