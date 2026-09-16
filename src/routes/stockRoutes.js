import {
  getAllStock,
  updateStockQty,
  saveStockUnit,
  saveAllStock,
  deleteStockUnit,
} from '../services/stockService.js';
import { generateStockExcel } from '../services/excelExportService.js';
import {
  generateSmbHpExcel,
  generateSmbDellExcel,
  generateDistriHpExcel,
  generateDistriDellExcel,
} from '../services/smbExportService.js';

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

  // GET /api/stock/export-excel - Mengunduh file Excel sinkronisasi terbaru
  fastify.get('/stock/export-excel', async (request, reply) => {
    try {
      const items = await getAllStock();
      const { buffer, filename } = await generateStockExcel(items);
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal membuat file Excel' });
    }
  });

  // GET /api/stock/export-smb - Mengunduh file Excel format SMB (HP / Dell)
  fastify.get('/stock/export-smb', async (request, reply) => {
    try {
      const { brand } = request.query || {};
      const targetBrand = (brand || '').toLowerCase();
      const items = await getAllStock();

      let result;
      if (targetBrand === 'hp') {
        result = await generateSmbHpExcel(items);
      } else if (targetBrand === 'dell') {
        result = await generateSmbDellExcel(items);
      } else {
        return reply.code(400).send({ error: 'Parameter brand harus berupa hp atau dell' });
      }

      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .send(result.buffer);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal membuat file Excel SMB' });
    }
  });

  // GET /api/stock/export-distri - Mengunduh file Excel format Distri (HP / Dell)
  fastify.get('/stock/export-distri', async (request, reply) => {
    try {
      const { brand } = request.query || {};
      const targetBrand = (brand || '').toLowerCase();
      const items = await getAllStock();

      let result;
      if (targetBrand === 'hp') {
        result = await generateDistriHpExcel(items);
      } else if (targetBrand === 'dell') {
        result = await generateDistriDellExcel(items);
      } else {
        return reply.code(400).send({ error: 'Parameter brand harus berupa hp atau dell' });
      }

      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .send(result.buffer);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal membuat file Excel Distri' });
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
