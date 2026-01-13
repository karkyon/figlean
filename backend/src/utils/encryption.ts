// =====================================
// backend/src/utils/encryption.ts
// Figmaトークン暗号化ユーティリティ - FIGLEAN専用
// 作成日時: 2026年1月10日 17:45
// 依存関係: crypto（Node.js標準）
// 説明: AES-256-GCM によるFigmaトークンの暗号化/復号化
// =====================================

import crypto from 'crypto';

// =====================================
// 設定
// =====================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;        // 初期化ベクトル長（バイト）
const AUTH_TAG_LENGTH = 16;  // 認証タグ長（バイト）
const KEY_LENGTH = 32;       // 暗号化キー長（バイト）= 256ビット

/**
 * 環境変数から暗号化キーを取得
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.FIGMA_TOKEN_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      '❌ FIGMA_TOKEN_ENCRYPTION_KEY environment variable is not set.\n' +
      '   Generate with: openssl rand -hex 32'
    );
  }

  // HEX文字列（64文字）を検証
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      '❌ FIGMA_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).\n' +
      '   Generate with: openssl rand -hex 32'
    );
  }

  return Buffer.from(key, 'hex');
};

// =====================================
// Figmaトークン暗号化
// =====================================

/**
 * Figmaトークンを暗号化
 * 
 * @param token - 暗号化するFigmaトークン（平文）
 * @returns 暗号化された文字列（iv:authTag:encrypted の形式）
 * 
 * @example
 * const encrypted = encryptFigmaToken('figd_abc123...');
 * // => "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export const encryptFigmaToken = (token: string): string => {
  if (!token || token.trim().length === 0) {
    throw new Error('Token cannot be empty');
  }

  try {
    const encryptionKey = getEncryptionKey();
    
    // ランダムな初期化ベクトル（IV）を生成
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Cipher を作成
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    
    // 暗号化
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 認証タグを取得（改ざん検知用）
    const authTag = cipher.getAuthTag();
    
    // iv:authTag:encrypted の形式で結合
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Figma token encryption error:', error);
    throw new Error('トークンの暗号化に失敗しました');
  }
};

/**
 * Figmaトークンを復号化
 * 
 * @param encryptedToken - 暗号化されたトークン（iv:authTag:encrypted 形式）
 * @returns 復号化されたFigmaトークン（平文）
 * 
 * @example
 * const decrypted = decryptFigmaToken('a1b2c3d4....:e5f6g7h8....:i9j0k1l2....');
 * // => "figd_abc123..."
 */
export const decryptFigmaToken = (encryptedToken: string): string => {
  if (!encryptedToken || encryptedToken.trim().length === 0) {
    throw new Error('Encrypted token cannot be empty');
  }

  try {
    const encryptionKey = getEncryptionKey();
    
    // iv:authTag:encrypted を分割
    const parts = encryptedToken.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // バリデーション
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }
    
    // Decipher を作成
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    // 復号化
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Figma token decryption error:', error);
    throw new Error('トークンの復号化に失敗しました。トークンが破損しているか無効です');
  }
};

/**
 * Figmaトークン形式の検証
 * 
 * @param token - 検証するトークン
 * @returns true if valid Figma token format
 */
export const isValidFigmaToken = (token: string): boolean => {
  // Figma Personal Access Token は "figd_" で始まり、40文字程度
  // または OAuth token は長い文字列
  if (!token || typeof token !== 'string') {
    return false;
  }

  // 最小長チェック（短すぎるトークンは無効）
  if (token.length < 20) {
    return false;
  }

  // 空白や制御文字を含まない
  if (/[\s\x00-\x1f\x7f]/.test(token)) {
    return false;
  }

  return true;
};

/**
 * 暗号化設定の検証
 * 
 * @returns true if encryption configuration is valid
 */
export const validateEncryptionConfig = (): boolean => {
  try {
    const key = getEncryptionKey();
    return key.length === KEY_LENGTH;
  } catch (error) {
    console.error('Encryption config validation error:', error);
    return false;
  }
};

/**
 * 暗号化キーを生成（開発用ヘルパー）
 * 
 * @returns 64文字のHEX文字列（32バイト）
 * 
 * @example
 * const key = generateEncryptionKey();
 * console.log('FIGMA_TOKEN_ENCRYPTION_KEY=' + key);
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
};

// =====================================
// エクスポート
// =====================================

export const ENCRYPTION_CONFIG = {
  algorithm: ALGORITHM,
  ivLength: IV_LENGTH,
  authTagLength: AUTH_TAG_LENGTH,
  keyLength: KEY_LENGTH
} as const;