import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Lokasi file Excel yang sudah Anda taruh di folder data
const EXCEL_PATH = path.resolve(__dirname, '..', 'data', 'Data Customer 24-09-2026.xlsx');

// Fungsi helper: mengubah teks kosong/spasi menjadi null
function cleanValue(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    return str === '' ? null : str;
}

async function importCustomers() {
    console.log('📖 Membaca file Excel...');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);

    // Ambil sheet pertama
    const worksheet = workbook.worksheets[0];
    console.log(`📄 Sheet aktif: ${worksheet.name}, Total baris terbaca: ${worksheet.rowCount}`);

    let insertedCount = 0;
    let skippedCount = 0;

    // Mulai perulangan dari baris ke-2 (karena baris ke-1 adalah judul kolom)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Ambil nilai per kolom sesuai susunan Excel Anda:
        // Kolom 2: Nama Customer
        // Kolom 3: Alamat
        // Kolom 4: Contact Name
        // Kolom 5: No. Telp.
        const companyName = cleanValue(row.getCell(2).value);
        const address = cleanValue(row.getCell(3).value);
        const contactName = cleanValue(row.getCell(4).value);
        const phone = cleanValue(row.getCell(5).value);

        // Lewati jika nama perusahaan kosong (misal baris kosong di bagian bawah Excel)
        if (!companyName) {
            skippedCount++;
            continue;
        }

        // Gunakan upsert: jika data sudah ada akan di-update, jika belum ada akan dibuat baru
        // Kolom yang kosong (contactName / phone) otomatis masuk sebagai null di database
        await prisma.customer.upsert({
            where: { companyName: companyName },
            update: {
                address,
                contactName,
                phone,
            },
            create: {
                companyName,
                address,
                contactName,
                phone,
            },
        });

        insertedCount++;
        if (insertedCount % 100 === 0) {
            console.log(`⏳ Sedang memproses... sudah ${insertedCount} customer tersimpan.`);
        }
    }

    console.log(`\n🎉 Selesai! Berhasil mengimpor ${insertedCount} data customer ke Neon.`);
    await prisma.$disconnect();
}

importCustomers().catch(async (error) => {
    console.error('❌ Terjadi error saat import:', error);
    await prisma.$disconnect();
    process.exit(1);
});
