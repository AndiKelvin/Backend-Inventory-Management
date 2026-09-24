import { prisma } from '../lib/prisma.js';

/**
 * Format objek StockItem dari Prisma agar konsisten dengan ekspektasi frontend
 */
function formatStockItem(item) {
  return {
    id: item.id,
    brand: item.brand,
    partNumber: item.partNumber || '',
    name: item.name,
    category: item.category || 'other',
    cpu: item.cpu || '',
    ram: item.ram || '',
    storage: item.storage || '',
    qty: item.qty,
    status: item.status,
    location: item.location || '',
    notes: item.notes || '',
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : (item.updatedAt || new Date().toISOString()),
  };
}

/**
 * Membaca data inventaris stok dari database PostgreSQL
 * @returns {Promise<Array>}
 */
export async function getAllStock() {
  const items = await prisma.stockItem.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return items.map(formatStockItem);
}

/**
 * Menyimpan seluruh data inventaris ke PostgreSQL (Batch Upsert)
 * @param {Array} items
 */
export async function saveAllStock(items) {
  if (!Array.isArray(items)) return false;

  await prisma.$transaction(
    items.map((item) => {
      const id = String(item.id || `${(item.brand || 'item').toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
      const qty = parseInt(item.qty, 10) || 0;
      const status = item.status || (qty === 0 ? 'sold' : 'ready');

      return prisma.stockItem.upsert({
        where: { id },
        update: {
          brand: String(item.brand || 'UNKNOWN'),
          partNumber: item.partNumber ? String(item.partNumber) : null,
          name: String(item.name || ''),
          category: item.category ? String(item.category) : null,
          cpu: item.cpu ? String(item.cpu) : null,
          ram: item.ram ? String(item.ram) : null,
          storage: item.storage ? String(item.storage) : null,
          qty,
          status,
          location: item.location ? String(item.location) : null,
          notes: item.notes ? String(item.notes) : null,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        },
        create: {
          id,
          brand: String(item.brand || 'UNKNOWN'),
          partNumber: item.partNumber ? String(item.partNumber) : null,
          name: String(item.name || ''),
          category: item.category ? String(item.category) : null,
          cpu: item.cpu ? String(item.cpu) : null,
          ram: item.ram ? String(item.ram) : null,
          storage: item.storage ? String(item.storage) : null,
          qty,
          status,
          location: item.location ? String(item.location) : null,
          notes: item.notes ? String(item.notes) : null,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        },
      });
    })
  );
  return true;
}

/**
 * Mengubah jumlah (qty) suatu unit secara cepat (+ / -) di PostgreSQL
 * @param {string} id
 * @param {number} delta
 * @returns {Promise<Object|null>}
 */
export async function updateStockQty(id, delta) {
  const target = await prisma.stockItem.findUnique({
    where: { id: String(id) },
  });

  if (!target) {
    return null;
  }

  const currentQty = parseInt(target.qty, 10) || 0;
  const change = parseInt(delta, 10) || 0;
  const newQty = Math.max(0, currentQty + change);
  const newStatus = newQty === 0 ? 'sold' : 'ready';

  const updated = await prisma.stockItem.update({
    where: { id: String(id) },
    data: {
      qty: newQty,
      status: newStatus,
      updatedAt: new Date(),
    },
  });

  return formatStockItem(updated);
}

/**
 * Menambahkan unit baru atau memperbarui unit yang sudah ada (Upsert)
 * @param {Object} unit
 * @returns {Promise<Object>}
 */
export async function saveStockUnit(unit) {
  const id = String(unit.id || `${(unit.brand || 'item').toLowerCase()}-${Date.now()}`);
  const qty = parseInt(unit.qty, 10) || 0;
  const status = unit.status || (qty === 0 ? 'sold' : 'ready');

  const saved = await prisma.stockItem.upsert({
    where: { id },
    update: {
      brand: String(unit.brand || 'UNKNOWN'),
      partNumber: unit.partNumber ? String(unit.partNumber) : null,
      name: String(unit.name || ''),
      category: unit.category ? String(unit.category) : null,
      cpu: unit.cpu ? String(unit.cpu) : null,
      ram: unit.ram ? String(unit.ram) : null,
      storage: unit.storage ? String(unit.storage) : null,
      qty,
      status,
      location: unit.location ? String(unit.location) : null,
      notes: unit.notes ? String(unit.notes) : null,
      updatedAt: new Date(),
    },
    create: {
      id,
      brand: String(unit.brand || 'UNKNOWN'),
      partNumber: unit.partNumber ? String(unit.partNumber) : null,
      name: String(unit.name || ''),
      category: unit.category ? String(unit.category) : null,
      cpu: unit.cpu ? String(unit.cpu) : null,
      ram: unit.ram ? String(unit.ram) : null,
      storage: unit.storage ? String(unit.storage) : null,
      qty,
      status,
      location: unit.location ? String(unit.location) : null,
      notes: unit.notes ? String(unit.notes) : null,
      updatedAt: new Date(),
    },
  });

  return formatStockItem(saved);
}

/**
 * Menghapus unit inventaris berdasarkan ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteStockUnit(id) {
  try {
    await prisma.stockItem.delete({
      where: { id: String(id) },
    });
    return true;
  } catch (err) {
    if (err.code === 'P2025') {
      // Data tidak ditemukan
      return false;
    }
    throw err;
  }
}
