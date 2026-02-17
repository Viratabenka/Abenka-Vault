import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import type { Express, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { CentralizedExceptionFilter } from './common/filters/exception.filter';

// Use require so compiled CJS gets a callable express (avoid "express.default is not a function")
const expressLib = require('express');
const createExpressApp: () => Express =
  typeof expressLib === 'function' ? expressLib : expressLib.default;

/**
 * Create and configure the NestJS application (no listen).
 * Used by main.ts for local server and by vercel.ts for serverless.
 */
export async function createApp(expressApp?: Express): Promise<INestApplication> {
  const server = expressApp ?? createExpressApp();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bodyParser: true,
  });
  const prefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(prefix);
  server.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new CentralizedExceptionFilter());
  // On Vercel, restore request body from capture so Nest gets email/password for login
  if (process.env.VERCEL) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req: Request, _res: Response, next: NextFunction) => {
      const r = req as Request & { _vercelBody?: unknown };
      if (r._vercelBody !== undefined) (req as any).body = r._vercelBody;
      next();
    });
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const corsOrigins = frontendUrl.split(',').map((s) => s.trim()).filter(Boolean);
  if (corsOrigins.length === 0) corsOrigins.push('http://localhost:5173');
  if (process.env.VERCEL && process.env.VERCEL_URL)
    corsOrigins.push(`https://${process.env.VERCEL_URL}`);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || corsOrigins.some((o) => origin === o)) return cb(null, true);
      if (process.env.VERCEL && origin && /^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return cb(null, true);
      if (process.env.NODE_ENV === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin))
        return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  });
  await app.init();
  return app;
}
