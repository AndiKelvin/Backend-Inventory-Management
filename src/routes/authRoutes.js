import { verifyPin, validateToken, invalidateToken } from '../lib/auth.js';

/**
 * Fastify Plugin untuk autentikasi PIN (/api/auth)
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function authRoutes(fastify) {
  // POST /api/auth/verify-pin - Memeriksa PIN yang dimasukkan pengguna
  fastify.post('/auth/verify-pin', async (request, reply) => {
    try {
      const { pin } = request.body || {};
      const result = verifyPin(pin);

      if (!result.success) {
        return reply.code(401).send(result);
      }

      return reply.code(200).send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ success: false, error: 'Terjadi kesalahan sistem' });
    }
  });

  // GET /api/auth/check - Memeriksa apakah token/sesi saat ini masih valid
  fastify.get('/auth/check', async (request, reply) => {
    try {
      const authHeader = request.headers['authorization'];
      const tokenFromBearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const token = tokenFromBearer || request.headers['x-auth-token'] || request.headers['x-app-pin'];

      if (validateToken(token)) {
        return reply.send({ authenticated: true });
      }

      return reply.code(401).send({ authenticated: false, error: 'Sesi tidak valid atau telah kedaluwarsa' });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ authenticated: false, error: 'Terjadi kesalahan sistem' });
    }
  });

  // POST /api/auth/logout - Menghapus sesi login
  fastify.post('/auth/logout', async (request, reply) => {
    try {
      const authHeader = request.headers['authorization'];
      const tokenFromBearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const token = tokenFromBearer || request.headers['x-auth-token'];

      invalidateToken(token);
      return reply.send({ success: true, message: 'Berhasil keluar' });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ success: false, error: 'Gagal memproses logout' });
    }
  });
}
