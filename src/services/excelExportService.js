import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mencari path template file Excel yang valid
 */
function getTemplateFilePath() {
  const possiblePaths = [
    path.resolve(__dirname, '../../data/template_rekap_stok.xlsx'),
    path.resolve(__dirname, '../../../Rekapan_Data/Rekap Stok Barang Hp dan Dell 08-09-2026.xlsx'),
    '/Users/andikelvin/Desktop/Daftar_Stock/Rekapan_Data/Rekap Stok Barang Hp dan Dell 08-09-2026.xlsx'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Template file Excel "Rekap Stok Barang Hp dan Dell" tidak ditemukan');
}

/**
 * Menghasilkan file Excel terkini yang sinkron dengan data web
 * dengan mempertahankan 100% format asli template Excel (semua styles,
 * font, border, rumus shared formula, dan calcChain tetap utuh tanpa tereduksi oleh serializer)
 * @param {Array} inventoryItems Data inventaris live
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 */
export async function generateStockExcel(inventoryItems) {
  const templatePath = getTemplateFilePath();
  const scriptPath = path.resolve(__dirname, 'generateExcelPatch.py');

  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = now.getFullYear();
  const filename = `Rekap Stok Barang Hp dan Dell ${dayStr}-${monthStr}-${yearStr}.xlsx`;

  const tempOutputPath = path.join(
    os.tmpdir(),
    `rekap_export_${Date.now()}_${Math.random().toString(36).substring(7)}.xlsx`
  );

  try {
    execFileSync('python3', [scriptPath, templatePath, tempOutputPath], {
      input: JSON.stringify(inventoryItems),
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });

    const buffer = fs.readFileSync(tempOutputPath);
    return { buffer, filename };
  } finally {
    if (fs.existsSync(tempOutputPath)) {
      try {
        fs.unlinkSync(tempOutputPath);
      } catch (err) {
        // ignore cleanup error
      }
    }
  }
}
