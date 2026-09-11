import {
  getAllStock,
  updateStockQty,
  saveStockUnit,
  saveAllStock,
  deleteStockUnit,
} from '../services/stockService.js';

/**
 * Fastify Plugin untuk rute REST API /api/stock
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function stockRoutes(fastify) {
  // GET /api/stock - Mengambil seluruh data stok
  fastify.get('/stock', async (request, reply) => {
    try {
      const items = await getAllStock();
      return items;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal mengambil data inventaris' });
    }
  });

  // POST /api/stock/update-qty - Memperbarui jumlah stok (+/-)
  fastify.post(
    '/stock/update-qty',
    {
      schema: {
        body: {
          type: 'object',
          required: ['id', 'delta'],
          properties: {
            id: { type: 'string' },
            delta: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, delta } = request.body;
      try {
        const updated = await updateStockQty(id, delta);
        if (!updated) {
          return reply.code(404).send({ error: 'Unit tidak ditemukan' });
        }
        return updated;
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Gagal memperbarui kuantitas' });
      }
    }
  );

  // POST /api/stock/save - Menambah atau memperbarui 1 unit
  fastify.post(
    '/stock/save',
    {
      schema: {
        body: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const unit = request.body;
      try {
        const saved = await saveStockUnit(unit);
        return saved;
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Gagal menyimpan data unit' });
      }
    }
  );

  // POST /api/stock/save-all - Simpan massal (Batch replacement)
  fastify.post('/stock/save-all', async (request, reply) => {
    const items = request.body;
    if (!Array.isArray(items)) {
      return reply.code(400).send({ error: 'Body harus berupa array data' });
    }
    try {
      await saveAllStock(items);
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal menyimpan seluruh data' });
    }
  });

  // DELETE /api/stock/:id - Hapus unit berdasarkan ID
  fastify.delete('/stock/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      await deleteStockUnit(id);
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal menghapus unit' });
    }
  });
}
