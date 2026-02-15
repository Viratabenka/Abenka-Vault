import { createApp } from './bootstrap';

let cachedServer: ReturnType<ReturnType<typeof createApp>['getHttpAdapter']['getInstance']> | null = null;

/**
 * Serverless entry for Vercel. NestJS app is created once per cold start and cached.
 * Accepts Node IncomingMessage / ServerResponse (Vercel's req/res).
 */
export default async function handler(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
): Promise<void> {
  if (!cachedServer) {
    const app = await createApp();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return new Promise((resolve, reject) => {
    cachedServer!(req as any, res as any, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
