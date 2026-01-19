/**
 * ==============================================
 * FIGLEAN - Tailwind Generator（完全版）
 * ==============================================
 * ファイルパス: backend/src/services/html/tailwindGenerator.ts
 * 作成日: 2026-01-19
 * 説明: レイアウト情報からTailwind CSSクラスを生成
 * ==============================================
 */

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
 * レイアウト情報からTailwind CSSクラスを生成
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
    176: 44,
    192: 48,
    208: 52,
    224: 56,
    240: 60,
    256: 64,
    288: 72,
    320: 80,
    384: 96
  };

  /**
   * Flexboxクラス生成
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
      classes.push(this.convertToTailwindSpacing(layout.spacing.gap, 'gap'));
    }
    
    // Alignment
    classes.push(...this.generateAlignmentClasses(layout.alignment));
    
    return classes;
  }

  /**
   * Gridクラス生成（FIGLEAN 100%時のみ）
   */
  generateGridClasses(childCount: number, layout: LayoutInfo): string[] {
    const classes: string[] = ['grid'];
    
    // カラム数を自動判定
    let cols = this.calculateOptimalColumns(childCount);
    
    // レスポンシブGridカラム
    classes.push('grid-cols-1'); // モバイル: 1列
    classes.push(`md:grid-cols-${Math.min(cols, 2)}`); // タブレット: 最大2列
    classes.push(`lg:grid-cols-${cols}`); // デスクトップ: 最適列数
    
    // Gap
    if (layout.spacing.gap > 0) {
      classes.push(this.convertToTailwindSpacing(layout.spacing.gap, 'gap'));
    }
    
    return classes;
  }

  /**
   * 最適なカラム数を計算
   */
  private calculateOptimalColumns(childCount: number): number {
    if (childCount <= 2) return childCount;
    if (childCount <= 4) return 2;
    if (childCount <= 9) return 3;
    if (childCount <= 16) return 4;
    return 5;
  }

  /**
   * サイジングクラス生成
   */
  generateSizingClasses(sizing: SizingInfo): string[] {
    const classes: string[] = [];
    
    // Width
    switch (sizing.width) {
      case 'FILL':
        classes.push('w-full');
        break;
      case 'HUG':
        classes.push('w-auto');
        break;
      case 'FIXED':
        if (sizing.widthValue) {
          classes.push(this.convertToTailwindSize(sizing.widthValue, 'w'));
        }
        break;
    }
    
    // Height
    switch (sizing.height) {
      case 'FILL':
        classes.push('h-full');
        break;
      case 'HUG':
        classes.push('h-auto');
        break;
      case 'FIXED':
        if (sizing.heightValue) {
          classes.push(this.convertToTailwindSize(sizing.heightValue, 'h'));
        }
        break;
    }
    
    return classes;
  }

  /**
   * スペーシングクラス生成
   */
  generateSpacingClasses(spacing: SpacingInfo): string[] {
    const classes: string[] = [];
    
    // Padding（個別指定）
    if (spacing.paddingTop > 0) {
      classes.push(this.convertToTailwindSpacing(spacing.paddingTop, 'pt'));
    }
    if (spacing.paddingBottom > 0) {
      classes.push(this.convertToTailwindSpacing(spacing.paddingBottom, 'pb'));
    }
    if (spacing.paddingLeft > 0) {
      classes.push(this.convertToTailwindSpacing(spacing.paddingLeft, 'pl'));
    }
    if (spacing.paddingRight > 0) {
      classes.push(this.convertToTailwindSpacing(spacing.paddingRight, 'pr'));
    }
    
    return classes;
  }

  /**
   * アライメントクラス生成
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
   * 色クラス生成（背景・ボーダー）
   */
  generateColorClasses(
    fills?: any[],
    strokes?: any[],
    cornerRadius?: number
  ): string[] {
    const classes: string[] = [];
    
    // 背景色
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
    if (cornerRadius && cornerRadius > 0) {
      classes.push(this.convertToTailwindRadius(cornerRadius));
    }
    
    return classes;
  }

  /**
   * テキストクラス生成
   */
  generateTextClasses(node: any): string[] {
    const classes: string[] = [];
    
    // フォントサイズ
    if (node.style?.fontSize) {
      const fontSize = node.style.fontSize;
      if (fontSize >= 48) {
        classes.push('text-5xl');
      } else if (fontSize >= 36) {
        classes.push('text-4xl');
      } else if (fontSize >= 30) {
        classes.push('text-3xl');
      } else if (fontSize >= 24) {
        classes.push('text-2xl');
      } else if (fontSize >= 20) {
        classes.push('text-xl');
      } else if (fontSize >= 18) {
        classes.push('text-lg');
      } else if (fontSize >= 14) {
        classes.push('text-base');
      } else {
        classes.push('text-sm');
      }
    }
    
    // フォントウェイト
    if (node.style?.fontWeight) {
      const weight = node.style.fontWeight;
      if (weight >= 700) {
        classes.push('font-bold');
      } else if (weight >= 600) {
        classes.push('font-semibold');
      } else if (weight >= 500) {
        classes.push('font-medium');
      } else if (weight <= 300) {
        classes.push('font-light');
      }
    }
    
    // テキスト色
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const colorClass = this.rgbToTailwindColor(fill.color);
        if (colorClass && !colorClass.includes('white')) {
          classes.push(`text-${colorClass}`);
        }
      }
    }
    
    // テキストアライメント
    if (node.style?.textAlignHorizontal) {
      switch (node.style.textAlignHorizontal) {
        case 'LEFT':
          classes.push('text-left');
          break;
        case 'CENTER':
          classes.push('text-center');
          break;
        case 'RIGHT':
          classes.push('text-right');
          break;
        case 'JUSTIFIED':
          classes.push('text-justify');
          break;
      }
    }
    
    return classes;
  }

  /**
   * レスポンシブクラス生成
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
   * px値をTailwindスペーシングクラスに変換
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
   * RGBをTailwind色クラスに変換
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
    
    // 青系
    if (b > r && b > g) {
      const intensity = Math.round((b / 255) * 9) * 100;
      return `blue-${intensity}`;
    }
    
    // 緑系
    if (g > r && g > b) {
      const intensity = Math.round((g / 255) * 9) * 100;
      return `green-${intensity}`;
    }
    
    // 赤系
    if (r > g && r > b) {
      const intensity = Math.round((r / 255) * 9) * 100;
      return `red-${intensity}`;
    }
    
    // カスタム色（16進数）
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return `[${hex}]`;
  }

  /**
   * 角丸をTailwindクラスに変換
   */
  private convertToTailwindRadius(radius: number): string {
    if (radius === 0) {
      return 'rounded-none';
    } else if (radius <= 2) {
      return 'rounded-sm';
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