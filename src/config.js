import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const HOST = process.env.HOST || '0.0.0.0';

export const DATA_PATH = path.resolve(__dirname, '..', 'data', 'stock_inventory.json');
export const FRONTEND_DIST_PATH = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
