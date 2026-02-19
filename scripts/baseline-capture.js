#!/usr/bin/env node
/**
 * Baseline Capture Script
 *
 * Captures a structured baseline report for the Performance Audit effort.
 * Outputs results to stdout (JSON) and optionally to a file.
 *
 * What it captures:
 *   - Frontend: build stats (bundle size), console warning count
 *   - Backend: route listing, response-time estimates (if server running)
 *
 * Usage:
 *   node scripts/baseline-capture.js [--output <file.json>] [--backend-url <url>]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);

function getArg(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const outputFile = getArg('--output', null);
const backendUrl = getArg('--backend-url', 'http://127.0.0.1:5002');

const report = {
  timestamp: new Date().toISOString(),
  frontend: {},
  backend: {},
};

// -------------------------------------------------------------------------
// Frontend: Bundle size analysis
// -------------------------------------------------------------------------
function captureBundleSize() {
  const buildDir = path.resolve(__dirname, '..', 'build');
  if (!fs.existsSync(buildDir)) {
    console.log('ℹ️  No build directory found. Run "npm run build" first for bundle analysis.');
    report.frontend.bundleSize = { status: 'no_build_directory' };
    return;
  }

  const staticDir = path.join(buildDir, 'static');
  if (!fs.existsSync(staticDir)) {
    report.frontend.bundleSize = { status: 'no_static_directory' };
    return;
  }

  const sizes = { js: 0, css: 0, total: 0, files: [] };

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else {
        const stats = fs.statSync(full);
        const ext = path.extname(entry.name).toLowerCase();
        sizes.total += stats.size;
        if (ext === '.js') sizes.js += stats.size;
        if (ext === '.css') sizes.css += stats.size;
        sizes.files.push({
          name: path.relative(buildDir, full),
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024),
        });
      }
    }
  }

  walkDir(staticDir);
  sizes.totalKB = Math.round(sizes.total / 1024);
  sizes.jsKB = Math.round(sizes.js / 1024);
  sizes.cssKB = Math.round(sizes.css / 1024);
  // Sort by size descending
  sizes.files.sort((a, b) => b.size - a.size);
  sizes.files = sizes.files.slice(0, 20); // Top 20

  report.frontend.bundleSize = sizes;
  console.log(`📦 Bundle: ${sizes.totalKB} KB total (JS: ${sizes.jsKB} KB, CSS: ${sizes.cssKB} KB)`);
}

// -------------------------------------------------------------------------
// Frontend: Console warning count from test run
// -------------------------------------------------------------------------
function captureConsoleWarnings() {
  try {
    const output = execSync('npx react-scripts test --watchAll=false --ci 2>&1', {
      encoding: 'utf-8',
      timeout: 120000,
      cwd: path.resolve(__dirname, '..'),
    });
    const warningCount = (output.match(/console\.warn/g) || []).length;
    const errorCount = (output.match(/console\.error/g) || []).length;
    report.frontend.consoleWarnings = { warnings: warningCount, errors: errorCount };
    console.log(`⚠️  Console: ${warningCount} warnings, ${errorCount} errors in tests`);
  } catch (err) {
    report.frontend.consoleWarnings = { status: 'test_run_failed', message: err.message?.slice(0, 200) };
    console.log('⚠️  Could not capture console warnings (test run failed)');
  }
}

// -------------------------------------------------------------------------
// Backend: Health check + monitoring data
// -------------------------------------------------------------------------
async function captureBackendBaseline() {
  try {
    const http = require('http');

    const fetch = (url) => new Promise((resolve, reject) => {
      http.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      }).on('error', reject);
    });

    // Health check
    const health = await fetch(`${backendUrl}/health`);
    report.backend.health = health;
    console.log(`🏥 Backend health: ${health.success ? 'OK' : 'UNHEALTHY'}`);

  } catch (err) {
    report.backend.health = { status: 'unreachable', message: err.message };
    console.log('🏥 Backend not reachable (start the server for backend baseline)');
  }
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
async function main() {
  console.log('📊 Baseline Capture – Performance Audit\n');
  console.log(`Timestamp: ${report.timestamp}\n`);

  captureBundleSize();
  captureConsoleWarnings();
  await captureBackendBaseline();

  console.log('\n--- Baseline Report ---\n');
  const json = JSON.stringify(report, null, 2);
  console.log(json);

  if (outputFile) {
    fs.writeFileSync(outputFile, json);
    console.log(`\n📁 Report saved to: ${outputFile}`);
  }
}

main().catch((err) => {
  console.error('Baseline capture failed:', err);
  process.exit(1);
});
