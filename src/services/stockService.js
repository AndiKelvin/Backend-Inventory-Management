import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_PATH } from '../config.js';

/**
 * Membaca data inventaris stok dari file JSON
 * @returns {Promise<Array>}
 */
export async function getAllStock() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    // Hilangkan UTF-8 BOM jika ada (sering ditinggalkan oleh PowerShell)
    const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
    if (!cleanRaw) return [];
    return JSON.parse(cleanRaw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Jika file belum ada, inisialisasi dengan array kosong
      await saveAllStock([]);
      return [];
    }
    throw err;
  }
}

/**
 * Menyimpan seluruh data inventaris ke file JSON
 * @param {Array} items
 */
export async function saveAllStock(items) {
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(items, null, 4);
  await fs.writeFile(DATA_PATH, content, 'utf-8');
  return true;
}

/**
 * Mengubah jumlah (qty) suatu unit secara cepat (+ / -)
 * @param {string} id
 * @param {number} delta
 * @returns {Promise<Object|null>}
 */
export async function updateStockQty(id, delta) {
  const items = await getAllStock();
  const target = items.find((item) => String(item.id) === String(id));

  if (!target) {
    return null;
  }

  const currentQty = parseInt(target.qty, 10) || 0;
  const change = parseInt(delta, 10) || 0;
  const newQty = Math.max(0, currentQty + change);

  target.qty = newQty;
  target.status = newQty === 0 ? 'sold' : 'ready';
  target.updatedAt = new Date().toISOString();

  await saveAllStock(items);
  return target;
}

/**
 * Menambahkan unit baru atau memperbarui unit yang sudah ada (Upsert)
 * @param {Object} unit
 * @returns {Promise<Object>}
 */
export async function saveStockUnit(unit) {
  const items = await getAllStock();
  const existingIndex = items.findIndex((item) => String(item.id) === String(unit.id));

  const updatedUnit = {
    ...unit,
    qty: parseInt(unit.qty, 10) || 0,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    items[existingIndex] = updatedUnit;
  } else {
    items.unshift(updatedUnit);
  }

  await saveAllStock(items);
  return updatedUnit;
}

/**
 * Menghapus unit inventaris berdasarkan ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteStockUnit(id) {
  const items = await getAllStock();
  const filtered = items.filter((item) => String(item.id) !== String(id));

  if (filtered.length === items.length) {
    // Tidak ada yang terhapus (ID tidak ditemukan)
    return false;
  }

  await saveAllStock(filtered);
  return true;
}
