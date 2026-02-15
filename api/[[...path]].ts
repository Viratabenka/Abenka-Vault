/**
 * Vercel serverless catch-all: forwards all /api/* requests to the NestJS backend.
 * Backend is copied to api/backend-dist during build (scripts/copy-backend-to-api.cjs).
 */
const path = require('path');
const handler = require(path.join(__dirname, 'backend-dist', 'src', 'vercel')).default;
module.exports = handler;
