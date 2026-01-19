/**
 * ==============================================
 * FIGLEAN - Semantic Mapper（完全版）
 * ==============================================
 * ファイルパス: backend/src/services/html/semanticMapper.ts
 * 作成日: 2026-01-19
 * 説明: Figmaフレーム名からセマンティックHTMLタグを推論
 * ==============================================
 */

import type { FigmaNode, SemanticTagMap } from '../../types/html';

/**
 * Semantic Mapper
 * Figma名からセマンティックHTMLタグを推論
 */
export class SemanticMapper {
  /**
   * セマンティックタグマッピング
   * 正規表現パターン → HTMLタグ
   */
  private static readonly TAG_MAP: SemanticTagMap = {
    // ヘッダー
    '^(header|ヘッダー|Header)': 'header',
    
    // ナビゲーション
    '^(nav|navigation|ナビ|ナビゲーション|menu|メニュー)': 'nav',
    
    // メインコンテンツ
    '^(main|メイン|content|コンテンツ)': 'main',
    
    // フッター
    '^(footer|フッター|Footer)': 'footer',
    
    // セクション
    '^(section|セクション|Section)': 'section',
    
    // アーティクル
    '^(article|記事|Article)': 'article',
    
    // サイドバー
    '^(aside|sidebar|サイドバー|Sidebar)': 'aside',
    
    // カード
    '^(card|カード|Card)': 'article',
    
    // リスト
    '^(list|リスト|List|items|アイテム)': 'ul',
    
    // ボタン
    '^(button|ボタン|Button|btn)': 'button',
    
    // フォーム
    '^(form|フォーム|Form)': 'form'
  };

  /**
   * Figmaフレーム名からHTMLタグを推論
   */
  mapToHTMLTag(frameName: string): string {
    // パターンマッチング
    for (const [pattern, tag] of Object.entries(SemanticMapper.TAG_MAP)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(frameName)) {
        return tag as string;
      }
    }
    
    // デフォルトはdiv
    return 'div';
  }

  /**
   * TEXTノードからHTMLタグを推論
   */
  mapTextToHTMLTag(node: FigmaNode): string {
    // フォントサイズから判定
    const fontSize = node.style?.fontSize || 16;
    
    if (fontSize >= 48) {
      return 'h1';
    } else if (fontSize >= 36) {
      return 'h2';
    } else if (fontSize >= 28) {
      return 'h3';
    } else if (fontSize >= 24) {
      return 'h4';
    } else if (fontSize >= 20) {
      return 'h5';
    } else if (fontSize >= 18) {
      return 'h6';
    }
    
    // フォントウェイトも考慮
    const fontWeight = node.style?.fontWeight || 400;
    if (fontWeight >= 700) {
      return 'strong';
    }
    
    // デフォルトはp
    return 'p';
  }

  /**
   * アクセシビリティ属性を取得
   */
  getA11yAttributes(tag: string, frameName: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    
    // roleとaria-labelを設定
    switch (tag) {
      case 'nav':
        attrs['role'] = 'navigation';
        attrs['aria-label'] = this.generateAriaLabel(frameName, 'ナビゲーション');
        break;
      
      case 'header':
        attrs['role'] = 'banner';
        break;
      
      case 'footer':
        attrs['role'] = 'contentinfo';
        break;
      
      case 'main':
        attrs['role'] = 'main';
        break;
      
      case 'aside':
        attrs['role'] = 'complementary';
        attrs['aria-label'] = this.generateAriaLabel(frameName, 'サイドバー');
        break;
      
      case 'button':
        attrs['type'] = 'button';
        attrs['aria-label'] = this.generateAriaLabel(frameName, 'ボタン');
        break;
      
      case 'form':
        attrs['role'] = 'form';
        attrs['aria-label'] = this.generateAriaLabel(frameName, 'フォーム');
        break;
    }
    
    return attrs;
  }

  /**
   * aria-labelを生成
   */
  private generateAriaLabel(frameName: string, defaultLabel: string): string {
    // フレーム名がある場合はそれを使用
    if (frameName && frameName.length > 0 && frameName.toLowerCase() !== 'frame') {
      return frameName;
    }
    
    // デフォルトラベル
    return defaultLabel;
  }

  /**
   * セマンティックな名前かどうかチェック
   */
  isSemanticName(frameName: string): boolean {
    const lowerName = frameName.toLowerCase().trim();
    
    // セマンティックなキーワードが含まれているかチェック
    const semanticKeywords = [
      'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
      'ヘッダー', 'フッター', 'ナビ', 'メイン', 'セクション',
      'content', 'menu', 'sidebar', 'card'
    ];
    
    return semanticKeywords.some(keyword => lowerName.includes(keyword));
  }

  /**
   * フレーム名からコンポーネント名を生成（React/Vue用）
   */
  generateComponentName(frameName: string): string {
    // キャメルケースに変換
    const cleaned = frameName
      .replace(/[^\w\s]/g, '')
      .trim();
    
    const words = cleaned.split(/\s+/);
    const pascalCase = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    // 数字で始まる場合は"Component"を前置
    if (/^\d/.test(pascalCase)) {
      return `Component${pascalCase}`;
    }
    
    return pascalCase || 'Component';
  }
}

// =====================================
// Singleton Instance
// =====================================

let semanticMapperInstance: SemanticMapper | null = null;

/**
 * Semantic Mapperのシングルトンインスタンスを取得
 */
export function getSemanticMapper(): SemanticMapper {
  if (!semanticMapperInstance) {
    semanticMapperInstance = new SemanticMapper();
  }
  return semanticMapperInstance;
}

// =====================================
// Export
// =====================================

export default SemanticMapper;