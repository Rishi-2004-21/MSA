const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const routes = require('./src/routes');
const { startFollowUpScheduler } = require('./src/services/followUpScheduler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend build files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// API Routes
app.use('/api', routes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MSA Agent — Ushnik Technologies',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai: process.env.OPENAI_API_KEY ? 'enabled' : 'mock-mode',
  });
});

// Serve React frontend for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 MSA Agent running on http://localhost:${PORT}`);
  console.log(`   AI: ${process.env.OPENAI_API_KEY ? '✅ GPT-4o Enabled' : '⚠️  Mock Mode (no OPENAI_API_KEY)'}`);
  console.log(`   Email: ${process.env.SMTP_HOST ? `✅ ${process.env.SMTP_HOST}` : '⚠️  Mock Mode'}`);
  startFollowUpScheduler();
});
