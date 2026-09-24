import { prisma } from '../lib/prisma.js';

/**
 * Format objek StockMovement dari Prisma agar konsisten dengan ekspektasi frontend
 */
function formatMovement(m) {
  return {
    id: m.id,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp || new Date().toISOString()),
    itemId: m.itemId || '',
    partNumber: m.partNumber || '',
    itemName: m.itemName || '',
    brand: m.brand || '',
    type: m.type,
    amount: m.amount,
    previousQty: m.previousQty,
    newQty: m.newQty,
    location: m.location || '',
    actor: m.actor || '',
    reference: m.reference || '',
    notes: m.notes || '',
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : (m.createdAt || new Date().toISOString()),
  };
}

/**
 * Membaca semua data riwayat mutasi dari database PostgreSQL
 * @returns {Promise<Array>}
 */
export async function getAllMovements(filters = {}) {
  const where = {};

  if (filters.itemId) {
    where.itemId = String(filters.itemId);
  }

  if (filters.type && filters.type !== 'all') {
    where.type = { equals: filters.type.toUpperCase(), mode: 'insensitive' };
  }

  if (filters.search) {
    const q = filters.search;
    where.OR = [
      { itemName: { contains: q, mode: 'insensitive' } },
      { partNumber: { contains: q, mode: 'insensitive' } },
      { actor: { contains: q, mode: 'insensitive' } },
      { reference: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const limit = filters.limit ? parseInt(filters.limit, 10) : undefined;
  const offset = filters.offset ? parseInt(filters.offset, 10) : undefined;

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });

  return movements.map(formatMovement);
}

/**
 * Menyimpan seluruh data mutasi ke PostgreSQL (digunakan jika ada batch import)
 * @param {Array} movements
 */
export async function saveAllMovements(movements) {
  if (!Array.isArray(movements)) return false;

  await prisma.$transaction(
    movements.map((m) => {
      const id = String(m.id || `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      return prisma.stockMovement.upsert({
        where: { id },
        update: {
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          itemId: m.itemId ? String(m.itemId) : null,
          partNumber: m.partNumber ? String(m.partNumber) : null,
          itemName: m.itemName ? String(m.itemName) : null,
          brand: m.brand ? String(m.brand) : null,
          type: (m.type || 'OUT').toUpperCase(),
          amount: parseInt(m.amount, 10) || 1,
          previousQty: m.previousQty !== undefined && m.previousQty !== null ? parseInt(m.previousQty, 10) : null,
          newQty: m.newQty !== undefined && m.newQty !== null ? parseInt(m.newQty, 10) : null,
          location: m.location || 'Gudang Utama',
          actor: m.actor || 'Admin',
          reference: m.reference || '-',
          notes: m.notes || '',
        },
        create: {
          id,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          itemId: m.itemId ? String(m.itemId) : null,
          partNumber: m.partNumber ? String(m.partNumber) : null,
          itemName: m.itemName ? String(m.itemName) : null,
          brand: m.brand ? String(m.brand) : null,
          type: (m.type || 'OUT').toUpperCase(),
          amount: parseInt(m.amount, 10) || 1,
          previousQty: m.previousQty !== undefined && m.previousQty !== null ? parseInt(m.previousQty, 10) : null,
          newQty: m.newQty !== undefined && m.newQty !== null ? parseInt(m.newQty, 10) : null,
          location: m.location || 'Gudang Utama',
          actor: m.actor || 'Admin',
          reference: m.reference || '-',
          notes: m.notes || '',
        },
      });
    })
  );

  return true;
}

/**
 * Mencatat 1 entri mutasi stok baru di PostgreSQL
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function recordMovement(data) {
  const newEntry = await prisma.stockMovement.create({
    data: {
      id: data.id || `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      itemId: data.itemId ? String(data.itemId) : null,
      partNumber: data.partNumber ? String(data.partNumber) : null,
      itemName: data.itemName ? String(data.itemName) : null,
      brand: data.brand ? String(data.brand) : null,
      type: (data.type || 'OUT').toUpperCase(),
      amount: parseInt(data.amount, 10) || 1,
      previousQty: data.previousQty !== undefined && data.previousQty !== null ? parseInt(data.previousQty, 10) : null,
      newQty: data.newQty !== undefined && data.newQty !== null ? parseInt(data.newQty, 10) : null,
      location: data.location || 'Gudang Utama',
      actor: data.actor || 'Admin',
      reference: data.reference || '-',
      notes: data.notes || '',
    },
  });

  return formatMovement(newEntry);
}

/**
 * Menghapus 1 entri mutasi stok berdasarkan ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteMovement(id) {
  try {
    await prisma.stockMovement.delete({
      where: { id: String(id) },
    });
    return true;
  } catch (err) {
    if (err.code === 'P2025') {
      return false;
    }
    throw err;
  }
}

/**
 * Memperbarui 1 entri catatan mutasi / job log berdasarkan ID
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateMovement(id, data) {
  const updateData = {};
  if (data.type) updateData.type = String(data.type).toUpperCase();
  if (data.amount !== undefined) updateData.amount = parseInt(data.amount, 10) || 1;
  if (data.location !== undefined) updateData.location = data.location ? String(data.location) : null;
  if (data.actor !== undefined) updateData.actor = data.actor ? String(data.actor) : null;
  if (data.reference !== undefined) updateData.reference = data.reference ? String(data.reference) : null;
  if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes) : null;
  if (data.timestamp) updateData.timestamp = new Date(data.timestamp);
  if (data.itemId !== undefined) updateData.itemId = data.itemId ? String(data.itemId) : null;
  if (data.partNumber !== undefined) updateData.partNumber = data.partNumber ? String(data.partNumber) : null;
  if (data.itemName !== undefined) updateData.itemName = data.itemName ? String(data.itemName) : null;
  if (data.brand !== undefined) updateData.brand = data.brand ? String(data.brand) : null;

  const updated = await prisma.stockMovement.update({
    where: { id: String(id) },
    data: updateData,
  });

  return formatMovement(updated);
}


