import crypto from 'node:crypto';
import { APP_PIN } from '../config.js';

// Penyimpanan token sesi di memori (dapat bertahan selama server aktif)
// Map<token, { createdAt: number }>
const activeSessions = new Map();

// Bersihkan sesi kedaluwarsa setelah 7 hari
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, data] of activeSessions.entries()) {
    if (now - data.createdAt > SESSION_TTL_MS) {
      activeSessions.delete(token);
    }
  }
}

// Jalankan pembersihan sesi setiap 6 jam
setInterval(cleanupExpiredSessions, 6 * 60 * 60 * 1000).unref();

/**
 * Verifikasi PIN yang dikirim dari klien
 * @param {string} inputPin
 * @returns {{ success: boolean, token?: string, error?: string }}
 */
export function verifyPin(inputPin) {
  if (!inputPin) {
    return { success: false, error: 'PIN tidak boleh kosong' };
  }

  const cleanInput = String(inputPin).trim();
  const cleanTarget = String(APP_PIN).trim();

  if (cleanInput === cleanTarget) {
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, { createdAt: Date.now() });
    return { success: true, token };
  }

  return { success: false, error: 'PIN salah. Akses ditolak.' };
}

/**
 * Validasi apakah token atau PIN yang dikirim valid
 * @param {string} tokenOrPin
 * @returns {boolean}
 */
export function validateToken(tokenOrPin) {
  if (!tokenOrPin) return false;

  const clean = String(tokenOrPin).trim();

  // Validasi jika token sesi aktif
  if (activeSessions.has(clean)) {
    return true;
  }

  // Validasi jika pengirim langsung melampirkan PIN yang benar
  if (clean === String(APP_PIN).trim()) {
    return true;
  }

  return false;
}

/**
 * Hapus sesi login ketika pengguna memilih logout / kunci
 * @param {string} token
 */
export function invalidateToken(token) {
  if (token) {
    activeSessions.delete(String(token).trim());
  }
}
