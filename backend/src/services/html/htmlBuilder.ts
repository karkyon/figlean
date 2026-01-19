/**
 * ==============================================
 * FIGLEAN - HTML Builder（完全版・市販レベル）
 * ==============================================
 * ファイルパス: backend/src/services/html/htmlBuilder.ts
 * 作成日: 2026-01-19
 * 説明: FigmaノードツリーからHTML文字列を生成するメインエンジン
 * ==============================================
 */

import type {
  FigmaNode,
  HTMLGeneratorOptions,
  HTMLBuilderConfig,
  ProjectBreakpoints
} from '../../types/html';
import { LayoutParser, getLayoutParser } from './layoutParser';
import { SemanticMapper, getSemanticMapper } from './semanticMapper';
import { TailwindGenerator, getTailwindGenerator } from './tailwindGenerator';

/**
 * HTML Builder
 * Figmaノードツリー → HTML文字列の変換を行うメインエンジン
 */
export class HTMLBuilder {
  private config: HTMLBuilderConfig;
  private layoutParser: LayoutParser;
  private semanticMapper: SemanticMapper;
  private tailwindGenerator: TailwindGenerator;

  constructor(config: Partial<HTMLBuilderConfig> = {}) {
    this.config = {
      indent: config.indent || 2,
      useSemanticTags: config.useSemanticTags !== false,
      includeTailwindCDN: config.includeTailwindCDN !== false,
      includeMetaTags: config.includeMetaTags !== false
    };

    this.layoutParser = getLayoutParser();
    this.semanticMapper = getSemanticMapper();
    this.tailwindGenerator = getTailwindGenerator();
  }

  /**
   * FigmaノードツリーからHTML文字列を生成（メインエントリポイント）
   */
  build(rootNode: FigmaNode, options: HTMLGeneratorOptions): string {
    let html = '';

    // DOCTYPE宣言
    html += '<!DOCTYPE html>\n';
    html += '<html lang="ja">\n';
    html += '<head>\n';
    html += '  <meta charset="UTF-8">\n';

    // メタタグ
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

    // Body内容を再帰的に生成
    html += this.buildNode(rootNode, 1, options);

    html += '</body>\n';
    html += '</html>\n';

    return html;
  }

  /**
   * ノードをHTMLに変換（再帰的処理）
   */
  private buildNode(
    node: FigmaNode,
    depth: number,
    options: HTMLGeneratorOptions
  ): string {
    const indentation = ' '.repeat(depth * this.config.indent);
    let html = '';

    // ノードタイプ別処理
    switch (node.type) {
      case 'FRAME':
      case 'COMPONENT':
      case 'INSTANCE':
        html += this.buildFrameNode(node, depth, options, indentation);
        break;
      
      case 'TEXT':
        html += this.buildTextNode(node, depth, indentation);
        break;
      
      case 'RECTANGLE':
      case 'VECTOR':
        html += this.buildRectangleNode(node, depth, indentation);
        break;
      
      case 'GROUP':
        // GROUPはdivとして扱う
        html += this.buildGroupNode(node, depth, options, indentation);
        break;
      
      default:
        // その他のノードはスキップ
        break;
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
    const classes = this.generateFrameClasses(node, options);
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
    const classes = this.tailwindGenerator.generateTextClasses(node);
    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    return `${indentation}<${tag}${classAttr}>${text}</${tag}>\n`;
  }

  /**
   * RECTANGLEノードをHTMLに変換（装飾用）
   */
  private buildRectangleNode(
    node: FigmaNode,
    _depth: number,
    indentation: string
  ): string {
    // 色・ボーダー情報を抽出
    const classes = this.tailwindGenerator.generateColorClasses(
      node.fills,
      node.strokes,
      node.cornerRadius
    );

    // サイズ情報を追加
    if (node.absoluteBoundingBox) {
      const width = node.absoluteBoundingBox.width;
      const height = node.absoluteBoundingBox.height;
      
      classes.push(`w-[${Math.round(width)}px]`);
      classes.push(`h-[${Math.round(height)}px]`);
    }

    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

    return `${indentation}<div${classAttr}></div>\n`;
  }

  /**
   * GROUPノードをHTMLに変換
   */
  private buildGroupNode(
    node: FigmaNode,
    depth: number,
    options: HTMLGeneratorOptions,
    indentation: string
  ): string {
    let html = '';

    // 開始タグ
    html += `${indentation}<div class="relative">\n`;

    // 子要素を再帰的に処理
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        html += this.buildNode(child, depth + 1, options);
      }
    }

    // 終了タグ
    html += `${indentation}</div>\n`;

    return html;
  }

  /**
   * FRAMEノードのクラスを生成
   */
  private generateFrameClasses(node: FigmaNode, options: HTMLGeneratorOptions): string[] {
    const allClasses: string[] = [];

    // Auto Layoutが適用されている場合
    if (this.layoutParser.hasAutoLayout(node)) {
      const layout = this.layoutParser.parseLayout(node);

      // Flex or Grid判定
      const useGrid = options.useGrid && options.includeGrid;
      const childCount = node.children?.length || 0;

      if (useGrid && this.layoutParser.isGridCandidate(node, 100)) {
        // Grid生成（FIGLEAN 100%時のみ）
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
    } else {
      // Auto Layoutが無い場合は基本スタイルのみ
      allClasses.push('relative');
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
      const classes = match.match(/class="([^"]*)"/)![1].split(' ');
      tailwindClasses += classes.filter(c => c.length > 0).length;
    }

    // コンポーネント数（開始タグの数）
    const componentCount = (htmlCode.match(/<\w+/g) || []).length;

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
export function getHTMLBuilder(config?: Partial<HTMLBuilderConfig>): HTMLBuilder {
  if (!htmlBuilderInstance || config) {
    htmlBuilderInstance = new HTMLBuilder(config);
  }
  return htmlBuilderInstance;
}

// =====================================
// Export
// =====================================

export default HTMLBuilder;