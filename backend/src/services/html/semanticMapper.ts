// =====================================
// backend/src/services/html/semanticMapper.ts
// セマンティックマッパー - FIGLEAN Phase 9
// 作成日時: 2026年1月12日
// 説明: Frame名からセマンティックHTMLタグへマッピング
// =====================================

import type { FigmaNode, SemanticTagMap } from '../../types/html';

/**
 * Semantic Mapper
 * Frame名からHTMLタグを推論
 */
export class SemanticMapper {
  /**
   * セマンティックパターンマッピング
   * 正規表現パターン → HTMLタグ
   */
  private static readonly SEMANTIC_PATTERNS: SemanticTagMap = {
    // セクション系
    '^section-': 'section',
    '^section_': 'section',
    'Section$': 'section',
    
    // 記事・コンテンツ
    '^article-': 'article',
    '^article_': 'article',
    'Article$': 'article',
    
    // ヘッダー
    '^header-': 'header',
    '^header_': 'header',
    'Header$': 'header',
    
    // フッター
    '^footer-': 'footer',
    '^footer_': 'footer',
    'Footer$': 'footer',
    
    // ナビゲーション
    '^nav-': 'nav',
    '^nav_': 'nav',
    '^navigation-': 'nav',
    'Nav$': 'nav',
    'Navigation$': 'nav',
    
    // メインコンテンツ
    '^main-': 'main',
    '^main_': 'main',
    'Main$': 'main',
    
    // サイドバー
    '^aside-': 'aside',
    '^aside_': 'aside',
    '^sidebar-': 'aside',
    'Aside$': 'aside',
    'Sidebar$': 'aside',
    
    // ボタン
    '^button-': 'button',
    '^button_': 'button',
    '^btn-': 'button',
    '^btn_': 'button',
    'Button$': 'button',
    'Btn$': 'button',
    
    // 入力フィールド
    '^input-': 'input',
    '^input_': 'input',
    'Input$': 'input',
    
    // フォーム
    '^form-': 'form',
    '^form_': 'form',
    'Form$': 'form'
  };

  /**
   * Frame名からHTMLタグを推論
   * 
   * @param frameName - Figma Frame名
   * @returns HTMLタグ名
   */
  mapToHTMLTag(frameName: string): string {
    // セマンティックパターンをチェック
    for (const [pattern, tag] of Object.entries(SemanticMapper.SEMANTIC_PATTERNS)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(frameName)) {
        return tag;
      }
    }
    
    // デフォルトはdiv
    return 'div';
  }

  /**
   * テキストノードからHTMLタグを推論
   * フォントサイズに基づいて見出しレベルを判定
   * 
   * @param node - Figmaテキストノード
   * @returns HTMLタグ名
   */
  mapTextToHTMLTag(node: FigmaNode): string {
    const fontSize = node.style?.fontSize || 16;
    
    // 見出しサイズの判定
    if (fontSize >= 32) {
      return 'h1';
    } else if (fontSize >= 28) {
      return 'h2';
    } else if (fontSize >= 24) {
      return 'h3';
    } else if (fontSize >= 20) {
      return 'h4';
    } else if (fontSize >= 18) {
      return 'h5';
    } else if (fontSize >= 16) {
      return 'h6';
    }
    
    // デフォルトは段落
    return 'p';
  }

  /**
   * Frame名がセマンティックか判定
   * 
   * @param frameName - Figma Frame名
   * @returns セマンティックな命名か
   */
  isSemantic(frameName: string): boolean {
    for (const pattern of Object.keys(SemanticMapper.SEMANTIC_PATTERNS)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(frameName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * セマンティックタグの推奨を取得
   * 
   * @param frameName - Figma Frame名
   * @returns 推奨タグ（なければnull）
   */
  getSuggestion(frameName: string): string | null {
    const lowerName = frameName.toLowerCase();
    
    // キーワードベースの推奨
    if (lowerName.includes('hero')) {
      return 'section-hero';
    } else if (lowerName.includes('feature')) {
      return 'section-features';
    } else if (lowerName.includes('cta')) {
      return 'section-cta';
    } else if (lowerName.includes('testimonial')) {
      return 'section-testimonials';
    } else if (lowerName.includes('pricing')) {
      return 'section-pricing';
    } else if (lowerName.includes('faq')) {
      return 'section-faq';
    } else if (lowerName.includes('contact')) {
      return 'section-contact';
    }
    
    return null;
  }

  /**
   * コンテナタイプを判定
   * 
   * @param node - Figmaノード
   * @returns コンテナタイプ
   */
  getContainerType(node: FigmaNode): 'page' | 'section' | 'component' | 'element' {
    const name = node.name.toLowerCase();
    
    // ページレベル
    if (name.includes('page') || name.includes('screen')) {
      return 'page';
    }
    
    // セクションレベル
    if (this.isSemantic(node.name) && this.mapToHTMLTag(node.name) === 'section') {
      return 'section';
    }
    
    // コンポーネントレベル
    if (name.includes('component') || name.includes('card') || name.includes('modal')) {
      return 'component';
    }
    
    // 要素レベル
    return 'element';
  }

  /**
   * アクセシビリティ属性を推奨
   * 
   * @param tag - HTMLタグ
   * @param frameName - Frame名
   * @returns 推奨属性
   */
  getA11yAttributes(tag: string, frameName: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    
    // ナビゲーションの場合
    if (tag === 'nav') {
      attrs['role'] = 'navigation';
      attrs['aria-label'] = frameName;
    }
    
    // ボタンの場合
    if (tag === 'button') {
      attrs['type'] = 'button';
    }
    
    // 見出しの場合
    if (tag.startsWith('h')) {
      // ARIAレベルは不要（ネイティブで対応）
    }
    
    // メインコンテンツの場合
    if (tag === 'main') {
      attrs['role'] = 'main';
    }
    
    return attrs;
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