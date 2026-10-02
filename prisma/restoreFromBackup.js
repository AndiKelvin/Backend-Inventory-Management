import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const BACKUP_PATH = path.resolve(__dirname, '..', 'data', 'backup_postgres_local.json');

async function restore() {
  console.log('🚀 Memulai restore data ke Neon PostgreSQL...');

  const raw = await fs.readFile(BACKUP_PATH, 'utf-8');
  const backup = JSON.parse(raw);

  const items = backup.items || [];
  const movements = backup.movements || [];

  console.log(`📦 Mengimpor ${items.length} data barang...`);
  let itemCount = 0;
  for (const item of items) {
    await prisma.stockItem.upsert({
      where: { id: item.id },
      update: {
        brand: item.brand,
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        cpu: item.cpu,
        ram: item.ram,
        storage: item.storage,
        qty: item.qty,
        status: item.status,
        location: item.location,
        notes: item.notes,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      },
      create: {
        id: item.id,
        brand: item.brand,
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        cpu: item.cpu,
        ram: item.ram,
        storage: item.storage,
        qty: item.qty,
        status: item.status,
        location: item.location,
        notes: item.notes,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      },
    });
    itemCount++;
  }
  console.log(`✅ Berhasil restore ${itemCount} barang ke Neon!`);

  console.log(`📜 Mengimpor ${movements.length} riwayat mutasi...`);
  let movCount = 0;
  for (const m of movements) {
    await prisma.stockMovement.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        itemId: m.itemId,
        partNumber: m.partNumber,
        itemName: m.itemName,
        brand: m.brand,
        type: m.type,
        amount: m.amount,
        previousQty: m.previousQty,
        newQty: m.newQty,
        location: m.location,
        actor: m.actor,
        reference: m.reference,
        notes: m.notes,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      },
    });
    movCount++;
  }
  console.log(`✅ Berhasil restore ${movCount} mutasi ke Neon!`);

  await prisma.$disconnect();
  console.log('🎉 SELURUH DATA LENGKAP & BERHASIL DIPINDAHKAN KE NEON!');
}

restore().catch(async (e) => {
  console.error('❌ Restore gagal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
