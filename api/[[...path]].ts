/**
 * Vercel serverless catch-all: forwards all /api/* requests to the NestJS backend.
 * Backend is built first (see root package.json build), so backend/dist/vercel exists.
 */
const handler = require('../backend/dist/vercel').default;
module.exports = handler;
