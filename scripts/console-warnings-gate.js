#!/usr/bin/env node
/**
 * Console Warnings Gate for CI
 *
 * Jest setup helper that intercepts console.warn and console.error,
 * and fails the test suite if unexpected warnings are emitted.
 *
 * Usage:
 *   1. Import this file in your Jest setupFilesAfterSetup.
 *   2. Any unexpected console.warn/error will cause the test to fail.
 *   3. Add patterns to ALLOWLIST to suppress known, non-fixable warnings.
 */

// Patterns that are known and non-fixable (regex or string)
const ALLOWLIST = [
  // React 19 internal warnings during testing
  /act\(\.\.\.\)/,
  /ReactDOM\.render/,
  /inside a test was not wrapped in act/,
  // React Query internal debug logging
  /No QueryClient set/,
  // Known third-party warnings
  /Warning: componentWillReceiveProps/,
  /Warning: componentWillMount/,
];

function isAllowlisted(message) {
  return ALLOWLIST.some((pattern) => {
    if (typeof pattern === 'string') return message.includes(pattern);
    if (pattern instanceof RegExp) return pattern.test(message);
    return false;
  });
}

/**
 * Install the console gate.
 * Call this in your Jest setup file.
 */
function installConsoleGate() {
  const originalWarn = console.warn;
  const originalError = console.error;
  const violations = [];

  beforeEach(() => {
    violations.length = 0;

    console.warn = (...args) => {
      const message = args.map(String).join(' ');
      if (!isAllowlisted(message)) {
        violations.push({ level: 'warn', message });
      }
      // Still call original so debugging is possible
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(String).join(' ');
      if (!isAllowlisted(message)) {
        violations.push({ level: 'error', message });
      }
      originalError.apply(console, args);
    };
  });

  afterEach(() => {
    // Restore
    console.warn = originalWarn;
    console.error = originalError;

    if (violations.length > 0) {
      const summary = violations
        .map((v, i) => `  ${i + 1}. [${v.level}] ${v.message.slice(0, 200)}`)
        .join('\n');
      // Use expect to fail with a clear message
      expect(violations).toHaveLength(0);
      // Fallback – throw if expect doesn't fail
      throw new Error(`Console warnings gate: ${violations.length} violation(s):\n${summary}`);
    }
  });
}

module.exports = { installConsoleGate, isAllowlisted, ALLOWLIST };
