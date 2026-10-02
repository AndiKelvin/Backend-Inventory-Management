import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const HOST = process.env.HOST || '0.0.0.0';
export const APP_PIN = process.env.APP_PIN || '123451';

export const DATA_PATH = path.resolve(__dirname, '..', 'data', 'stock_inventory.json');
export const MOVEMENTS_PATH = path.resolve(__dirname, '..', 'data', 'stock_movements.json');
export const SALES_PATH = path.resolve(__dirname, '..', 'data', 'sales.json');
import fs from 'node:fs';

const candidate1 = path.resolve(__dirname, '..', '..', 'Frontend-Inventory-Management', 'dist');
const candidate2 = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
export const FRONTEND_DIST_PATH = fs.existsSync(candidate1) ? candidate1 : candidate2;
