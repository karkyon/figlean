// =====================================
// backend/src/config/swagger.ts
// Swagger設定 - FIGLEAN版
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: swagger-jsdoc, swagger-ui-express, env
// 説明: Swagger/OpenAPIドキュメント設定と初期化
// =====================================

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './env';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FIGLEAN API Documentation',
      version: '1.0.0',
      description: `
# 📐 FIGLEAN - Figma設計品質診断・HTML生成プラットフォーム

**Figma設計を診断し、最適なHTML/CSSコードを自動生成**

## 🎯 主要機能

### 🔍 Phase 1: 診断機能
- **Auto Layout検証**: レイアウト構造の最適化チェック
- **コンポーネント診断**: 再利用性とメンテナンス性の評価
- **レスポンシブ診断**: ブレークポイントとスケーラビリティ
- **セマンティック診断**: アクセシビリティとSEO最適化
- **総合スコア算出**: FIGLEAN Score（0-100点）

### 🎨 Phase 2: HTML生成
- **Flex変換**: Auto LayoutからFlexboxへの自動変換
- **Grid変換**: FIGLEAN 100限定機能（完璧な設計のみ）
- **Tailwind最適化**: ユーティリティクラス自動適用
- **レスポンシブ対応**: モバイル・タブレット・デスクトップ
- **コード品質保証**: プロダクションレディなHTML/CSS

## 🔐 認証方式

JWT Bearer認証を使用しています：

1. \`/api/auth/register\` または \`/api/auth/login\` でトークンを取得
2. \`Authorization: Bearer <token>\` ヘッダーに設定
3. ほとんどのエンドポイントで認証が必要です

## 📊 プラン体系

| プラン | 機能 | 制限 |
|--------|------|------|
| **FREE** | 基本診断、Flex変換 | 月10プロジェクト |
| **PRO** | 全機能、優先サポート | 月100プロジェクト |
| **TEAM** | チーム共有、API連携 | 無制限 |

---

**開発元**: FIGLEAN Development Team  
**サポート**: support@figlean.com
      `,
      contact: {
        name: 'FIGLEAN Development Team',
        email: 'support@figlean.com',
        url: 'https://figlean.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://figlean.com/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:3101',
        description: 'Development server (正しいポート)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWTトークンを使用した認証'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
                requestId: { type: 'string' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            plan: { type: 'string', enum: ['FREE', 'PRO', 'TEAM'] },
            hasFigmaToken: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: '🔐 認証 (Authentication)', description: 'ユーザー登録・ログイン・認証管理・Figmaトークン管理' },
      { name: '📁 プロジェクト管理 (Projects)', description: 'プロジェクトのCRUD操作・Figmaファイル連携' },
      { name: '🔍 診断 (Analysis)', description: '設計品質診断・ルール違反検出・改善提案' },
      { name: '🎨 HTML生成 (HTML Generator)', description: 'HTML/CSS自動生成・Tailwind最適化' },
      { name: '🔌 Figma連携 (Figma)', description: 'Figma APIとの連携・ファイル取得' },
      { name: '💬 コメント投稿 (Comments)', description: 'Figmaコメント自動投稿・管理' },
      { name: '⚡ システム (System)', description: 'ヘルスチェック・システム情報' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

let swaggerSpec: any = null;
let swaggerEnabled = false;

try {
  swaggerSpec = swaggerJsdoc(swaggerOptions);
  swaggerEnabled = true;
  console.log('✅ Swagger API文書が正常に読み込まれました - FIGLEAN完全版');
  console.log(`🔗 文書URL: http://localhost:${config.port}/api-docs`);
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('❌ Swagger API文書の読み込みに失敗しました:', errorMessage);
  swaggerEnabled = false;
}

/**
 * Swagger UI設定（UI動作最適化版）
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar {
      background-color: #1f2937;
      border-bottom: 3px solid #6366f1;
    }
    .swagger-ui .info .title {
      color: #1f2937;
      font-weight: bold;
      font-size: 2em;
    }
    .swagger-ui .info .description {
      color: #374151;
      line-height: 1.6;
    }
    .swagger-ui .scheme-container {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #10b981;
      background-color: #f0fdf4;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #6366f1;
      background-color: #eef2ff;
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #f59e0b;
      background-color: #fffbeb;
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #ef4444;
      background-color: #fef2f2;
    }
    .swagger-ui .opblock.opblock-patch {
      border-color: #8b5cf6;
      background-color: #f5f3ff;
    }
  `,
  customSiteTitle: 'FIGLEAN API - 完全版ドキュメント',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'none',
    deepLinking: true,
    displayOperationId: true,
    displayRequestDuration: true,
    persistAuthorization: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    },
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    useUnsafeMarkdown: false,
    requestInterceptor: (request: any) => {
      console.log('📡 API Request:', request.method, request.url);
      return request;
    },
    responseInterceptor: (response: any) => {
      console.log('📥 API Response:', response.status, response.url);
      return response;
    }
  }
};

export { swaggerSpec, swaggerUi, swaggerUiOptions, swaggerEnabled };
export default { spec: swaggerSpec, ui: swaggerUi, options: swaggerUiOptions, enabled: swaggerEnabled };
