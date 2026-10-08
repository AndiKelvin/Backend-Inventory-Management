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

function displayServerBanner(port, localIp) {
  const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    brightCyan: '\x1b[96m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    magenta: '\x1b[95m',
    gray: '\x1b[90m',
    white: '\x1b[97m',
  };

  const WIDTH = 56;
  const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

  const row = (content) => {
    const visibleLength = stripAnsi(content).length;
    const padding = Math.max(0, WIDTH - visibleLength);
    return `${c.cyan}│${c.reset}  ${content}${' '.repeat(padding)}  ${c.cyan}│${c.reset}`;
  };

  const hr = (left, middle, right) =>
    `${c.cyan}${left}${'─'.repeat(WIDTH + 4)}${right}${c.reset}`;

  console.log('\n' + hr('╭', '─', '╮'));
  console.log(row(`${c.bold}${c.brightCyan}TECHSTOCK INVENTORY SYSTEM${c.reset} ${c.gray}• Backend${c.reset}`));
  console.log(row(`${c.green}●${c.reset} ${c.white}Status   :${c.reset} ${c.green}${c.bold}Online & Siap Melayani${c.reset}`));
  console.log(hr('├', '─', '┤'));
  console.log(row(`${c.yellow}➜${c.reset}  ${c.gray}Local   :${c.reset} ${c.white}${c.bold}http://localhost:${port}${c.reset}`));
  console.log(row(`${c.yellow}➜${c.reset}  ${c.gray}Network :${c.reset} ${c.white}http://${localIp}:${port}${c.reset}`));
  console.log(row(`${c.yellow}➜${c.reset}  ${c.gray}API Base:${c.reset} ${c.magenta}http://localhost:${port}/api/stock${c.reset}`));
  console.log(hr('├', '─', '┤'));
  console.log(row(`${c.gray}Log Mode :${c.reset} ${c.brightCyan}Quiet Mode${c.reset} ${c.gray}(Hanya mencatat jika ada error)${c.reset}`));
  console.log(row(`${c.gray}Tekan ${c.white}Ctrl + C${c.gray} untuk menghentikan server${c.reset}`));
  console.log(hr('╰', '─', '╯') + '\n');
}

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    const localIp = getLocalIp();
    displayServerBanner(PORT, localIp);
  } catch (err) {
    console.error('\n\x1b[41m\x1b[97m FATAL ERROR \x1b[0m Gagal memulai server:', err.message);
    process.exit(1);
  }
}

// Graceful Shutdown
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n\x1b[90m[${new Date().toLocaleTimeString('id-ID')}]\x1b[0m \x1b[33mMenerima ${signal}, menutup server dengan aman...\x1b[0m`);
    await app.close();
    process.exit(0);
  });
});

start();
