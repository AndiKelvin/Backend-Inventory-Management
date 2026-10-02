import {
  getAllStock,
  updateStockQty,
  saveStockUnit,
  saveAllStock,
  deleteStockUnit,
  getAllCustomers,
  getKnownSales,
} from '../services/stockService.js';
import {
  getAllMovements,
  recordMovement,
  updateMovement,
  deleteMovement,
} from '../services/movementService.js';
import { generateStockExcel } from '../services/excelExportService.js';
import {
  generateSmbHpExcel,
  generateSmbDellExcel,
  generateDistriHpExcel,
  generateDistriDellExcel,
} from '../services/smbExportService.js';
import { validateToken } from '../lib/auth.js';

/**
 * Fastify Plugin untuk rute REST API /api/stock
 * Dilindungi autentikasi PIN / Token Sesi
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function stockRoutes(fastify) {
  // Guard autentikasi untuk seluruh endpoint /api/stock
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers['authorization'];
    const tokenFromBearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = tokenFromBearer ||
      request.headers['x-auth-token'] ||
      request.headers['x-app-pin'] ||
      (request.query && (request.query.token || request.query.pin));

    if (!validateToken(token)) {
      return reply.code(401).send({ error: 'Akses ditolak: PIN atau sesi login tidak valid' });
    }
  });

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
    async (request, reply) => {
      const { movement, ...unit } = request.body;
      try {
        const saved = await saveStockUnit(unit);
        if (movement) {
          try {
            await recordMovement({
              ...movement,
              itemId: saved.id,
              partNumber: saved.partNumber || movement.partNumber,
              itemName: saved.name || movement.itemName,
              brand: saved.brand || movement.brand,
              newQty: saved.qty,
            });
          } catch (mErr) {
            fastify.log.warn({ err: mErr }, 'Gagal mencatat mutasi saat save unit');
          }
        }
        return saved;
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Gagal menyimpan data unit' });
      }
    }
  );

  // GET /api/stock/movements - Mengambil seluruh data riwayat mutasi stok
  fastify.get('/stock/movements', async (request, reply) => {
    try {
      const { search, type, itemId, limit, offset } = request.query || {};
      const movements = await getAllMovements({ search, type, itemId, limit, offset });
      return movements;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal mengambil riwayat mutasi' });
    }
  });

  // POST /api/stock/movements - Menambahkan entri riwayat mutasi baru secara manual/langsung
  fastify.post('/stock/movements', async (request, reply) => {
    try {
      const newEntry = await recordMovement(request.body);
      return reply.code(201).send(newEntry);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal mencatat mutasi' });
    }
  });

  // PUT /api/stock/movements/:id - Memperbarui 1 entri catatan mutasi / history
  fastify.put('/stock/movements/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const updated = await updateMovement(id, request.body);
      return updated;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal memperbarui catatan mutasi / history' });
    }
  });

  // DELETE /api/stock/movements/:id - Menghapus 1 entri riwayat mutasi berdasarkan ID
  fastify.delete('/stock/movements/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const success = await deleteMovement(id);
      if (!success) {
        return reply.code(404).send({ error: 'Riwayat mutasi tidak ditemukan' });
      }
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal menghapus riwayat mutasi' });
    }
  });

  // POST /api/stock/save-all - Simpan massal (Batch replacement / Import)
  fastify.post('/stock/save-all', async (request, reply) => {
    const items = request.body;
    if (!Array.isArray(items)) {
      return reply.code(400).send({ error: 'Body harus berupa array data' });
    }
    try {
      await saveAllStock(items);
      return { success: true, count: items.length };
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

  // GET /api/stock/customers - Mengambil seluruh data customer
  fastify.get('/stock/customers', async (request, reply) => {
    try {
      const customers = await getAllCustomers();
      return customers;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal mengambil data customer' });
    }
  });

  // GET /api/stock/sales - Mengambil daftar nama sales
  fastify.get('/stock/sales', async (request, reply) => {
    try {
      const sales = await getKnownSales();
      return sales;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Gagal mengambil data sales' });
    }
  });
}
