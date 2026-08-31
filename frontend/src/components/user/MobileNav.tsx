'use client';

function NavIcon({ type }: { type: string }) {
  if (type === 'game') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" />
        <path d="M9 9.5h6M12 6.5v6" />
        <circle cx="16.5" cy="15.5" r="1" />
        <circle cx="13.5" cy="15.5" r="1" />
      </svg>
    )
  }

  if (type === 'live') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 6.25a5.75 5.75 0 1 1 0 11.5a5.75 5.75 0 0 1 0-11.5Z" />
        <path d="M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" />
      </svg>
    )
  }

  if (type === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
        <circle cx="17" cy="12" r="1.5" fill="currentColor" strokeWidth="0" />
      </svg>
    )
  }

  if (type === 'logout') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5.75h10A1.25 1.25 0 0 1 18.25 7v10A1.25 1.25 0 0 1 17 18.25H7A1.25 1.25 0 0 1 5.75 17V7A1.25 1.25 0 0 1 7 5.75Z" />
      <path d="M8.75 9.25h6.5M8.75 12h6.5M8.75 14.75h4.25" />
    </svg>
  )
}

interface MobileNavProps {
  tab: string;
  setTab: (tab: string) => void;
  onLogout?: () => void;
}

import { useAuth } from '@/context/AuthContext';

function MobileNav({ tab, setTab }: MobileNavProps) {
  const { user } = useAuth();
  return (
    <nav className="mobile-nav">
      <button type="button" onClick={() => setTab('game')} className={tab === 'game' ? 'on nav-item' : 'nav-item'}>
        <span className="nav-icon"><NavIcon type="game" /></span>
        <span className="nav-label">Game</span>
      </button>
      <button type="button" onClick={() => setTab('live')} className={tab === 'live' ? 'on nav-item' : 'nav-item'}>
        <span className="nav-icon"><NavIcon type="live" /></span>
        <span className="nav-label">Live</span>
      </button>
      <button type="button" onClick={() => setTab('history')} className={tab === 'history' ? 'on nav-item' : 'nav-item'}>
        <span className="nav-icon"><NavIcon type="history" /></span>
        <span className="nav-label">History</span>
      </button>
      {(!user?.operatorId) && (
        <button type="button" onClick={() => setTab('wallet')} className={tab === 'wallet' ? 'on nav-item' : 'nav-item'}>
          <span className="nav-icon"><NavIcon type="wallet" /></span>
          <span className="nav-label">Wallet</span>
        </button>
      )}
    </nav>
  )
}

export default MobileNav
