/**
 * FIGLEAN Frontend - 開発用ロガーユーティリティ
 * ファイルパス: frontend/src/lib/logger.ts
 * 
 * 機能:
 * - 統一的なコンソールログ出力
 * - 環境別のログレベル制御
 * - カラフルなログ表示
 * 
 * 作成日: 2026年1月14日 - Phase 2.7
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(): boolean {
    return this.isDevelopment;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getEmoji(level);
    return `${emoji} [${level.toUpperCase()}] ${message}`;
  }

  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    return emojis[level];
  }

  private getStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #6B7280',
      info: 'color: #3B82F6',
      warn: 'color: #F59E0B',
      error: 'color: #EF4444',
      success: 'color: #10B981'
    };
    return styles[level];
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    console.log(`%c${this.formatMessage('debug', message)}`, this.getStyle('debug'));
    if (context) {
      console.log('  Context:', context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    console.log(`%c${this.formatMessage('info', message)}`, this.getStyle('info'));
    if (context) {
      console.log('  Context:', context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    console.warn(`%c${this.formatMessage('warn', message)}`, this.getStyle('warn'));
    if (context) {
      console.warn('  Context:', context);
    }
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog()) return;
    console.error(`%c${this.formatMessage('error', message)}`, this.getStyle('error'));
    if (error) {
      console.error('  Error:', error);
    }
    if (context) {
      console.error('  Context:', context);
    }
  }

  success(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    console.log(`%c${this.formatMessage('success', message)}`, this.getStyle('success'));
    if (context) {
      console.log('  Context:', context);
    }
  }

  group(label: string, fn: () => void): void {
    if (!this.shouldLog()) return;
    console.group(label);
    fn();
    console.groupEnd();
  }

  table(data: any[]): void {
    if (!this.shouldLog()) return;
    console.table(data);
  }

  api(method: string, url: string, data?: any): void {
    if (!this.shouldLog()) return;
    console.log(`%c🌐 [API] ${method} ${url}`, 'color: #8B5CF6; font-weight: bold');
    if (data) {
      console.log('  Data:', data);
    }
  }

  apiSuccess(method: string, url: string, response?: any): void {
    if (!this.shouldLog()) return;
    console.log(`%c✅ [API SUCCESS] ${method} ${url}`, 'color: #10B981; font-weight: bold');
    if (response) {
      console.log('  Response:', response);
    }
  }

  apiError(method: string, url: string, error: any): void {
    if (!this.shouldLog()) return;
    console.error(`%c❌ [API ERROR] ${method} ${url}`, 'color: #EF4444; font-weight: bold');
    console.error('  Error:', error);
  }

  component(name: string, action: string, data?: any): void {
    if (!this.shouldLog()) return;
    console.log(`%c⚛️ [COMPONENT] ${name} - ${action}`, 'color: #06B6D4');
    if (data) {
      console.log('  Data:', data);
    }
  }

  state(component: string, stateName: string, value: any): void {
    if (!this.shouldLog()) return;
    console.log(`%c🔄 [STATE] ${component}.${stateName}`, 'color: #F59E0B');
    console.log('  Value:', value);
  }

  route(from: string, to: string): void {
    if (!this.shouldLog()) return;
    console.log(`%c🗺️ [ROUTE] ${from} → ${to}`, 'color: #8B5CF6; font-weight: bold');
  }
}

export const logger = new Logger();
export default logger;