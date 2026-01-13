// =====================================
// backend/src/routes/health.routes.ts
// へルスチェック用のルート定義
// 作成日時: 2026年1月10日 23:37
// 更新日時: 2026年1月10日 23:37
// 依存関係: Express, Prisma Client
// 説明: サーバーとデータベースの状態を確認するためのエンドポイントを提供
// =====================================

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(
      res,
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected',
        version: '1.0.0',
        service: 'FIGLEAN Backend API'
      },
      'サービスは正常に稼働しています',
      200,
      req.id
    );
  } catch (error) {
    console.error('❌ Health check failed:', error);
    sendError(
      res,
      'SERVICE_UNAVAILABLE',
      'サーバーが利用できません',
      503,
      { database: 'disconnected' },
      req.id
    );
  }
});

export default router;
