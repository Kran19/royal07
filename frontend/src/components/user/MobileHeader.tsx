import React from 'react';

interface MobileHeaderProps {
  balance: number;
  onWalletClick: () => void;
  onMenuClick?: () => void;
}

import { formatCurrency } from '@/lib/utils/currency';
import { useAuth } from '@/context/AuthContext';

export function MobileHeader({ balance, onWalletClick, onMenuClick }: MobileHeaderProps) {
  const { user } = useAuth();
  
  return (
    <div className="mobile-mock-top">
      {/* Header containing Logo on the left, Balance & Menu on the right */}
      <header className="mobile-mock-header">
        {/* Logo */}
        <span className="font-display font-black text-lg tracking-tighter text-white select-none">
          ROYAL<span className="text-[#facc15]">07</span>
        </span>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button 
            className={`mobile-mock-balance-btn ${!user?.operatorId ? 'cursor-pointer' : 'cursor-default'}`} 
            onClick={user?.operatorId ? undefined : onWalletClick}
          >
            <span className="balance-value">{formatCurrency(Number(balance), user?.currency || 'INR', true)}</span>
            {!user?.operatorId && (
              <div className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-black">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            )}
          </button>
          
          {/* Menu Icon */}
          <button className="mobile-menu-btn" onClick={onMenuClick}>
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
