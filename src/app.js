import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import { FRONTEND_DIST_PATH } from './config.js';
import stockRoutes from './routes/stockRoutes.js';

/**
 * Membangun dan mengonfigurasi instance Fastify
 * @param {Object} opts Opsi Fastify
 * @returns {import('fastify').FastifyInstance}
 */
export function buildApp(opts = {}) {
  const app = Fastify({
    logger: true,
    ...opts,
  });

  // Daftarkan CORS agar React frontend (baik dev di 5173 maupun production) bisa mengakses API tanpa kendala
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Daftarkan API routes dengan prefix '/api'
  app.register(stockRoutes, { prefix: '/api' });

  // Daftarkan static files jika folder frontend/dist ada (Production build)
  if (fs.existsSync(FRONTEND_DIST_PATH)) {
    app.register(fastifyStatic, {
      root: FRONTEND_DIST_PATH,
      prefix: '/',
    });

    // SPA fallback: rute non-API diarahkan ke index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url && !request.raw.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      reply.code(404).send({ error: 'Endpoint tidak ditemukan' });
    });
  }

  // Health check route
  app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  return app;
}
