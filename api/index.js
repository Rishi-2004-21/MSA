const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const serverless = require('serverless-http');

dotenv.config({ path: path.join(__dirname, '../MSA/.env') });

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Import routes
const routes = require('../MSA/src/routes');

// API Routes - Vercel strips /api prefix when routing to serverless function
app.use(routes);

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MSA Agent — Ushnik Technologies',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai: process.env.OPENAI_API_KEY ? 'enabled' : 'mock-mode',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = serverless(app);
