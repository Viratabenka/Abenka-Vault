/**
 * Vercel serverless catch-all: forwards all /api/* requests to the NestJS backend.
 * Backend is built first (see root package.json build). Use process.cwd() so path works in Vercel runtime.
 */
const path = require('path');
const handler = require(path.join(process.cwd(), 'backend', 'dist', 'vercel')).default;
module.exports = handler;
