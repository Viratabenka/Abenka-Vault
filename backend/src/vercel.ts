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
      const expressApp = express();
      expressApp.use(captureVercelBody);
      const app = await createApp(expressApp);
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
