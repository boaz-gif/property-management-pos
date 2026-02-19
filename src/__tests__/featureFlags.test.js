import {
  getFlag,
  setFlagOverride,
  clearFlagOverride,
  getAllFlags,
  FLAG_REGISTRY,
} from '../utils/featureFlags';

describe('featureFlags (frontend)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear all FF env vars
    Object.keys(FLAG_REGISTRY).forEach((name) => {
      delete process.env[`REACT_APP_FF_${name}`];
    });
  });

  describe('getFlag', () => {
    it('returns registry default when no env or localStorage', () => {
      expect(getFlag('PERF_PROFILER')).toBe(false);
    });

    it('returns caller default when flag is not in registry', () => {
      expect(getFlag('UNKNOWN_FLAG', true)).toBe(true);
      expect(getFlag('UNKNOWN_FLAG')).toBe(false);
    });

    it('reads from env var (build-time)', () => {
      process.env.REACT_APP_FF_PERF_PROFILER = 'true';
      expect(getFlag('PERF_PROFILER')).toBe(true);
    });

    it('env var "0" resolves to false', () => {
      process.env.REACT_APP_FF_PERF_PROFILER = '0';
      expect(getFlag('PERF_PROFILER')).toBe(false);
    });

    it('localStorage overrides env var', () => {
      process.env.REACT_APP_FF_PERF_PROFILER = 'false';
      localStorage.setItem('ff_PERF_PROFILER', 'true');
      expect(getFlag('PERF_PROFILER')).toBe(true);
    });

    it('handles non-boolean env values gracefully', () => {
      process.env.REACT_APP_FF_PERF_PROFILER = 'maybe';
      // 'maybe' is not a valid bool → falls through to registry default
      expect(getFlag('PERF_PROFILER')).toBe(false);
    });
  });

  describe('setFlagOverride / clearFlagOverride', () => {
    it('sets and clears localStorage override', () => {
      setFlagOverride('PERF_PROFILER', true);
      expect(getFlag('PERF_PROFILER')).toBe(true);

      clearFlagOverride('PERF_PROFILER');
      expect(getFlag('PERF_PROFILER')).toBe(false);
    });

    it('coerces value to boolean string', () => {
      setFlagOverride('PERF_PROFILER', 1);
      expect(localStorage.getItem('ff_PERF_PROFILER')).toBe('true');

      setFlagOverride('PERF_PROFILER', 0);
      expect(localStorage.getItem('ff_PERF_PROFILER')).toBe('false');
    });
  });

  describe('getAllFlags', () => {
    it('returns all registry flags with defaults', () => {
      const flags = getAllFlags();
      expect(flags.PERF_PROFILER).toEqual({ value: false, source: 'default' });
    });

    it('reflects env source', () => {
      process.env.REACT_APP_FF_PERF_PROFILER = 'true';
      const flags = getAllFlags();
      expect(flags.PERF_PROFILER).toEqual({ value: true, source: 'env' });
    });

    it('reflects localStorage source', () => {
      localStorage.setItem('ff_PERF_PROFILER', 'true');
      const flags = getAllFlags();
      expect(flags.PERF_PROFILER).toEqual({ value: true, source: 'localStorage' });
    });

    it('localStorage takes precedence over env in snapshot', () => {
      process.env.REACT_APP_FF_PERF_PROFILER = 'false';
      localStorage.setItem('ff_PERF_PROFILER', 'true');
      const flags = getAllFlags();
      expect(flags.PERF_PROFILER).toEqual({ value: true, source: 'localStorage' });
    });
  });
});
