const os = require('os');

// Bridge Unix HOME expectation with Windows USERPROFILE
process.env.HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();

module.exports = {
  // Minimal config to allow Playwright to initialize if it picks up this file
  testDir: './src/__tests__',
  use: {
    browserName: 'chromium',
  },
};
