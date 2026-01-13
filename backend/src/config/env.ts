// =====================================
// backend/src/config/env.ts
// 環境変数管理 - 型安全な設定読み込み
// 作成日時: 2026年1月10日 13:30
// 更新日時: 2026年1月10日 17:00
// 依存関係: dotenv, path
// 説明: .envファイルから環境変数を読み込み、検証して型安全にエクスポート
// =====================================

import dotenv from 'dotenv';
import path from 'path';

// .env読み込み（プロジェクトルートから）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * アプリケーション設定インターフェース
 */
interface Config {
  // アプリケーション基本設定
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  
  // Database
  databaseUrl: string;
  
  // JWT認証
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // Figma API
  figmaApiBaseUrl: string;
  figmaTokenEncryptionKey: string;
  
  // レート制限
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  authRateLimitMax: number;
}

/**
 * 環境変数の検証と型安全なexport
 * 必須変数が欠けている場合はエラーをthrow
 */
function validateConfig(): Config {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'FIGMA_TOKEN_ENCRYPTION_KEY'
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `❌ 必須環境変数が設定されていません: ${missing.join(', ')}\n` +
      `   .envファイルを確認してください。`
    );
  }

  // 32バイトHEX検証（Figmaトークン暗号化キー）
  const encryptionKey = process.env.FIGMA_TOKEN_ENCRYPTION_KEY!;
  if (!/^[0-9a-f]{64}$/i.test(encryptionKey)) {
    throw new Error(
      '❌ FIGMA_TOKEN_ENCRYPTION_KEYは64文字のHEX文字列である必要があります。\n' +
      '   生成方法: openssl rand -hex 32'
    );
  }

  return {
    // アプリケーション基本設定
    nodeEnv: process.env.NODE_ENV || 'development',
    // ✅ 修正: Docker内では3001、ホストからは3101でアクセス
    port: parseInt(process.env.API_PORT || '3001', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3100',
    
    // Database
    databaseUrl: process.env.DATABASE_URL!,
    
    // JWT
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    
    // Figma API
    figmaApiBaseUrl: process.env.FIGMA_API_BASE_URL || 'https://api.figma.com/v1',
    figmaTokenEncryptionKey: encryptionKey,
    
    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10)
  };
}

// 設定をexport
export const config = validateConfig();

// 開発環境では設定を表示（本番ではセキュリティ上非表示）
if (config.nodeEnv === 'development') {
  console.log('');
  console.log('📝 環境変数読み込み完了');
  console.log('=====================================');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
  console.log(`   JWT有効期限: ${config.jwtExpiresIn}`);
  console.log(`   API制限: ${config.rateLimitMaxRequests}req/${config.rateLimitWindowMs}ms`);
  console.log(`   認証制限: ${config.authRateLimitMax}req/${config.rateLimitWindowMs}ms`);
  console.log('=====================================');
  console.log('');
}