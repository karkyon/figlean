// =====================================
// backend/src/services/html/htmlBuilder.ts
// HTMLビルダー - FIGLEAN Phase 9
// 作成日時: 2026年1月12日
// 説明: FigmaノードツリーからHTML文字列を構築
// =====================================

import type {
  FigmaNode,
  HTMLGeneratorOptions,
  HTMLBuilderConfig,
  ProjectBreakpoints
} from '../../types/html';
import { LayoutParser } from './layoutParser';
import { SemanticMapper } from './semanticMapper';
import { TailwindGenerator } from './tailwindGenerator';

/**
 * HTML Builder
 * FigmaノードツリーからHTML文字列を構築
 */
export class HTMLBuilder {
  private config: HTMLBuilderConfig;
  private layoutParser: LayoutParser;
  private semanticMapper: SemanticMapper;
  private tailwindGenerator: TailwindGenerator;

  constructor(config?: Partial<HTMLBuilderConfig>) {
    this.config = {
      indent: config?.indent || 2,
      useSemanticTags: config?.useSemanticTags !== false,
      includeTailwindCDN: config?.includeTailwindCDN !== false,
      includeMetaTags: config?.includeMetaTags !== false
    };

    this.layoutParser = new LayoutParser();
    this.semanticMapper = new SemanticMapper();
    this.tailwindGenerator = new TailwindGenerator();
  }

  /**
   * FigmaノードツリーからHTML文字列を生成
   * 
   * @param rootNode - ルートFigmaノード
   * @param options - 生成オプション
   * @returns HTML文字列
   */
  build(rootNode: FigmaNode, options: HTMLGeneratorOptions): string {
    let html = '';

    // DOCTYPE宣言
    html += '<!DOCTYPE html>\n';
    html += '<html lang="ja">\n';
    html += '<head>\n';
    html += '  <meta charset="UTF-8">\n';

    if (this.config.includeMetaTags) {
      html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
      html += '  <meta name="description" content="FIGLEAN Generated HTML">\n';
    }

    html += '  <title>FIGLEAN Generated HTML</title>\n';

    // Tailwind CDN
    if (this.config.includeTailwindCDN) {
      html += '  <script src="https://cdn.tailwindcss.com"></script>\n';

      // カスタムBreakpoint設定
      if (options.breakpoints) {
        html += this.generateTailwindConfig(options.breakpoints);
      }
    }

    html += '</head>\n';
    html += '<body class="bg-gray-50 min-h-screen">\n';

    // Body内容（再帰的に生成）
    html += this.buildNode(rootNode, 1, options);

    html += '</body>\n';
    html += '</html>\n';

    return html;
  }

  /**
   * ノードをHTMLに変換（再帰）
   * 
   * @param node - Figmaノード
   * @param depth - 階層深度
   * @param options - 生成オプション
   * @returns HTML文字列
   */
  private buildNode(
    node: FigmaNode,
    depth: number,
    options: HTMLGeneratorOptions
  ): string {
    const indentation = ' '.repeat(depth * this.config.indent);
    let html = '';

    if (node.type === 'FRAME') {
      // FRAMEノードの処理
      html += this.buildFrameNode(node, depth, options, indentation);
    } else if (node.type === 'TEXT') {
      // TEXTノードの処理
      html += this.buildTextNode(node, depth, indentation);
    } else if (node.type === 'RECTANGLE') {
      // RECTANGLEノードの処理（装飾用）
      html += this.buildRectangleNode(node, depth, indentation);
    }

    return html;
  }

  /**
   * FRAMEノードをHTMLに変換
   */
  private buildFrameNode(
    node: FigmaNode,
    depth: number,
    options: HTMLGeneratorOptions,
    indentation: string
  ): string {
    let html = '';

    // セマンティックタグを決定
    const tag = this.config.useSemanticTags
      ? this.semanticMapper.mapToHTMLTag(node.name)
      : 'div';

    // クラス生成
    const classes = this.generateClasses(node, options);
    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    // アクセシビリティ属性
    const a11yAttrs = this.semanticMapper.getA11yAttributes(tag, node.name);
    const a11yAttrStr = Object.entries(a11yAttrs)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join('');

    // 開始タグ
    html += `${indentation}<${tag}${classAttr}${a11yAttrStr}>\n`;

    // 子要素を再帰的に処理
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        html += this.buildNode(child, depth + 1, options);
      }
    }

    // 終了タグ
    html += `${indentation}</${tag}>\n`;

    return html;
  }

  /**
   * TEXTノードをHTMLに変換
   */
  private buildTextNode(
    node: FigmaNode,
    _depth: number,
    indentation: string
  ): string {
    const tag = this.semanticMapper.mapTextToHTMLTag(node);
    const text = this.escapeHTML(node.characters || '');

    // テキスト用のクラス生成
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
      } else {
        classes.push('text-base');
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
      }
    }

    // テキスト色（簡易実装）
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const colorClass = this.tailwindGenerator['rgbToTailwindColor'](fill.color);
        if (colorClass && !colorClass.includes('black')) {
          classes.push(`text-${colorClass}`);
        }
      }
    }

    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    return `${indentation}<${tag}${classAttr}>${text}</${tag}>\n`;
  }

  /**
   * RECTANGLEノードをHTMLに変換（装飾用div）
   */
  private buildRectangleNode(
    node: FigmaNode,
    _depth: number,
    indentation: string
  ): string {
    const classes: string[] = [];

    // サイズ
    if (node.absoluteBoundingBox) {
      const width = Math.round(node.absoluteBoundingBox.width);
      const height = Math.round(node.absoluteBoundingBox.height);
      classes.push(`w-[${width}px]`);
      classes.push(`h-[${height}px]`);
    }

    // 色・ボーダー
    const colorClasses = this.tailwindGenerator.generateColorClasses(
      node.fills,
      node.strokes,
      node.cornerRadius
    );
    classes.push(...colorClasses);

    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    return `${indentation}<div${classAttr}></div>\n`;
  }

  /**
   * ノードのクラスを生成
   */
  private generateClasses(node: FigmaNode, options: HTMLGeneratorOptions): string[] {
    const allClasses: string[] = [];

    // Auto Layoutが適用されている場合
    if (this.layoutParser.hasAutoLayout(node)) {
      const layout = this.layoutParser.parseLayout(node);

      // Flex or Grid判定
      const useGrid = options.useGrid && options.includeGrid;
      const childCount = node.children?.length || 0;

      if (useGrid && this.layoutParser.isGridCandidate(node, 100)) {
        // Grid生成
        const gridClasses = this.tailwindGenerator.generateGridClasses(childCount, layout);
        allClasses.push(...gridClasses);
      } else {
        // Flex生成
        const flexClasses = this.tailwindGenerator.generateFlexClasses(layout);
        allClasses.push(...flexClasses);
      }

      // サイジング
      const sizingClasses = this.tailwindGenerator.generateSizingClasses(layout.sizing);
      allClasses.push(...sizingClasses);

      // スペーシング
      const spacingClasses = this.tailwindGenerator.generateSpacingClasses(layout.spacing);
      allClasses.push(...spacingClasses);
    }

    // 色・ボーダー
    const colorClasses = this.tailwindGenerator.generateColorClasses(
      node.fills,
      node.strokes,
      node.cornerRadius
    );
    allClasses.push(...colorClasses);

    // 最適化（重複削除）
    return this.tailwindGenerator.optimizeClasses(allClasses);
  }

  /**
   * Tailwind config生成
   */
  private generateTailwindConfig(breakpoints: ProjectBreakpoints): string {
    return `
  <script>
    tailwind.config = {
      theme: {
        screens: {
          'mobile': '${breakpoints.mobile || 640}px',
          'tablet': '${breakpoints.tablet || 768}px',
          'desktop': '${breakpoints.desktop || 1024}px',
          'wide': '${breakpoints.wide || 1280}px',
        }
      }
    }
  </script>
`;
  }

  /**
   * HTMLエスケープ
   */
  private escapeHTML(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
  }

  /**
   * 生成されたHTMLのメタデータを計算
   */
  calculateMetadata(htmlCode: string): {
    totalLines: number;
    tailwindClasses: number;
    componentCount: number;
  } {
    const lines = htmlCode.split('\n');
    const totalLines = lines.length;

    // Tailwindクラス数をカウント
    const classMatches = htmlCode.match(/class="([^"]*)"/g) || [];
    let tailwindClasses = 0;
    for (const match of classMatches) {
      const classes = match.match(/class="([^"]*)"/)?.[1].split(' ') || [];
      tailwindClasses += classes.length;
    }

    // コンポーネント数（開始タグの数）
    const componentCount = (htmlCode.match(/<\w+[^>]*>/g) || []).length;

    return {
      totalLines,
      tailwindClasses,
      componentCount
    };
  }
}

// =====================================
// Singleton Instance
// =====================================

let htmlBuilderInstance: HTMLBuilder | null = null;

/**
 * HTML Builderのシングルトンインスタンスを取得
 */
export function getHTMLBuilder(): HTMLBuilder {
  if (!htmlBuilderInstance) {
    htmlBuilderInstance = new HTMLBuilder();
  }
  return htmlBuilderInstance;
}

// =====================================
// Export
// =====================================

export default HTMLBuilder;