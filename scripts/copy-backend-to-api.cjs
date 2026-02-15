/**
 * Copies backend/dist and backend/node_modules into api/backend-dist
 * so the Vercel serverless function can require() the Nest app without
 * relying on process.cwd() or includeFiles.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const apiBackendDist = path.join(root, 'api', 'backend-dist');
const backendDistSrc = path.join(root, 'backend', 'dist', 'src');
const backendNodeModules = path.join(root, 'backend', 'node_modules');

if (!fs.existsSync(backendDistSrc)) {
  console.error('Run root build first (backend/dist/src not found).');
  process.exit(1);
}

if (fs.existsSync(apiBackendDist)) {
  fs.rmSync(apiBackendDist, { recursive: true, force: true });
}
fs.mkdirSync(apiBackendDist, { recursive: true });

// Copy dist/src so vercel.js is at api/backend-dist/vercel.js (path used by api/[[...path]].ts)
fs.cpSync(backendDistSrc, apiBackendDist, { recursive: true });
fs.cpSync(backendNodeModules, path.join(apiBackendDist, 'node_modules'), { recursive: true });

console.log('Copied backend/dist/src and backend/node_modules to api/backend-dist');
