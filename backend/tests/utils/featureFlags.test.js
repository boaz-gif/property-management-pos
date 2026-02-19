const { getFlag, getAllFlags, FLAG_REGISTRY } = require('../../src/utils/featureFlags');

describe('featureFlags (backend)', () => {
  beforeEach(() => {
    // Clear all FF env vars
    Object.keys(FLAG_REGISTRY).forEach((name) => {
      delete process.env[`FF_${name}`];
    });
  });

  describe('getFlag', () => {
    it('returns registry default when no env var set', () => {
      expect(getFlag('PERF_SPAN_TRACKING')).toBe(false);
    });

    it('returns caller default for unknown flags', () => {
      expect(getFlag('UNKNOWN_FLAG', true)).toBe(true);
      expect(getFlag('UNKNOWN_FLAG')).toBe(false);
    });

    it('reads from env var', () => {
      process.env.FF_PERF_SPAN_TRACKING = 'true';
      expect(getFlag('PERF_SPAN_TRACKING')).toBe(true);
    });

    it('env var "1" resolves to true', () => {
      process.env.FF_PERF_SPAN_TRACKING = '1';
      expect(getFlag('PERF_SPAN_TRACKING')).toBe(true);
    });

    it('env var "0" resolves to false', () => {
      process.env.FF_PERF_SPAN_TRACKING = '0';
      expect(getFlag('PERF_SPAN_TRACKING')).toBe(false);
    });

    it('handles non-boolean env values gracefully', () => {
      process.env.FF_PERF_SPAN_TRACKING = 'maybe';
      expect(getFlag('PERF_SPAN_TRACKING')).toBe(false);
    });
  });

  describe('getAllFlags', () => {
    it('returns all registry flags with defaults', () => {
      const flags = getAllFlags();
      expect(flags.PERF_SPAN_TRACKING).toEqual({ value: false, source: 'default' });
      expect(flags.REQUEST_BATCHING).toEqual({ value: false, source: 'default' });
    });

    it('reflects env source', () => {
      process.env.FF_PERF_SPAN_TRACKING = 'true';
      const flags = getAllFlags();
      expect(flags.PERF_SPAN_TRACKING).toEqual({ value: true, source: 'env' });
    });
  });
});
