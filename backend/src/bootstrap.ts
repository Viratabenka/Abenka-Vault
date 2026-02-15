import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import express from 'express';
import { AppModule } from './app.module';
import { CentralizedExceptionFilter } from './common/filters/exception.filter';

/**
 * Create and configure the NestJS application (no listen).
 * Used by main.ts for local server and by vercel.ts for serverless.
 */
export async function createApp(expressApp?: express.Express): Promise<INestApplication> {
  const server = expressApp ?? express();
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
    expressApp.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
      const r = req as express.Request & { _vercelBody?: unknown };
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
