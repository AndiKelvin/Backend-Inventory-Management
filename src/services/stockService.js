import fs from 'node:fs/promises';
import { prisma } from '../lib/prisma.js';
import { SALES_PATH } from '../config.js';

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
 * @param {string} mode 'merge' | 'replace'
 */
export async function saveAllStock(items, mode = 'merge') {
  if (!Array.isArray(items)) return false;

  const validIds = [];
  const upsertOps = items.map((item) => {
    const id = String(item.id || `${(item.brand || 'item').toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
    validIds.push(id);
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
  });

  const operations = [...upsertOps];

  // Jika mode replace, hapus item di database yang tidak ada dalam daftar item baru
  if (mode === 'replace' && validIds.length > 0) {
    operations.unshift(
      prisma.stockItem.deleteMany({
        where: {
          id: { notIn: validIds },
        },
      })
    );
  }

  await prisma.$transaction(operations);
  return true;
}

/**
 * Mengubah jumlah (qty) suatu unit secara cepat (+ / -) di PostgreSQL
 * dan otomatis mencatat mutasi ke StockMovement untuk audit trail
 * @param {string} id
 * @param {number} delta
 * @param {Object} [meta] Metadata mutasi (actor, reference, notes, location)
 * @returns {Promise<Object|null>}
 */
export async function updateStockQty(id, delta, meta = {}) {
  const target = await prisma.stockItem.findUnique({
    where: { id: String(id) },
  });

  if (!target) {
    return null;
  }

  const currentQty = parseInt(target.qty, 10) || 0;
  const change = parseInt(delta, 10) || 0;
  const newQty = Math.max(0, currentQty + change);
  const actualDelta = newQty - currentQty;

  if (actualDelta === 0) {
    return formatStockItem(target);
  }

  const newStatus = newQty === 0 ? 'sold' : 'ready';

  const updated = await prisma.stockItem.update({
    where: { id: String(id) },
    data: {
      qty: newQty,
      status: newStatus,
      updatedAt: new Date(),
    },
  });

  // Catat riwayat mutasi stok secara otomatis ke StockMovement
  try {
    const isAdd = actualDelta > 0;
    await prisma.stockMovement.create({
      data: {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date(),
        itemId: target.id,
        partNumber: target.partNumber || null,
        itemName: target.name || null,
        brand: target.brand || null,
        type: meta.type || (isAdd ? 'IN' : 'OUT'),
        amount: Math.abs(actualDelta),
        previousQty: currentQty,
        newQty: newQty,
        location: meta.location || target.location || 'Gudang Utama',
        actor: meta.actor || 'Admin Gudang',
        reference: meta.reference || 'QUICK-STEPPER',
        notes: meta.notes || (isAdd ? `Penyesuaian stok cepat (+${actualDelta} unit)` : `Penyesuaian stok cepat (${actualDelta} unit)`),
      },
    });
  } catch (mErr) {
    console.warn('Gagal mencatat mutasi audit saat updateStockQty:', mErr);
  }

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

/**
 * Mengambil seluruh data customer dari PostgreSQL
 * @param {string} [search]
 * @returns {Promise<Array>}
 */
export async function getAllCustomers(search = '') {
  const where = {};
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { companyName: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
    ];
  }

  return await prisma.customer.findMany({
    where,
    orderBy: { companyName: 'asc' },
  });
}

/**
 * Menambahkan customer baru
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createCustomer(data) {
  const companyName = String(data.companyName || '').trim();
  if (!companyName) {
    throw new Error('Nama perusahaan wajib diisi');
  }

  return await prisma.customer.create({
    data: {
      companyName,
      address: data.address ? String(data.address).trim() : null,
      contactName: data.contactName ? String(data.contactName).trim() : null,
      phone: data.phone ? String(data.phone).trim() : null,
    },
  });
}

/**
 * Memperbarui data customer
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateCustomer(id, data) {
  const companyName = String(data.companyName || '').trim();
  if (!companyName) {
    throw new Error('Nama perusahaan wajib diisi');
  }

  return await prisma.customer.update({
    where: { id: String(id) },
    data: {
      companyName,
      address: data.address !== undefined ? (data.address ? String(data.address).trim() : null) : undefined,
      contactName: data.contactName !== undefined ? (data.contactName ? String(data.contactName).trim() : null) : undefined,
      phone: data.phone !== undefined ? (data.phone ? String(data.phone).trim() : null) : undefined,
    },
  });
}

/**
 * Menghapus customer berdasarkan ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteCustomer(id) {
  try {
    await prisma.customer.delete({
      where: { id: String(id) },
    });
    return true;
  } catch (err) {
    if (err.code === 'P2025') return false;
    throw err;
  }
}

/**
 * Mengambil daftar nama sales yang terdata
 * Prioritas membaca dari data/sales.json agar mudah diedit/ditambah sewaktu-waktu
 * @returns {Promise<Array<string>>}
 */
export async function getKnownSales() {
  const DEFAULT_SALES = [
    'Bondas', 'Carlo', 'Citra', 'Fungherry', 'Henny',
    'Herry', 'Ibu Lusi', 'Irwin', 'Liza', 'Mukti',
    'Pipit', 'Rama', 'Yussi'
  ];

  try {
    const raw = await fs.readFile(SALES_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map(s => String(s).trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // Jika file belum ada atau terjadi error parsing, gunakan fallback default
  }

  return DEFAULT_SALES.sort((a, b) => a.localeCompare(b));
}

/**
 * Menyimpan seluruh daftar nama sales ke data/sales.json
 * @param {Array<string>} salesList
 * @returns {Promise<Array<string>>}
 */
export async function saveKnownSales(salesList) {
  if (!Array.isArray(salesList)) {
    throw new Error('Format daftar sales harus berupa array');
  }

  const cleaned = Array.from(new Set(
    salesList
      .map(s => String(s).trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  await fs.writeFile(SALES_PATH, JSON.stringify(cleaned, null, 2), 'utf-8');
  return cleaned;
}

/**
 * Menambahkan 1 nama sales baru
 * @param {string} name
 * @returns {Promise<Array<string>>}
 */
export async function addKnownSales(name) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Nama sales tidak boleh kosong');
  }

  const current = await getKnownSales();
  if (!current.some(s => s.toLowerCase() === cleanName.toLowerCase())) {
    current.push(cleanName);
    return await saveKnownSales(current);
  }
  return current;
}

/**
 * Menghapus 1 nama sales
 * @param {string} name
 * @returns {Promise<Array<string>>}
 */
export async function deleteKnownSales(name) {
  const cleanName = String(name || '').trim().toLowerCase();
  const current = await getKnownSales();
  const filtered = current.filter(s => s.toLowerCase() !== cleanName);
  return await saveKnownSales(filtered);
}
