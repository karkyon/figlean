// =====================================
// backend/src/server.ts
// サーバーエントリーポイント
// 作成日時: 2026年1月10日 14:15
// 更新日時: 2026年1月10日 14:30
// 依存関係: ./app, ./config/env
// 説明: HTTPサーバー起動とDB接続確認
// =====================================

import app, { prisma } from './app';
import { config } from './config/env';

const PORT = config.port;

/**
 * データベース接続確認
 */
async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

/**
 * サーバー起動
 */
async function startServer(): Promise<void> {
  // DB接続確認
  await connectDatabase();
  
  // HTTPサーバー起動
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 FIGLEAN Backend Server Started');
    console.log('=====================================');
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
    console.log(`🏥 Health Check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`📚 API Docs: http://0.0.0.0:${PORT}/api-docs`);
    console.log('=====================================');
    console.log('✨ Ready to accept requests');
    console.log('');
  });

  // エラーハンドリング
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        console.error(`❌ Port ${PORT} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
}

// サーバー起動
startServer().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});