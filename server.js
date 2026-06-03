const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Estado compartido del shader ──────────────────────────────────
const DEFAULT_STATE = {
  speed: 0.3,
  scale: 2.0,
  octaves: 4,
  distortion: 0.5,
  warpSpeed: 0.5,
  contrast: 1.0,
  brightness: 0.5,
  saturation: 1.0,
  rotation: 0.0,
  blobAmount: 0.0,
  lineAmount: 0.0,
  color1: '#ff0055',
  color2: '#00ff88',
  color3: '#4466ff'
};

let state = { ...DEFAULT_STATE };

// ── Socket.IO ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`✦ Cliente conectado: ${socket.id}`);

  // Enviar estado actual al recién llegado
  socket.emit('init', state);

  // Recibir actualización de parámetros
  socket.on('update', (data) => {
    Object.assign(state, data);
    // Broadcast a TODOS los demás clientes (no al que envió)
    socket.broadcast.emit('state', state);
  });

  // Solicitar estado manualmente
  socket.on('getState', () => {
    socket.emit('state', state);
  });

  // Resetear a valores por defecto
  socket.on('reset', () => {
    state = { ...DEFAULT_STATE };
    io.emit('state', state);
  });

  socket.on('disconnect', () => {
    console.log(`✧ Cliente desconectado: ${socket.id}`);
  });
});

// ── Utilidad: IP local ───────────────────────────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ── Arranque ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3541;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     ◆  VISUAL SYNTH SHADER v1.0  ◆      ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  🎛  Control:  http://localhost:${PORT}     ║`);
  console.log(`  ║  🖥  Visual:   http://${ip}:${PORT}/visual.html  ║`);
  console.log(`  ║  🖥  Local:    http://localhost:${PORT}/visual.html  ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
