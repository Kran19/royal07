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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="balance-card">
          <span>Wallet</span>
          <strong>₹{typeof balance === 'number' ? balance.toLocaleString() : balance}</strong>
        </div>
        
        {onWalletOpen && (
          <button
            type="button"
            onClick={onWalletOpen}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.8rem',
              padding: '0.5rem 1rem',
              letterSpacing: '0.05em',
            }}
          >
            💳 Wallet
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Sign Out"
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '12px',
              color: '#fb7185',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.8rem',
              padding: '0.5rem 0.75rem',
            }}
          >
            🚪
          </button>
        )}
      </div>
    </header>
  )
}

export default TopBar
