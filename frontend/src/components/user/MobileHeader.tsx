import React from 'react';

interface MobileHeaderProps {
  timer: number;
  balance: number;
  onWalletClick: () => void;
}

export function MobileHeader({ timer, balance, onWalletClick }: MobileHeaderProps) {
  return (
    <div className="mobile-mock-top">
      {/* Header */}
      <header className="mobile-mock-header">
        <button className="mobile-menu-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div className="mobile-mock-pill">
          <span className="pill-text">PLACE YOUR BETS</span>
          <div className="mock-timer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{timer < 10 ? `00:0${timer}` : `00:${timer}`}</span>
          </div>
        </div>

        <div className="mobile-mock-live">
          <div className="live-dot" /> LIVE
        </div>
      </header>

      {/* Wallet Card */}
      <div className="mobile-mock-wallet" onClick={onWalletClick}>
        <div className="wallet-left">
          <div className="wallet-icon-bg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 4.02 2 6.5s4.48 4.5 10 4.5 10-2.02 10-4.5S17.52 2 12 2zm0 14.5c-5.52 0-10-2.02-10-4.5v3c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-3c0 2.48-4.48 4.5-10 4.5zM2 11.5v3c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-3c0 2.48-4.48 4.5-10 4.5S2 13.98 2 11.5z" />
            </svg>
          </div>
          <div className="wallet-balance-text">
            <span className="wb-label">BALANCE</span>
            <span className="wb-amount">{Number(balance).toFixed(2)}</span>
          </div>
        </div>
        <div className="wallet-right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>WALLET ›</span>
        </div>
      </div>
    </div>
  );
}
