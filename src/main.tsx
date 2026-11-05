import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA solo en la web (no en Android nativo ni en Electron)
const isWeb = location.protocol === 'https:' && !(window as any).Capacitor?.isNativePlatform?.();
if (isWeb && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
