import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3001;
  const prefix = process.env.API_PREFIX || 'api';
  await app.listen(port);
  console.log(`Abenka Vault API: http://localhost:${port}/${prefix}`);
}
bootstrap();
