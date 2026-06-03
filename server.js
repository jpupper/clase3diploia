const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Directorio de presets ─────────────────────────────────────────
const PRESETS_DIR = path.join(__dirname, 'presets');
if (!fs.existsSync(PRESETS_DIR)) {
  fs.mkdirSync(PRESETS_DIR, { recursive: true });
}

// ── API: Presets ──────────────────────────────────────────────────
app.get('/api/presets', (req, res) => {
  try {
    const files = fs.readdirSync(PRESETS_DIR).filter(f => f.endsWith('.json'));
    const presets = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(PRESETS_DIR, f), 'utf-8'));
      return { name: data.name || f.replace('.json', ''), ...data, _file: f };
    });
    // Ordenar por fecha de modificación (más reciente primero)
    presets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json(presets);
  } catch (err) {
    console.error('Error listing presets:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/presets', (req, res) => {
  try {
    const { name, params } = req.body;
    if (!name || !params) {
      return res.status(400).json({ error: 'name and params required' });
    }
    const sanitized = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'unnamed';
    const filename = sanitized + '.json';
    const filepath = path.join(PRESETS_DIR, filename);
    const data = { name: sanitized, params, updatedAt: Date.now() };
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Preset guardado: ${sanitized}`);
    res.json({ success: true, name: sanitized, filename });
  } catch (err) {
    console.error('Error saving preset:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/presets/:name', (req, res) => {
  try {
    const filename = req.params.name.endsWith('.json') ? req.params.name : req.params.name + '.json';
    const filepath = path.join(PRESETS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/presets/:name', (req, res) => {
  try {
    const filename = req.params.name.endsWith('.json') ? req.params.name : req.params.name + '.json';
    const filepath = path.join(PRESETS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    fs.unlinkSync(filepath);
    console.log(`🗑 Preset eliminado: ${req.params.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
