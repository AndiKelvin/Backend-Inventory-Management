import fs from 'node:fs/promises';
import path from 'node:path';
import { MOVEMENTS_PATH } from '../config.js';

/**
 * Membaca semua data riwayat mutasi dari stock_movements.json
 * @returns {Promise<Array>}
 */
export async function getAllMovements(filters = {}) {
  try {
    const raw = await fs.readFile(MOVEMENTS_PATH, 'utf-8');
    const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
    if (!cleanRaw) return [];
    let movements = JSON.parse(cleanRaw);

    if (!Array.isArray(movements)) return [];

    // Filter berdasarkan itemId
    if (filters.itemId) {
      movements = movements.filter((m) => String(m.itemId) === String(filters.itemId));
    }

    // Filter berdasarkan tipe: 'IN' | 'OUT' | 'BOOKING' | 'ADJUSTMENT'
    if (filters.type && filters.type !== 'all') {
      movements = movements.filter((m) => (m.type || '').toUpperCase() === filters.type.toUpperCase());
    }

    // Filter pencarian teks bebas (nama, part number, sales/penerima, no PO)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      movements = movements.filter((m) =>
        (m.itemName || '').toLowerCase().includes(q) ||
        (m.partNumber || '').toLowerCase().includes(q) ||
        (m.actor || '').toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)
      );
    }

    // Urutkan dari yang paling baru
    movements.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

    if (filters.limit) {
      const limit = parseInt(filters.limit, 10) || 50;
      const offset = parseInt(filters.offset, 10) || 0;
      movements = movements.slice(offset, offset + limit);
    }

    return movements;
  } catch (err) {
    if (err.code === 'ENOENT') {
      await saveAllMovements([]);
      return [];
    }
    throw err;
  }
}

/**
 * Menyimpan seluruh data mutasi ke file JSON
 * @param {Array} movements
 */
export async function saveAllMovements(movements) {
  const dir = path.dirname(MOVEMENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(movements, null, 4);
  await fs.writeFile(MOVEMENTS_PATH, content, 'utf-8');
  return true;
}

/**
 * Mencatat 1 entri mutasi stok baru
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function recordMovement(data) {
  const all = await getAllMovements();
  const newEntry = {
    id: data.id || `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: data.timestamp || new Date().toISOString(),
    itemId: data.itemId || '',
    partNumber: data.partNumber || '',
    itemName: data.itemName || '',
    brand: data.brand || '',
    type: (data.type || 'OUT').toUpperCase(), // 'IN' | 'OUT' | 'BOOKING' | 'ADJUSTMENT'
    amount: parseInt(data.amount, 10) || 1,
    previousQty: data.previousQty !== undefined ? parseInt(data.previousQty, 10) : null,
    newQty: data.newQty !== undefined ? parseInt(data.newQty, 10) : null,
    location: data.location || 'Gudang Utama',
    actor: data.actor || 'Admin', // Sales / Penerima / Pemesan
    reference: data.reference || '-', // No. PO / DO / Surat Jalan
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
  };

  all.unshift(newEntry);
  await saveAllMovements(all);
  return newEntry;
}
