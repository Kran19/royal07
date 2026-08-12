import React from 'react';

interface MobileHeaderProps {
  balance: number;
  onWalletClick: () => void;
}

export function MobileHeader({ balance, onWalletClick }: MobileHeaderProps) {
  return (
    <div className="mobile-mock-top">
      {/* Header containing Logo on the left, Balance & Menu on the right */}
      <header className="mobile-mock-header">
        {/* Logo */}
        <span className="font-display font-black text-lg tracking-tighter text-white select-none">
          ROYAL<span className="text-[#facc15]">07</span>
        </span>

        <div className="flex items-center gap-2.5">
          {/* Aviator-style compact green balance button */}
          <button className="mobile-mock-balance-btn" onClick={onWalletClick}>
            <span className="balance-value">₹ {Number(balance).toFixed(2)}</span>
          </button>
          
          {/* Menu Icon */}
          <button className="mobile-menu-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>
    </div>
  );
}
