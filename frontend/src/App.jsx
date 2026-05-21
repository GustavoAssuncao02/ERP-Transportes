import { lazy, Suspense, useEffect } from 'react';
import { PageLoadingFallback } from './components/LoadingStates.jsx';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));

export default function App() {
  useEffect(() => {
    function isFocusable(element) {
      if (!element || element.disabled) return false;
      if (element.getAttribute('tabindex') === '-1') return false;
      if (element.getAttribute('aria-hidden') === 'true') return false;

      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    }

    function focusSiblingField(currentElement, direction) {
      const focusableElements = [...document.querySelectorAll([
        'a[href]',
        'button',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])',
      ].join(','))].filter(isFocusable);
      const currentIndex = focusableElements.indexOf(currentElement);
      const nextElement = focusableElements[currentIndex + direction];

      if (nextElement) {
        nextElement.focus();
      } else {
        currentElement.blur();
      }
    }

    function handleDateTabNavigation(event) {
      const activeElement = document.activeElement;
      if (event.key !== 'Tab' || activeElement?.type !== 'date') return;

      event.preventDefault();
      focusSiblingField(activeElement, event.shiftKey ? -1 : 1);
    }

    document.addEventListener('keydown', handleDateTabNavigation, true);
    return () => document.removeEventListener('keydown', handleDateTabNavigation, true);
  }, []);

  const path = window.location.pathname;

  return (
    <Suspense fallback={<PageLoadingFallback message="Carregando sistema..." />}>
      {path === '/login' ? <LoginPage /> : <DashboardPage />}
    </Suspense>
  );
}
