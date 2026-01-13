// =====================================
// backend/src/utils/logger.ts
// ロギングユーティリティ - FIGLEAN版
// 作成日時: 2026年1月10日 17:35
// 依存関係: なし（標準ライブラリのみ）
// 説明: 構造化ログ出力、レベル別ログ、エラートラッキング
// =====================================

/**
 * ログレベル
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

/**
 * ログエントリー型
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger クラス
 * 構造化ログ出力を提供
 */
class Logger {
  private minLevel: LogLevel;

  constructor() {
    // 環境変数からログレベルを取得
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.minLevel = LogLevel[envLevel as keyof typeof LogLevel] || LogLevel.INFO;
  }

  /**
   * ログレベルの優先度を返す
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.DEBUG]: 3
    };
    return priorities[level];
  }

  /**
   * ログを出力するべきか判定
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) <= this.getLevelPriority(this.minLevel);
  }

  /**
   * ログエントリーをフォーマット
   */
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;

    // 本番環境はJSON形式
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(context && { context }),
        ...(error && { error })
      });
    }

    // 開発環境は読みやすい形式
    let output = `[${timestamp}] ${level} - ${message}`;

    if (context && Object.keys(context).length > 0) {
      output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }

    if (error) {
      output += `\n  Error: ${error.name}: ${error.message}`;
      if (error.stack) {
        output += `\n${error.stack}`;
      }
    }

    return output;
  }

  /**
   * ログを出力
   */
  private log(level: LogLevel, message: string, contextOrError?: Record<string, any> | Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      message
    };

    // Error オブジェクトの場合
    if (contextOrError instanceof Error) {
      entry.error = {
        name: contextOrError.name,
        message: contextOrError.message,
        stack: contextOrError.stack
      };
    }
    // コンテキストオブジェクトの場合
    else if (contextOrError) {
      entry.context = contextOrError;
    }

    const formattedLog = this.formatLogEntry(entry);

    // コンソール出力
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
    }
  }

  /**
   * エラーログ
   */
  error(message: string, errorOrContext?: Error | Record<string, any>): void {
    this.log(LogLevel.ERROR, message, errorOrContext);
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * ミドルウェアログ（開発環境のみ）
   */
  middleware(name: string, message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.debug(`[Middleware:${name}] ${message}`, context);
    }
  }
}

// シングルトンインスタンスをエクスポート
const logger = new Logger();

export default logger;