import { isPerfDiagnosticsEnabled } from './services/requestTrace';
import { getActionSummary } from './utils/perfMarkers';

const reportWebVitals = (onPerfEntry) => {
  if (!isPerfDiagnosticsEnabled()) return;
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const sink = (metric) => {
        try {
          window.__PERF_WEB_VITALS__ = window.__PERF_WEB_VITALS__ || [];
          window.__PERF_WEB_VITALS__.push(metric);
          // Keep action summary in sync for baseline scripts
          window.__PERF_ACTION_SUMMARY__ = getActionSummary();
        } catch {
        }
        onPerfEntry(metric);
      };

      getCLS(sink);
      getFID(sink);
      getFCP(sink);
      getLCP(sink);
      getTTFB(sink);
    }).catch(err => console.error('reportWebVitals: import failed', err));
  }
};

export default reportWebVitals;
