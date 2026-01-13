// =====================================
// backend/src/services/html/tailwindGenerator.ts
// Tailwindジェネレーター - FIGLEAN Phase 9
// 作成日時: 2026年1月12日
// 説明: Figma情報からTailwind CSSクラスを生成
// =====================================

import type {
  LayoutInfo,
  SizingInfo,
  SpacingInfo,
  AlignmentInfo,
  ProjectBreakpoints,
  TailwindSizeMap
} from '../../types/html';

/**
 * Tailwind Generator
 * Figma情報からTailwind CSSクラスを生成
 */
export class TailwindGenerator {
  /**
   * Tailwindサイズマッピング（4px単位）
   */
  private static readonly SIZE_MAP: TailwindSizeMap = {
    0: 0,
    4: 1,
    8: 2,
    12: 3,
    16: 4,
    20: 5,
    24: 6,
    28: 7,
    32: 8,
    36: 9,
    40: 10,
    44: 11,
    48: 12,
    56: 14,
    64: 16,
    80: 20,
    96: 24,
    112: 28,
    128: 32,
    144: 36,
    160: 40,
    192: 48,
    224: 56,
    256: 64,
    320: 80,
    384: 96
  };

  /**
   * Flexboxクラス生成
   * 
   * @param layout - レイアウト情報
   * @returns Tailwindクラス配列
   */
  generateFlexClasses(layout: LayoutInfo): string[] {
    const classes: string[] = ['flex'];
    
    // Direction
    if (layout.direction === 'horizontal') {
      classes.push('flex-row');
    } else {
      classes.push('flex-col');
    }
    
    // Wrap
    if (layout.wrap) {
      classes.push('flex-wrap');
    }
    
    // Gap
    if (layout.spacing.gap > 0) {
      const gapClass = this.convertToTailwindSpacing(layout.spacing.gap, 'gap');
      classes.push(gapClass);
    }
    
    // Alignment
    classes.push(...this.generateAlignmentClasses(layout.alignment));
    
    return classes;
  }

  /**
   * Gridクラス生成（FIGLEAN 100%時のみ）
   * 
   * @param childCount - 子要素数
   * @param layout - レイアウト情報
   * @returns Tailwindクラス配列
   */
  generateGridClasses(childCount: number, layout: LayoutInfo): string[] {
    const classes: string[] = ['grid'];
    
    // カラム数を自動判定
    let cols = 3; // デフォルト
    
    if (childCount <= 2) {
      cols = childCount;
    } else if (childCount <= 4) {
      cols = 2;
    } else if (childCount <= 9) {
      cols = 3;
    } else {
      cols = 4;
    }
    
    // Grid columns（レスポンシブ対応）
    classes.push('grid-cols-1');
    classes.push(`md:grid-cols-${Math.min(cols, 2)}`);
    classes.push(`lg:grid-cols-${cols}`);
    
    // Gap
    if (layout.spacing.gap > 0) {
      const gapClass = this.convertToTailwindSpacing(layout.spacing.gap, 'gap');
      classes.push(gapClass);
    }
    
    return classes;
  }

  /**
   * サイジングクラス生成
   * 
   * @param sizing - サイジング情報
   * @returns Tailwindクラス配列
   */
  generateSizingClasses(sizing: SizingInfo): string[] {
    const classes: string[] = [];
    
    // Width
    if (sizing.width === 'FILL') {
      classes.push('w-full');
    } else if (sizing.width === 'HUG') {
      classes.push('w-auto');
    } else if (sizing.width === 'FIXED' && sizing.widthValue) {
      const widthClass = this.convertToTailwindSize(sizing.widthValue, 'w');
      classes.push(widthClass);
    }
    
    // Height
    if (sizing.height === 'FILL') {
      classes.push('h-full');
    } else if (sizing.height === 'HUG') {
      classes.push('h-auto');
    } else if (sizing.height === 'FIXED' && sizing.heightValue) {
      const heightClass = this.convertToTailwindSize(sizing.heightValue, 'h');
      classes.push(heightClass);
    }
    
    // Min/Max Width
    if (sizing.minWidth) {
      const minClass = this.convertToTailwindSize(sizing.minWidth, 'min-w');
      classes.push(minClass);
    }
    if (sizing.maxWidth) {
      const maxClass = this.convertToTailwindSize(sizing.maxWidth, 'max-w');
      classes.push(maxClass);
    }
    
    return classes;
  }

  /**
   * スペーシングクラス生成
   * 
   * @param spacing - スペーシング情報
   * @returns Tailwindクラス配列
   */
  generateSpacingClasses(spacing: SpacingInfo): string[] {
    const classes: string[] = [];
    const { top, right, bottom, left } = spacing.padding;
    
    // Padding最適化（全方向同じ場合）
    if (top === bottom && left === right) {
      if (top === left && top > 0) {
        // 全方向同じ
        const pClass = this.convertToTailwindSpacing(top, 'p');
        classes.push(pClass);
      } else {
        // 上下・左右が同じ
        if (top > 0) {
          const pyClass = this.convertToTailwindSpacing(top, 'py');
          classes.push(pyClass);
        }
        if (left > 0) {
          const pxClass = this.convertToTailwindSpacing(left, 'px');
          classes.push(pxClass);
        }
      }
    } else {
      // 個別指定
      if (top > 0) {
        classes.push(this.convertToTailwindSpacing(top, 'pt'));
      }
      if (right > 0) {
        classes.push(this.convertToTailwindSpacing(right, 'pr'));
      }
      if (bottom > 0) {
        classes.push(this.convertToTailwindSpacing(bottom, 'pb'));
      }
      if (left > 0) {
        classes.push(this.convertToTailwindSpacing(left, 'pl'));
      }
    }
    
    return classes;
  }

  /**
   * アライメントクラス生成
   * 
   * @param alignment - アライメント情報
   * @returns Tailwindクラス配列
   */
  private generateAlignmentClasses(alignment: AlignmentInfo): string[] {
    const classes: string[] = [];
    
    // AlignItems
    switch (alignment.alignItems) {
      case 'START':
        classes.push('items-start');
        break;
      case 'CENTER':
        classes.push('items-center');
        break;
      case 'END':
        classes.push('items-end');
        break;
      case 'BASELINE':
        classes.push('items-baseline');
        break;
      case 'STRETCH':
        classes.push('items-stretch');
        break;
    }
    
    // JustifyContent
    switch (alignment.justifyContent) {
      case 'START':
        classes.push('justify-start');
        break;
      case 'CENTER':
        classes.push('justify-center');
        break;
      case 'END':
        classes.push('justify-end');
        break;
      case 'SPACE_BETWEEN':
        classes.push('justify-between');
        break;
      case 'SPACE_AROUND':
        classes.push('justify-around');
        break;
      case 'SPACE_EVENLY':
        classes.push('justify-evenly');
        break;
    }
    
    return classes;
  }

  /**
   * レスポンシブクラス生成
   * 
   * @param baseClasses - ベースクラス
   * @param breakpoints - Breakpoint設定
   * @returns レスポンシブクラス配列
   */
  generateResponsiveClasses(
    baseClasses: string[],
    _breakpoints?: ProjectBreakpoints
  ): string[] {
    // 現時点ではbaseClassesをそのまま返す
    // 将来的にBreakpoint別の調整を実装可能
    return [...baseClasses];
  }

  /**
   * 色クラス生成（背景・ボーダー）
   * 
   * @param fills - Figma fills
   * @param strokes - Figma strokes
   * @param cornerRadius - 角丸
   * @returns Tailwindクラス配列
   */
  generateColorClasses(
    fills?: any[],
    strokes?: any[],
    cornerRadius?: number
  ): string[] {
    const classes: string[] = [];
    
    // 背景色（簡易実装）
    if (fills && fills.length > 0 && fills[0].visible !== false) {
      const fill = fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const colorClass = this.rgbToTailwindColor(fill.color);
        if (colorClass) {
          classes.push(`bg-${colorClass}`);
        }
      }
    }
    
    // ボーダー
    if (strokes && strokes.length > 0 && strokes[0].visible !== false) {
      classes.push('border');
      const stroke = strokes[0];
      if (stroke.type === 'SOLID' && stroke.color) {
        const colorClass = this.rgbToTailwindColor(stroke.color);
        if (colorClass) {
          classes.push(`border-${colorClass}`);
        }
      }
    }
    
    // 角丸
    if (cornerRadius) {
      const radiusClass = this.convertToTailwindRadius(cornerRadius);
      classes.push(radiusClass);
    }
    
    return classes;
  }

  /**
   * px値をTailwindスペーシングクラスに変換
   * 
   * @param px - px値
   * @param prefix - クラスプレフィックス
   * @returns Tailwindクラス
   */
  private convertToTailwindSpacing(px: number, prefix: string): string {
    // 標準サイズマッピング
    if (TailwindGenerator.SIZE_MAP[px] !== undefined) {
      return `${prefix}-${TailwindGenerator.SIZE_MAP[px]}`;
    }
    
    // 近似値を探す
    const nearestSize = this.findNearestSize(px);
    if (nearestSize !== null) {
      return `${prefix}-${TailwindGenerator.SIZE_MAP[nearestSize]}`;
    }
    
    // カスタム値（[]表記）
    return `${prefix}-[${px}px]`;
  }

  /**
   * px値をTailwindサイズクラスに変換
   * 
   * @param px - px値
   * @param prefix - クラスプレフィックス
   * @returns Tailwindクラス
   */
  private convertToTailwindSize(px: number, prefix: string): string {
    // 標準サイズマッピング
    if (TailwindGenerator.SIZE_MAP[px] !== undefined) {
      return `${prefix}-${TailwindGenerator.SIZE_MAP[px]}`;
    }
    
    // カスタム値
    return `${prefix}-[${px}px]`;
  }

  /**
   * 最も近いサイズを探す
   * 
   * @param px - px値
   * @returns 最も近いサイズ（nullの場合はカスタム値）
   */
  private findNearestSize(px: number): number | null {
    const sizes = Object.keys(TailwindGenerator.SIZE_MAP).map(Number);
    
    let nearest: number | null = null;
    let minDiff = Infinity;
    
    for (const size of sizes) {
      const diff = Math.abs(px - size);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = size;
      }
    }
    
    // 差が4px以内なら近似値として使用
    if (nearest !== null && minDiff <= 4) {
      return nearest;
    }
    
    return null;
  }

  /**
   * RGBをTailwind色クラスに変換（簡易実装）
   * 
   * @param color - Figma color {r, g, b, a}
   * @returns Tailwind色クラス
   */
  private rgbToTailwindColor(color: { r: number; g: number; b: number; a?: number }): string | null {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    // 基本色の判定
    if (r === 255 && g === 255 && b === 255) {
      return 'white';
    } else if (r === 0 && g === 0 && b === 0) {
      return 'black';
    } else if (r === g && g === b) {
      // グレースケール
      const grayLevel = Math.round((r / 255) * 9) * 100;
      return `gray-${grayLevel}`;
    }
    
    // カスタム色（16進数）
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return `[${hex}]`;
  }

  /**
   * 角丸をTailwindクラスに変換
   * 
   * @param radius - 角丸px値
   * @returns Tailwindクラス
   */
  private convertToTailwindRadius(radius: number): string {
    if (radius === 0) {
      return 'rounded-none';
    } else if (radius <= 4) {
      return 'rounded';
    } else if (radius <= 6) {
      return 'rounded-md';
    } else if (radius <= 8) {
      return 'rounded-lg';
    } else if (radius <= 12) {
      return 'rounded-xl';
    } else if (radius <= 16) {
      return 'rounded-2xl';
    } else if (radius <= 24) {
      return 'rounded-3xl';
    } else {
      return 'rounded-full';
    }
  }

  /**
   * クラス配列を最適化（重複削除）
   * 
   * @param classes - クラス配列
   * @returns 最適化されたクラス配列
   */
  optimizeClasses(classes: string[]): string[] {
    // 重複削除
    const uniqueClasses = [...new Set(classes)];
    
    // 空文字列削除
    return uniqueClasses.filter(c => c.length > 0);
  }
}

// =====================================
// Singleton Instance
// =====================================

let tailwindGeneratorInstance: TailwindGenerator | null = null;

/**
 * Tailwind Generatorのシングルトンインスタンスを取得
 */
export function getTailwindGenerator(): TailwindGenerator {
  if (!tailwindGeneratorInstance) {
    tailwindGeneratorInstance = new TailwindGenerator();
  }
  return tailwindGeneratorInstance;
}

// =====================================
// Export
// =====================================

export default TailwindGenerator;