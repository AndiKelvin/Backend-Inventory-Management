import os from 'node:os';
import { buildApp } from './app.js';
import { PORT, HOST } from './config.js';

/**
 * Mendapatkan IP LAN lokal dari antarmuka jaringan
 */
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    const localIp = getLocalIp();

    console.log('\x1b[36m========================================================\x1b[0m');
    console.log('\x1b[32m TechStock Fastify Server BERJALAN (Modern Web Framework)\x1b[0m');
    console.log(`\x1b[32m Local  : http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[33m Network: http://${localIp}:${PORT} (akses dari perangkat lain)\x1b[0m`);
    console.log(`\x1b[35m API Base: http://localhost:${PORT}/api/stock\x1b[0m`);
    console.log('\x1b[36m========================================================\x1b[0m');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful Shutdown
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nMenerima ${signal}, menutup server Fastify secara aman...`);
    await app.close();
    process.exit(0);
  });
});

start();
