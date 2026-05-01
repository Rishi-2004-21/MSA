const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const routes = require('./src/routes');
const { startFollowUpScheduler } = require('./src/services/followUpScheduler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the deployed frontend URL + localhost for dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  process.env.APP_URL,       // e.g. https://msa-xxxxx.onrender.com
  process.env.RENDER_URL,    // optional extra Render URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-side)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In production allow same-origin (Render serves frontend + API together)
    return callback(null, true); // permissive — tighten after go-live
  },
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Ensure data directory exists (Render ephemeral disk) ─────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('[Boot] Created data/ directory.');
}

// ── Serve uploaded files ──────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes (MUST come before static/SPA fallback) ────────────────────────
app.use('/api', routes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MSA Agent — Ushnik Technologies',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai: process.env.OPENAI_API_KEY ? 'enabled' : 'mock-mode',
    node: process.version,
  });
});

// ── Serve React Frontend build (production) ───────────────────────────────────
const possiblePaths = [
  path.join(__dirname, 'frontend', 'dist'),
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, 'dist'),
  path.join(process.cwd(), 'MSA', 'frontend', 'dist'),
];

let FRONTEND_DIST = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

if (fs.existsSync(FRONTEND_DIST)) {
  console.log(`[Boot] Serving frontend from: ${FRONTEND_DIST}`);
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    const frontendPath = path.join(__dirname, 'frontend');
    let frontendContents = [];
    try {
      if (fs.existsSync(frontendPath)) {
        frontendContents = fs.readdirSync(frontendPath);
      }
    } catch (e) {
      frontendContents = [`Error reading dir: ${e.message}`];
    }

    res.json({ 
      message: 'MSA API running. Frontend not built yet — run npm run build.',
      debug: {
        cwd: process.cwd(),
        __dirname,
        checkedPaths: possiblePaths,
        frontendFolderExists: fs.existsSync(frontendPath),
        frontendContents
      }
    });
  });
}



app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MSA Agent running on port ${PORT}`);
  console.log(`   AI: ${process.env.OPENAI_API_KEY ? '✅ GPT-4o Enabled' : '⚠️  Mock Mode (no OPENAI_API_KEY)'}`);
  console.log(`   Email: ${process.env.SMTP_HOST ? `✅ ${process.env.SMTP_HOST}` : '⚠️  Mock Mode'}`);
  console.log(`   Frontend: ${fs.existsSync(FRONTEND_DIST) ? '✅ Served' : '⚠️  Not built'}`);
  startFollowUpScheduler();
});

