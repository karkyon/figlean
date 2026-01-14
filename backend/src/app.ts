// =====================================
// backend/src/app.ts
// Express Application本体
// 作成日時: 2026年1月10日 14:10
// 更新日時: 2026年1月10日 19:40 - Swagger統合、認証ルート追加
// 依存関係: express, cors, helmet, morgan, @prisma/client
// 説明: Expressアプリケーションの初期化とミドルウェア設定
// =====================================

import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

// Middlewares
import { errorHandler } from './middlewares/errorHandler';
import { requestId } from './middlewares/requestId';
import { apiRateLimiter, figmaApiRateLimiter } from './middlewares/rateLimiter';

// Routes
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import figmaRoutes from './routes/figma.routes';
import analysisRoutes from './routes/analysis.routes';
import figmaCommentRoutes from './routes/figmaComment.routes';

// Config
import { config } from './config/env';
import { swaggerSpec, swaggerUi, swaggerUiOptions, swaggerEnabled } from './config/swagger';

// =====================================
// Prisma Client(シングルトン)
// =====================================
export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// =====================================
// Express App初期化
// =====================================
const app: Application = express();

// =====================================
// Security Middleware
// =====================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://figma.com", "https://*.figma.com"],
      connectSrc: ["'self'", "https://api.figma.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// =====================================
// CORS設定（開発環境: 全オリジン許可）
// =====================================
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// =====================================
// Body Parser
// =====================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================
// Request ID(全リクエストに一意のIDを付与)
// =====================================
app.use(requestId);

// =====================================
// 🔍 グローバルリクエストログ（徹底デバッグ用）
// =====================================
app.use((req, _res, next) => {
  console.log('🔍 [GLOBAL] リクエスト受信', {
    method: req.method,
    url: req.url,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
});

// =====================================
// Logging(開発環境のみ)
// =====================================
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// =====================================
// Swagger/OpenAPI設定
// =====================================
if (swaggerEnabled && swaggerSpec) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // JSON形式のスキーマ
  app.get('/api-docs.json', (_req, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log(`📚 Swagger UI: http://localhost:${config.port}/api-docs`);
} else {
  console.log('ℹ️ Swagger UI is disabled');
}

// =====================================
// ✅ Rate Limiting（ルート定義の前に配置）
// =====================================
// 全APIエンドポイントに対する基本レート制限（100req/15min）
app.use('/api', apiRateLimiter);

// =====================================
// Routes
// =====================================
// Health Check(認証不要、レート制限なし)
app.use('/api/health', healthRoutes);

// 認証（authRateLimiterは各ルート内で個別適用）
app.use('/api/auth', authRoutes);

// プロジェクト管理
app.use('/api/projects', projectRoutes);

// 診断結果
app.use('/api/analysis', analysisRoutes);

// Figmaコメント管理
app.use('/api/figma/comments', figmaCommentRoutes);

// Figma連携（追加のレート制限）
app.use('/api/figma', figmaApiRateLimiter, figmaRoutes);

// =====================================
// API情報エンドポイント
// =====================================
app.get('/api/info', (_req, res: Response) => {
  res.json({
    name: 'FIGLEAN API',
    version: '1.0.0',
    description: 'Figma設計品質診断・HTML生成プラットフォーム',
    environment: config.nodeEnv,
    swagger: swaggerEnabled ? `http://localhost:${config.port}/api-docs` : 'disabled',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      projects: '/api/projects',
      figma: '/api/figma',
      analysis: '/api/analysis'
    }
  });
});

// =====================================
// 404 Not Found Handler
// =====================================
app.use((req, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      requestId: req.id
    }
  });
});

// =====================================
// Global Error Handler
// =====================================
app.use(errorHandler);

// =====================================
// Graceful Shutdown
// =====================================
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;