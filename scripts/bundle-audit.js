const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
const THRESHOLDS = {
  'main.bundle': 400 * 1024,      // 400KB - the core framework + shared services
  'feature.chunk': 50 * 1024,     // 50KB - max per feature module
  'total.js': 1024 * 1024,        // 1MB - total JS budget (uncompressed)
};

const BUILD_DIR = path.join(__dirname, '..', 'build', 'static', 'js');

// ---------------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------------

function formatSize(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function checkBudgets() {
  console.log('\n🚀 Performance Budget Audit\n' + '='.repeat(30));

  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const files = fs.readdirSync(BUILD_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  
  let totalJsSize = 0;
  let failures = 0;

  files.forEach(file => {
    const stats = fs.statSync(path.join(BUILD_DIR, file));
    totalJsSize += stats.size;

    // Check Main Bundle
    if (file.startsWith('main.')) {
      console.log(`\n📦 Main Bundle: ${file}`);
      if (stats.size > THRESHOLDS['main.bundle']) {
        console.error(`  ❌ FAIL: ${formatSize(stats.size)} exceeds budget of ${formatSize(THRESHOLDS['main.bundle'])}`);
        failures++;
      } else {
        console.log(`  ✅ PASS: ${formatSize(stats.size)}`);
      }
    } 
    // Check Feature Chunks (numeric hashes or feature names if named)
    else if (file.includes('chunk')) {
      if (stats.size > THRESHOLDS['feature.chunk']) {
        console.error(`  ⚠️  WARNING: Chunk ${file} (${formatSize(stats.size)}) exceeds feature budget of ${formatSize(THRESHOLDS['feature.chunk'])}`);
        // We warn for now, don't fail as CRA chunking is unpredictable
      }
    }
  });

  console.log(`\n📊 Total JS Payload: ${formatSize(totalJsSize)}`);
  if (totalJsSize > THRESHOLDS['total.js']) {
    console.error(`❌ FAIL: Total JS size exceeds budget of ${formatSize(THRESHOLDS['total.js'])}`);
    failures++;
  } else {
    console.log(`✅ PASS: Within total budget`);
  }

  console.log('\n' + '='.repeat(30));
  if (failures > 0) {
    console.error(`❌ Audit failed with ${failures} budget violation(s).`);
    process.exit(1);
  } else {
    console.log('✨ All critical budgets passed!');
    process.exit(0);
  }
}

checkBudgets();
