require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { generateAccessReport } = require('./github.js');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// Environment variables
const PORT = process.env.PORT || 3000;
const GITHUB_ORG = process.env.GITHUB_ORG;

// Cache storage (simple in-memory cache)
let cachedReport = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Helper: Check if cache is still valid
 */
function isCacheValid() {
  return cachedReport && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL);
}

/**
 * GET /api/report
 * Returns the organization access report with all repositories and user permissions
 * Uses in-memory cache with 5-minute TTL
 */
app.get('/api/report', async (req, res) => {
  try {
    let report;
    let cacheStatus = 'MISS';

    if (isCacheValid()) {
      report = cachedReport;
      cacheStatus = 'HIT';
    } else {
      report = await generateAccessReport(GITHUB_ORG);
      cachedReport = report;
      cacheTimestamp = Date.now();
    }

    res.set('X-Cache', cacheStatus);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cache/clear
 * Clears the in-memory cache and forces a fresh report generation on next request
 */
app.post('/api/cache/clear', (req, res) => {
  cachedReport = null;
  cacheTimestamp = null;
  res.status(200).json({ message: 'Cache cleared successfully' });
});

/**
 * GET /api/report/user/:username
 * Returns access details for a specific user (repositories and roles)
 */
app.get('/api/report/user/:username', async (req, res) => {
  try {
    const username = req.params.username;

    let report;
    if (isCacheValid()) {
      report = cachedReport;
    } else {
      report = await generateAccessReport(GITHUB_ORG);
      cachedReport = report;
      cacheTimestamp = Date.now();
    }

    if (report.userMap && report.userMap[username]) {
      res.status(200).json(report.userMap[username]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


