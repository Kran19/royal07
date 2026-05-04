'use client';

interface TopBarProps {
  balance: number;
  onWalletOpen: () => void;
  onLogout?: () => void;
}

function TopBar({ balance, onWalletOpen, onLogout }: TopBarProps) {
  return (
    <header className="top-bar">
      <div>
        <p className="kicker">Elevator Royale</p>
        <h1>30s Round Lobby</h1>
      </div>
      <div className="top-actions">
        <div className="balance-card">
          <span>Wallet</span>
          <strong>₹{typeof balance === 'number' ? balance.toLocaleString() : balance}</strong>
        </div>
        
        {onWalletOpen && (
          <button
            type="button"
            className="top-wallet-btn"
            onClick={onWalletOpen}
          >
            💳 Wallet
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            className="top-logout-btn"
            onClick={onLogout}
            title="Sign Out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

export default TopBar
