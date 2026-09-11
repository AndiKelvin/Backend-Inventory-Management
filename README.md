# TechStock Pro - Backend (Fastify)

REST API server berkecepatan tinggi untuk manajemen inventaris stok Laptop & PC, dibangun menggunakan framework modern **Fastify** dan **Node.js (ES Modules)**.

## Fitur Utama
- Framework berkinerja tinggi berbasis Fastify v5.
- Arsitektur modular berstandar industri (*Routes, Services, Controllers*).
- Schema Validation otomatis pada endpoint API.
- Penyimpanan data asinkron berbasis JSON (`data/stock_inventory.json`).
- Deteksi IP LAN otomatis untuk akses antar perangkat di jaringan lokal (Wi-Fi/LAN).
- Mendukung integrasi CORS penuh dengan frontend React.

## Prasyarat
- [Node.js](https://nodejs.org/) (v20 ke atas)

## Instalasi & Menjalankan

1. **Clone repository:**
   ```bash
   git clone https://github.com/AndiKelvin/stock-laptop-pc-backend.git
   cd stock-laptop-pc-backend
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```
   Server akan berjalan di `http://localhost:3000`.

4. **Jalankan mode produksi:**
   ```bash
   npm start
   ```

## Endpoint REST API

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/stock` | Mengambil seluruh daftar stok inventaris |
| `POST` | `/api/stock/save` | Menambah unit baru atau memperbarui unit (Upsert) |
| `POST` | `/api/stock/update-qty` | Mengubah kuantitas stok (+ / -) |
| `POST` | `/api/stock/save-all` | Menyimpan/mengganti seluruh data sekaligus |
| `DELETE` | `/api/stock/:id` | Menghapus unit inventaris berdasarkan ID |
| `GET` | `/health` | Memeriksa status kesehatan server |
