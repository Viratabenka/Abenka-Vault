/**
 * Single API handler for Vercel. All /api/* requests are rewritten to /api/catchall
 * (see vercel.json), so this function always runs. We restore the original path from
 * the __path query param so Nest sees e.g. /api/auth/login.
 */
const path = require('path');
const handlerModule = require(path.join(__dirname, 'backend-dist', 'vercel'));
const handler = handlerModule.default;

export default async function catchall(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
): Promise<void> {
  const rawReq = req as import('http').IncomingMessage & { url?: string };
  const url = rawReq.url || '/';
  const [pathname, search] = url.split('?');
  const params = new URLSearchParams(search || '');
  const originalPath = params.get('__path');
  if (originalPath !== null && originalPath !== '') {
    params.delete('__path');
    const qs = params.toString();
    rawReq.url = '/api/' + originalPath + (qs ? '?' + qs : '');
  } else {
    rawReq.url = '/api' + (search ? '?' + search : '');
  }
  return handler(req, res);
}
