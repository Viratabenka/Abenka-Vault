import type { Application, Express, Request, Response, NextFunction } from 'express';
import { createApp } from './bootstrap';

// Use require so express works in Vercel runtime (no ESM .default interop issue)
const expressLib = require('express');
const createExpressApp: () => Application =
  typeof expressLib === 'function' ? expressLib : expressLib.default;

let cachedServer: Application | null = null;

/**
 * On Vercel, request.body is pre-parsed by a getter. Express body-parser may then read an
 * already-consumed stream and set req.body to {}. This middleware runs first and stores
 * Vercel's parsed body so bootstrap can restore it after Express runs.
 */
function captureVercelBody(req: Request, _res: Response, next: NextFunction): void {
  const r = req as Request & { body?: unknown; _vercelBody?: unknown };
  if (r.body !== undefined && r.body !== null) r._vercelBody = r.body;
  next();
}

function sendJson(res: import('http').ServerResponse, status: number, body: object): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload, 'utf8'),
  });
  res.end(payload);
}

/**
 * Serverless entry for Vercel. NestJS app is created once per cold start and cached.
 * Accepts Node IncomingMessage / ServerResponse (Vercel's req/res).
 * Errors are caught and returned as 500/503 so the function does not crash.
 */
export default async function handler(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
): Promise<void> {
  if (!cachedServer) {
    try {
      const expressApp = createExpressApp();
      expressApp.use(captureVercelBody);
      const app = await createApp(expressApp as Express);
      cachedServer = app.getHttpAdapter().getInstance();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Vercel] App init failed:', message, err instanceof Error ? err.stack : '');
      const hint =
        /DATABASE_URL|datasource|env/i.test(message) && !/connection|connect|ECONNREFUSED/i.test(message)
          ? 'Set DATABASE_URL for Production and redeploy.'
          : /connection|connect|ECONNREFUSED|timeout|pool/i.test(message)
            ? 'DB connection failed. Use Supabase Session pooler URL; redeploy after changing env.'
            : /JWT|secret/i.test(message)
              ? 'Set JWT_SECRET for Production and redeploy.'
              : 'Redeploy after setting env vars, then check Vercel → Logs for the real error.';
      sendJson(res, 503, {
        error: 'FUNCTION_INIT_FAILED',
        message: hint,
      });
      return;
    }
  }
  // Ensure Express sees the full path so Nest's global prefix "api" matches (Vercel may pass path without /api)
  const rawReq = req as import('http').IncomingMessage & { url?: string };
  const path = (rawReq.url || '/').split('?')[0];
  if (!path.startsWith('/api')) {
    const q = (rawReq.url || '').includes('?') ? '?' + (rawReq.url || '').split('?')[1] : '';
    rawReq.url = '/api' + (path === '/' ? '' : path) + q;
  }

  return new Promise((resolve) => {
    cachedServer!(req as any, res as any, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[Vercel] Request error:', message, err instanceof Error ? err.stack : '');
        if (!res.writableEnded) {
          sendJson(res, 500, { error: 'INTERNAL_SERVER_ERROR', message: 'Request failed. Check logs.' });
        }
      }
      resolve();
    });
  });
}
