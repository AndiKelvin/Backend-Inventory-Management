# Framework UI/UX: Sistem "Daftar Stok Berjalan"

Dokumen ini merangkum arsitektur, prinsip desain, design tokens, dan panduan komponen antarmuka (*UI/UX Framework*) untuk aplikasi **Daftar Stok Berjalan**.

---

## 1. Prinsip Utama Desain (Core Design Principles)

1. **High Information Density (Kepadatan Informasi Tinggi)**
   - Admin kantor perlu melihat ketersediaan 15-20 barang secara cepat dalam satu layar desktop tanpa harus melakukan *scrolling* berlebihan.
   - Tinggi baris tabel dioptimalkan pada `42px - 44px` dengan padding yang presisi.

2. **Zero Visual Clutter (Bebas Elemen Berulang & Mengganggu)**
   - Menghilangkan badge atau kolom yang redundan (seperti kolom status berulang atau banner notifikasi hijau).
   - Menghilangkan data harga karena operasional admin murni fokus pada jumlah stok sisa (*running stock*).

3. **Tactile 1-Click Action (Aksi Instan Sekali Klik)**
   - Alur *take-out* barang saat ada pemesanan dilakukan langsung di tabel menggunakan stepper `[-]` dan `[+]` tanpa perlu membuka formulir edit.

4. **Scannable Hierarchy (Mudah Dipindai Secara Visual)**
   - Kode Part ID/Number menggunakan font *monospace* (`JetBrains Mono`).
   - Lokasi dan status mapping disajikan dengan baris ringkas berikon (`📍 Lokasi` dan `👤 Mapping`).

---

## 2. Design Tokens (Variabel CSS Global)

### A. Palet Warna (Color Tokens)
| Token | Nilai Hex | Penggunaan |
| :--- | :--- | :--- |
| `--dell-primary` | `#1D4ED8` | Identitas brand DELL (Primary Blue) |
| `--dell-surface` | `#EFF6FF` | Background pill & tag DELL |
| `--hp-primary` | `#0284C7` | Identitas brand HP (Cyan Blue) |
| `--hp-surface` | `#F0F9FF` | Background pill & tag HP |
| `--other-primary` | `#4F46E5` | Identitas DELL LAINNYA (Indigo) |
| `--other-surface` | `#EEF2FF` | Background pill stok lama |
| `--ready-green` | `#059669` | Indikator stok tersedia & tombol Share WA |
| `--amber-warning` | `#D97706` | Indikator stok kritis (≤ 2 unit) |
| `--red-critical` | `#DC2626` | Indikator stok habis (0 unit) |
| `--text-primary` | `#0F172A` | Warna teks utama (*Slate 900*) |
| `--text-secondary` | `#475569` | Warna teks sekunder (*Slate 600*) |
| `--bg-page` | `#F8FAFC` | Latar belakang halaman (*Slate 50*) |
| `--bg-card` | `#FFFFFF` | Latar belakang kontainer & tabel |

### B. Tipografi (Typography Scale)
- **Font Utama**: `Inter`, sans-serif (untuk judul, teks tabel, navigasi, dan tombol).
- **Font Monospace**: `JetBrains Mono`, monospace (untuk Part Number, kode SKU, dan format teks WA).
- **Skala Ukuran**:
  - `Header Title`: `1.2rem (19.2px)` / Weight: `800`
  - `KPI Numbers`: `1.3rem (20.8px)` / Weight: `800`
  - `Table Head`: `0.74rem (11.8px)` / Weight: `700` / Uppercase
  - `Table Body`: `0.81rem (13px)` / Weight: `500 - 600`
  - `Micro-lines`: `0.75rem (12px)` / Weight: `500`

### C. Elevasi & Bayangan (Shadow Tokens)
- `--shadow-xs`: `0 1px 2px 0 rgba(0, 0, 0, 0.04)` (Tabel card & stepper)
- `--shadow-sm`: `0 1px 3px 0 rgba(0, 0, 0, 0.06)` (Header & kartu metrik)
- `--shadow-floating`: `0 20px 25px -5px rgba(15, 23, 42, 0.15)` (Modal dialog)

---

## 3. Komponen Antarmuka Utama (Component Library)

### 1. Stepper Widget (Fast Take-Out)
- **HTML**:
  ```html
  <div class="stock-stepper-compact">
    <button class="btn-step minus" onclick="App.handleStockChange(id, -1)">-</button>
    <span class="step-qty-val">24</span>
    <button class="btn-step plus" onclick="App.handleStockChange(id, 1)">+</button>
  </div>
  ```
- **Fungsi**: Memperbarui stok berjalan secara langsung di backend JSON tanpa reload halaman.

### 2. Micro-Lines Lokasi & Mapping
- **HTML**:
  ```html
  <div class="loc-map-cell">
    <div class="meta-line meta-loc"><i data-lucide="map-pin"></i><span>Pallazo (6)</span></div>
    <div class="meta-line meta-map"><i data-lucide="user-check"></i><span>Map: Kak Pipit - RSIJ (5)</span></div>
  </div>
  ```
- **Fungsi**: Membedakan secara visual lokasi fisik barang dan alokasi *mapping customer* tanpa membuat tabel sesak.

### 3. Segmented Brand Tabs
- Tab filter responsif dengan counter badge yang menghitung jumlah model aktif secara dinamis (`Semua`, `DELL`, `HP`, `DELL LAINNYA`, `Stok Kritis`, `Habis`).

### 4. Interactive Framework Modal
- Tersedia tombol **"Framework UI/UX"** di header navigasi web yang membuka panduan interaktif langsung di browser.
