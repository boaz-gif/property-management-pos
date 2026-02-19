import React from 'react';
import { render, screen } from '@testing-library/react';
import PerfProfiler, { getProfilerLog, clearProfilerLog } from '../components/PerfProfiler';

// Mock featureFlags
let mockFlagValue = false;
jest.mock('../utils/featureFlags', () => ({
  getFlag: (name) => {
    if (name === 'PERF_PROFILER') return mockFlagValue;
    return false;
  },
}));

describe('PerfProfiler', () => {
  beforeEach(() => {
    mockFlagValue = false;
    clearProfilerLog();
  });

  it('renders children when flag is disabled', () => {
    mockFlagValue = false;
    render(
      <PerfProfiler id="test">
        <div data-testid="child">Hello</div>
      </PerfProfiler>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders children when flag is enabled', () => {
    mockFlagValue = true;
    render(
      <PerfProfiler id="test">
        <div data-testid="child">Hello</div>
      </PerfProfiler>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('logs profiler data when flag is enabled', () => {
    mockFlagValue = true;
    render(
      <PerfProfiler id="test-component">
        <div>Content</div>
      </PerfProfiler>
    );

    const log = getProfilerLog();
    // React Profiler should have logged at least one "mount" entry
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].id).toBe('test-component');
    expect(log[0].phase).toBeDefined();
    expect(typeof log[0].actualDuration).toBe('number');
    expect(typeof log[0].renderCount).toBe('number');
  });

  it('does not log profiler data when flag is disabled', () => {
    mockFlagValue = false;
    render(
      <PerfProfiler id="test-component">
        <div>Content</div>
      </PerfProfiler>
    );

    const log = getProfilerLog();
    expect(log).toHaveLength(0);
  });

  it('clearProfilerLog empties the log', () => {
    window.__PERF_PROFILER_LOG__ = [{ id: 'x', phase: 'mount' }];
    clearProfilerLog();
    expect(getProfilerLog()).toHaveLength(0);
  });
});
