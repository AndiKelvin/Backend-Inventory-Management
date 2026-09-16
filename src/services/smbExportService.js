import ExcelJS from 'exceljs';

/**
 * Format nama bulan dan tahun saat ini (contoh: "SEPTEMBER 2026")
 */
function getPeriodTitle() {
  const months = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const now = new Date();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  return `${monthName} ${year}`;
}

/**
 * Format tanggal periode untuk Distri (contoh: "Periode Tgl. 15 September 2026")
 */
function getDistriPeriodTitle() {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const now = new Date();
  const day = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  return `Periode Tgl. ${day} ${monthName} ${year}`;
}

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

/**
 * Helper untuk memberikan border tipis pada range sel
 */
function applyBordersToRange(ws, startRow, endRow, startCol, endCol) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    for (let c = startCol; c <= endCol; c++) {
      row.getCell(c).border = thinBorder;
    }
  }
}

/**
 * Generate Excel SMB HP
 * Berdasarkan tangkapan layar 1:
 * - Judul: UPDATE STOCK HP PT PROJECTINDO TEKNOWINDATA
 * - Periode: [BULAN] [TAHUN]
 * - Header: Product Base | Product Base Name (tanpa warna)
 * - Data: Ambil dari tabel khusus HP hanya nomor 2-4 (stok terbanyak, lewati no 1, no 5-7, no 8)
 */
export async function generateSmbHpExcel(items) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('UPDATE STOCK HP');

  // Filter HP dengan qty > 0 dan urutkan stock-desc
  const hpItems = items
    .filter((it) => it.brand === 'HP' && it.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  // Ambil hanya urutan no 2 sampai 4 (indeks 1 sampai 3)
  // No 1: 365K5PA (dilewati: part rusak)
  // No 2-4: 446J7PA, 8M0Y9PA, 9J086PT
  // No 5-7: display demo & lama
  // No 8: pak igun
  const selectedHp = hpItems.slice(1, 4);

  // Set lebar kolom
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 95;

  // Baris 1: Judul PT
  ws.mergeCells('A1:B1');
  const title1 = ws.getCell('A1');
  title1.value = 'UPDATE STOCK HP PT PROJECTINDO TEKNOWINDATA';
  title1.font = { name: 'Calibri', size: 12, bold: true };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 24;

  // Baris 2: Periode
  ws.mergeCells('A2:B2');
  const title2 = ws.getCell('A2');
  title2.value = getPeriodTitle();
  title2.font = { name: 'Calibri', size: 12, bold: true };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 22;

  // Baris 3: Header Kolom
  const row3 = ws.getRow(3);
  row3.height = 24;

  const headerA = row3.getCell(1);
  headerA.value = 'Product Base';
  headerA.font = { name: 'Calibri', size: 11, bold: true };
  headerA.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const headerB = row3.getCell(2);
  headerB.value = 'Product Base Name';
  headerB.font = { name: 'Calibri', size: 11, bold: true };
  headerB.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Baris Data
  let currentRow = 4;
  for (const it of selectedHp) {
    const row = ws.getRow(currentRow);
    row.height = 22;

    const cellA = row.getCell(1);
    cellA.value = it.partNumber;
    cellA.font = { name: 'Calibri', size: 11, bold: true };
    cellA.alignment = { vertical: 'middle', horizontal: 'left' };

    const cellB = row.getCell(2);
    cellB.value = it.name;
    cellB.font = { name: 'Calibri', size: 11 };
    cellB.alignment = { vertical: 'middle', horizontal: 'left' };

    currentRow++;
  }

  // Terapkan border tipis pada seluruh tabel A1:B(currentRow - 1)
  applyBordersToRange(ws, 1, currentRow - 1, 1, 2);

  // Pastikan gridlines aktif
  ws.views = [{ showGridLines: true }];

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `UPDATE STOCK HP PT PROJECTINDO TEKNOWINDATA ${getPeriodTitle()}.xlsx`;
  return { buffer, filename };
}

/**
 * Generate Excel SMB Dell
 * Berdasarkan tangkapan layar 2:
 * - Judul: UPDATE STOCK DELL PT. GLOBAL SOLUSINDO KOMPUDATA
 * - Periode: [BULAN] [TAHUN]
 * - Header: Product Base | Product Base Name (tanpa warna)
 * - Data: Dell dan Dell Lainnya digabung, lewati yang sisa stoknya <= 1
 */
export async function generateSmbDellExcel(items) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('UPDATE STOCK DELL');

  const dellPreferredOrder = [
    'GB7010SFF5',
    'GB3000SFF',
    'GA7330I5V1',
    'GA3440I7V1',
    'GA3440I7V2',
    'GB7010I7V3',
    'GA7450U7V1',
    'GB3050MFX7',
    'GB3050MFF',
    'GB46R63'
  ];

  // Gabungkan Dell dan Dell Lainnya, filter stok > 1 (sisa 1 dilewati)
  // serta lewati kode placeholder lama yang tidak masuk katalog SMB
  const dellItems = items
    .filter(
      (it) =>
        (it.brand === 'DELL' || it.brand === 'DELL LAINNYA') &&
        it.qty > 1 &&
        !it.partNumber.startsWith('OPT-')
    )
    .sort((a, b) => {
      const idxA = dellPreferredOrder.indexOf(a.partNumber);
      const idxB = dellPreferredOrder.indexOf(b.partNumber);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.qty - a.qty;
    });

  // Set lebar kolom
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 95;

  // Baris 1: Judul PT
  ws.mergeCells('A1:B1');
  const title1 = ws.getCell('A1');
  title1.value = 'UPDATE STOCK DELL PT. GLOBAL SOLUSINDO KOMPUDATA';
  title1.font = { name: 'Calibri', size: 12, bold: true };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 24;

  // Baris 2: Periode
  ws.mergeCells('A2:B2');
  const title2 = ws.getCell('A2');
  title2.value = getPeriodTitle();
  title2.font = { name: 'Calibri', size: 12, bold: true };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 22;

  // Baris 3: Header Kolom
  const row3 = ws.getRow(3);
  row3.height = 24;

  const headerA = row3.getCell(1);
  headerA.value = 'Product Base';
  headerA.font = { name: 'Calibri', size: 11, bold: true };
  headerA.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const headerB = row3.getCell(2);
  headerB.value = 'Product Base Name';
  headerB.font = { name: 'Calibri', size: 11, bold: true };
  headerB.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Baris Data
  let currentRow = 4;
  for (const it of dellItems) {
    const row = ws.getRow(currentRow);
    row.height = 22;

    const cellA = row.getCell(1);
    cellA.value = it.partNumber;
    cellA.font = { name: 'Calibri', size: 11, bold: true };
    cellA.alignment = { vertical: 'middle', horizontal: 'left' };

    const cellB = row.getCell(2);
    cellB.value = it.name;
    cellB.font = { name: 'Calibri', size: 11 };
    cellB.alignment = { vertical: 'middle', horizontal: 'left' };

    currentRow++;
  }

  // Terapkan border tipis pada seluruh tabel A1:B(currentRow - 1)
  applyBordersToRange(ws, 1, currentRow - 1, 1, 2);

  // Pastikan gridlines aktif
  ws.views = [{ showGridLines: true }];

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `UPDATE STOCK DELL PT. GLOBAL SOLUSINDO KOMPUDATA ${getPeriodTitle()}.xlsx`;
  return { buffer, filename };
}

/**
 * Generate Excel Distri HP
 * Berdasarkan referensi Contoh format capture stock HP Distri.jpeg
 */
export async function generateDistriHpExcel(items) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('HP Distri');

  const hpItems = items.filter((it) => it.brand === 'HP' && it.qty > 0);

  // Set lebar kolom
  ws.getColumn(1).width = 12; // TYPE
  ws.getColumn(2).width = 16; // PART NUMBER
  ws.getColumn(3).width = 65; // Nama Barang
  ws.getColumn(4).width = 35; // Barang datang Dari
  ws.getColumn(5).width = 14; // TOTAL STOCK (IGUN)
  ws.getColumn(6).width = 12; // Total REAL
  ws.getColumn(7).width = 65; // BREAKDOWN TOTAL REAL

  // Baris 1: Judul
  ws.mergeCells('A1:G1');
  const t1 = ws.getCell('A1');
  t1.value = 'Laporan Stock Barang PT. Projectindo Teknowindata';
  t1.font = { name: 'Calibri', size: 13, bold: true };
  t1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 24;

  // Baris 2: Periode
  ws.mergeCells('A2:G2');
  const t2 = ws.getCell('A2');
  t2.value = getDistriPeriodTitle();
  t2.font = { name: 'Calibri', size: 11, bold: true };
  t2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 20;

  // Baris 3: Header
  const headers = [
    'TYPE',
    'PART NUMBER',
    'Nama Barang',
    'Barang datang Dari',
    'TOTAL STOCK\n(IGUN)',
    'Total\nREAL',
    'BREAKDOWN TOTAL REAL'
  ];
  const r3 = ws.getRow(3);
  r3.height = 32;
  headers.forEach((h, idx) => {
    const c = r3.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 11, bold: true };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  let curRow = 4;
  let sumReal = 0;
  for (const it of hpItems) {
    const row = ws.getRow(curRow);
    row.height = 42;

    row.getCell(1).value = it.category === 'pc-desktop' ? 'PC' : 'NOTEBOOK';
    row.getCell(2).value = it.partNumber;
    row.getCell(3).value = it.name;
    row.getCell(4).value = 'PT TECH DATA ADVANCED SOLUTIONS';
    row.getCell(5).value = 0;
    row.getCell(6).value = it.qty;
    row.getCell(7).value = `${it.location || '-'}\n${it.notes || ''}`.trim();

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center', bold: true };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    sumReal += it.qty;
    curRow++;
  }

  // Baris Total
  const totRow = ws.getRow(curRow);
  totRow.height = 24;
  ws.mergeCells(`A${curRow}:E${curRow}`);
  const cTot = totRow.getCell(1);
  cTot.value = 'TOTAL';
  cTot.font = { name: 'Calibri', size: 11, bold: true };
  cTot.alignment = { vertical: 'middle', horizontal: 'center' };

  const cTotVal = totRow.getCell(6);
  cTotVal.value = sumReal;
  cTotVal.font = { name: 'Calibri', size: 11, bold: true };
  cTotVal.alignment = { vertical: 'middle', horizontal: 'center' };

  applyBordersToRange(ws, 1, curRow, 1, 7);
  ws.views = [{ showGridLines: true }];

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `Laporan Stock HP Distri ${getPeriodTitle()}.xlsx`;
  return { buffer, filename };
}

/**
 * Generate Excel Distri Dell
 * Berdasarkan referensi Contoh format capture stock Dell Distri.jpeg
 */
export async function generateDistriDellExcel(items) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Dell Distri');

  const dellItems = items.filter((it) => it.brand === 'DELL' && it.qty > 0);

  // Set lebar kolom
  ws.getColumn(1).width = 14; // TYPE
  ws.getColumn(2).width = 16; // Part ID GSK
  ws.getColumn(3).width = 65; // Nama Barang
  ws.getColumn(4).width = 42; // Barang Datang Dari
  ws.getColumn(5).width = 12; // Total Real
  ws.getColumn(6).width = 65; // Breakdown Total Real

  // Baris 1: Judul
  ws.mergeCells('A1:F1');
  const t1 = ws.getCell('A1');
  t1.value = 'Laporan Stock Barang DELL PT. Global Solusindo Kompudata';
  t1.font = { name: 'Calibri', size: 13, bold: true };
  t1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 24;

  // Baris 2: Periode
  ws.mergeCells('A2:F2');
  const t2 = ws.getCell('A2');
  t2.value = getDistriPeriodTitle();
  t2.font = { name: 'Calibri', size: 11, bold: true };
  t2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 20;

  // Baris 3: Header
  const headers = [
    'TYPE',
    'Part ID GSK',
    'Nama Barang',
    'Barang Datang Dari',
    'Total Real',
    'Breakdown Total Real'
  ];
  const r3 = ws.getRow(3);
  r3.height = 28;
  headers.forEach((h, idx) => {
    const c = r3.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 11, bold: true };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  let curRow = 4;
  let sumReal = 0;
  for (const it of dellItems) {
    const row = ws.getRow(curRow);
    row.height = 42;

    row.getCell(1).value = it.category === 'pc-desktop' ? 'OPTIPLEX' : 'LATITUDE';
    row.getCell(2).value = it.partNumber;
    row.getCell(3).value = it.name;
    row.getCell(4).value = 'PT. ADAKOM INTERNATIONAL TECHNOLOGY';
    row.getCell(5).value = it.qty;
    row.getCell(6).value = `${it.location || '-'}\n${it.notes || ''}`.trim();

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center', bold: true };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    sumReal += it.qty;
    curRow++;
  }

  // Baris Total
  const totRow = ws.getRow(curRow);
  totRow.height = 24;
  ws.mergeCells(`A${curRow}:D${curRow}`);
  const cTot = totRow.getCell(1);
  cTot.value = 'TOTAL';
  cTot.font = { name: 'Calibri', size: 11, bold: true };
  cTot.alignment = { vertical: 'middle', horizontal: 'center' };

  const cTotVal = totRow.getCell(5);
  cTotVal.value = sumReal;
  cTotVal.font = { name: 'Calibri', size: 11, bold: true };
  cTotVal.alignment = { vertical: 'middle', horizontal: 'center' };

  applyBordersToRange(ws, 1, curRow, 1, 6);
  ws.views = [{ showGridLines: true }];

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `Laporan Stock DELL Distri ${getPeriodTitle()}.xlsx`;
  return { buffer, filename };
}
