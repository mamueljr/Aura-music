import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/globals.css';
import '@/i18n';
import App from '@/app/App';

// Restore deep links redirected by public/404.html on GitHub Pages
// (`/?/library` → `/library`). Must run before the router mounts.
(function restoreSpaRedirect() {
  const l = window.location;
  if (l.search.startsWith('?/')) {
    const decoded = l.search
      .slice(2)
      .split('&')
      .map((s) => s.replace(/~and~/g, '&'))
      .join('?');
    window.history.replaceState(null, '', l.pathname + decoded + l.hash);
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
