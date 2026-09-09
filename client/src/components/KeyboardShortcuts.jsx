import { useEffect } from 'react';

export default function KeyboardShortcuts({ onNewSession, onOpenPOS, onOpenBookings, onRefresh }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (onNewSession) onNewSession();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (onOpenPOS) onOpenPOS();
      } else if (e.key === 'F3') {
        e.preventDefault();
        const searchInput = document.querySelector('.global-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (onOpenBookings) onOpenBookings();
      } else if (e.key === 'F5') {
        // Allow default or custom refresh
        if (onRefresh) {
          e.preventDefault();
          onRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewSession, onOpenPOS, onOpenBookings, onRefresh]);

  return null;
}
