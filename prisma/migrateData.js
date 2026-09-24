import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const DATA_PATH = path.resolve(__dirname, '..', 'data', 'stock_inventory.json');
const MOVEMENTS_PATH = path.resolve(__dirname, '..', 'data', 'stock_movements.json');

async function migrate() {
  console.log('🚀 Memulai migrasi data dari file JSON ke PostgreSQL...');

  // 1. Migrasi Stock Items
  try {
    const rawData = await fs.readFile(DATA_PATH, 'utf-8');
    const cleanData = rawData.replace(/^\uFEFF/, '').trim();
    if (cleanData) {
      const items = JSON.parse(cleanData);
      console.log(`📦 Ditemukan ${items.length} data inventaris untuk dimigrasi.`);

      let successCount = 0;
      for (const item of items) {
        if (!item.id) continue;
        const qty = parseInt(item.qty, 10) || 0;
        await prisma.stockItem.upsert({
          where: { id: String(item.id) },
          update: {
            brand: String(item.brand || 'UNKNOWN'),
            partNumber: item.partNumber ? String(item.partNumber) : null,
            name: String(item.name || ''),
            category: item.category ? String(item.category) : null,
            cpu: item.cpu ? String(item.cpu) : null,
            ram: item.ram ? String(item.ram) : null,
            storage: item.storage ? String(item.storage) : null,
            qty: qty,
            status: String(item.status || (qty === 0 ? 'sold' : 'ready')),
            location: item.location ? String(item.location) : null,
            notes: item.notes ? String(item.notes) : null,
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          },
          create: {
            id: String(item.id),
            brand: String(item.brand || 'UNKNOWN'),
            partNumber: item.partNumber ? String(item.partNumber) : null,
            name: String(item.name || ''),
            category: item.category ? String(item.category) : null,
            cpu: item.cpu ? String(item.cpu) : null,
            ram: item.ram ? String(item.ram) : null,
            storage: item.storage ? String(item.storage) : null,
            qty: qty,
            status: String(item.status || (qty === 0 ? 'sold' : 'ready')),
            location: item.location ? String(item.location) : null,
            notes: item.notes ? String(item.notes) : null,
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          },
        });
        successCount++;
      }
      console.log(`✅ Berhasil memigrasi ${successCount} item inventaris ke PostgreSQL!`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('❌ Gagal memigrasi data inventaris:', err);
    }
  }

  // 2. Migrasi Stock Movements jika ada
  try {
    const rawMov = await fs.readFile(MOVEMENTS_PATH, 'utf-8');
    const cleanMov = rawMov.replace(/^\uFEFF/, '').trim();
    if (cleanMov) {
      const movements = JSON.parse(cleanMov);
      if (Array.isArray(movements) && movements.length > 0) {
        console.log(`📜 Ditemukan ${movements.length} histori mutasi untuk dimigrasi.`);
        let movCount = 0;
        for (const m of movements) {
          if (!m.id) continue;
          await prisma.stockMovement.upsert({
            where: { id: String(m.id) },
            update: {},
            create: {
              id: String(m.id),
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              itemId: m.itemId ? String(m.itemId) : null,
              partNumber: m.partNumber ? String(m.partNumber) : null,
              itemName: m.itemName ? String(m.itemName) : null,
              brand: m.brand ? String(m.brand) : null,
              type: String(m.type || 'OUT').toUpperCase(),
              amount: parseInt(m.amount, 10) || 1,
              previousQty: m.previousQty !== undefined && m.previousQty !== null ? parseInt(m.previousQty, 10) : null,
              newQty: m.newQty !== undefined && m.newQty !== null ? parseInt(m.newQty, 10) : null,
              location: m.location ? String(m.location) : null,
              actor: m.actor ? String(m.actor) : null,
              reference: m.reference ? String(m.reference) : null,
              notes: m.notes ? String(m.notes) : null,
            },
          });
          movCount++;
        }
        console.log(`✅ Berhasil memigrasi ${movCount} riwayat mutasi ke PostgreSQL!`);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('❌ Gagal memigrasi riwayat mutasi:', err);
    }
  }

  await prisma.$disconnect();
  console.log('🎉 Migrasi data selesai dengan sukses!');
}

migrate().catch(async (e) => {
  console.error('Fatal Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
