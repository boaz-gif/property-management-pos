import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './services/service-worker-registration';
import { networkMonitor } from './services/service-worker-registration';

// Initialize network monitoring
networkMonitor.init();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Measure performance
reportWebVitals(console.log);

// Register service worker for production
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onUpdate: (registration) => {
      // Show update notification to user
      if (window.confirm('New version available! Reload to update?')) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    },
    onSuccess: (registration) => {
      console.log('Service Worker: Content cached for offline use');
    }
  });
}
