import express from 'express';
import type { Application } from 'express';
import { createApp } from './bootstrap';

let cachedServer: Application | null = null;

/**
 * On Vercel, request.body is pre-parsed by a getter. Express body-parser may then read an
 * already-consumed stream and set req.body to {}. This middleware runs first and stores
 * Vercel's parsed body so bootstrap can restore it after Express runs.
 */
function captureVercelBody(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): void {
  const r = req as express.Request & { body?: unknown; _vercelBody?: unknown };
  if (r.body !== undefined && r.body !== null) r._vercelBody = r.body;
  next();
}

/**
 * Serverless entry for Vercel. NestJS app is created once per cold start and cached.
 * Accepts Node IncomingMessage / ServerResponse (Vercel's req/res).
 */
export default async function handler(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
): Promise<void> {
  if (!cachedServer) {
    const expressApp = express();
    expressApp.use(captureVercelBody);
    const app = await createApp(expressApp);
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return new Promise((resolve, reject) => {
    cachedServer!(req as any, res as any, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
