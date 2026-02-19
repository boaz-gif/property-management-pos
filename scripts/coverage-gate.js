#!/usr/bin/env node
/**
 * Coverage Gate Script
 *
 * Reads `git diff --name-only` (or a manifest) to find touched source files,
 * then maps them to Jest coverage-final.json entries and fails if any touched
 * file has less than 100% statement/branch/function/line coverage.
 *
 * Usage:
 *   node scripts/coverage-gate.js [--coverage-dir <path>] [--base-ref <git-ref>]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);

function getArg(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const coverageDir = getArg('--coverage-dir', path.resolve('coverage'));
const baseRef = getArg('--base-ref', 'HEAD~1');
const strict = !args.includes('--warn-only');

// -------------------------------------------------------------------------
// 1. Find touched files via git diff
// -------------------------------------------------------------------------
function getTouchedFiles() {
  try {
    const output = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf-8' });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .filter((f) => /\.(js|jsx|ts|tsx)$/.test(f))
      .filter((f) => !f.includes('__tests__') && !f.includes('.test.') && !f.includes('.spec.'));
  } catch (err) {
    console.warn('Could not get git diff, falling back to empty list:', err.message);
    return [];
  }
}

// -------------------------------------------------------------------------
// 2. Load coverage data
// -------------------------------------------------------------------------
function loadCoverage() {
  const coverageFile = path.join(coverageDir, 'coverage-final.json');
  if (!fs.existsSync(coverageFile)) {
    console.error(`Coverage file not found: ${coverageFile}`);
    console.error('Run tests with --coverage first.');
    process.exit(strict ? 1 : 0);
  }
  return JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
}

// -------------------------------------------------------------------------
// 3. Check coverage for each touched file
// -------------------------------------------------------------------------
function checkCoverage(touchedFiles, coverage) {
  const failures = [];
  const cwd = process.cwd();

  for (const relFile of touchedFiles) {
    const absPath = path.resolve(cwd, relFile);

    // Find matching coverage entry (keys may be absolute or relative)
    let entry = coverage[absPath] || coverage[relFile];
    if (!entry) {
      // Try to find by suffix match
      const match = Object.keys(coverage).find(
        (k) => k.endsWith(relFile) || k.endsWith(relFile.replace(/\//g, '\\'))
      );
      if (match) entry = coverage[match];
    }

    if (!entry) {
      failures.push({
        file: relFile,
        reason: 'No coverage data found (file may not be imported in any test)',
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      });
      continue;
    }

    const metrics = {};
    for (const type of ['s', 'b', 'f']) {
      const map = entry[type] || {};
      const values = type === 'b'
        ? Object.values(map).flat()
        : Object.values(map);
      const total = values.length;
      const covered = values.filter((v) => v > 0).length;
      const pct = total === 0 ? 100 : (covered / total) * 100;
      metrics[type] = { total, covered, pct };
    }

    // Lines from statementMap
    const stmtMap = entry.statementMap || {};
    const stmtHits = entry.s || {};
    const lineSet = new Set();
    const coveredLines = new Set();
    for (const [key, loc] of Object.entries(stmtMap)) {
      for (let l = loc.start.line; l <= loc.end.line; l++) {
        lineSet.add(l);
        if (stmtHits[key] > 0) coveredLines.add(l);
      }
    }
    const linePct = lineSet.size === 0 ? 100 : (coveredLines.size / lineSet.size) * 100;

    if (metrics.s.pct < 100 || metrics.b.pct < 100 || metrics.f.pct < 100 || linePct < 100) {
      failures.push({
        file: relFile,
        reason: 'Below 100% coverage',
        statements: metrics.s.pct.toFixed(1),
        branches: metrics.b.pct.toFixed(1),
        functions: metrics.f.pct.toFixed(1),
        lines: linePct.toFixed(1),
      });
    }
  }

  return failures;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
function main() {
  console.log('📊 Coverage Gate – checking touched files...\n');

  const touchedFiles = getTouchedFiles();
  if (touchedFiles.length === 0) {
    console.log('No touched source files detected. Gate passes.\n');
    process.exit(0);
  }

  console.log(`Found ${touchedFiles.length} touched source file(s):\n`);
  touchedFiles.forEach((f) => console.log(`  • ${f}`));
  console.log('');

  const coverage = loadCoverage();
  const failures = checkCoverage(touchedFiles, coverage);

  if (failures.length === 0) {
    console.log('✅ All touched files have 100% coverage. Gate passes.\n');
    process.exit(0);
  }

  console.log(`\n❌ ${failures.length} file(s) below 100% coverage:\n`);
  for (const f of failures) {
    console.log(`  ${f.file}`);
    console.log(`    Stmts: ${f.statements}%  Branches: ${f.branches}%  Funcs: ${f.functions}%  Lines: ${f.lines}%`);
    if (f.reason !== 'Below 100% coverage') console.log(`    Reason: ${f.reason}`);
  }
  console.log('');

  process.exit(strict ? 1 : 0);
}

main();
