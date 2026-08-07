'use client';

interface FeedItem {
  id?: string;
  user?: string;
  name?: string;
  floor?: string;
  amount?: number;
  round?: number;
  stops?: number[];
  mode?: string;
}

// Generates a deterministic color from a username string
function avatarColor(name: string = '') {
  const colors = [
    'linear-gradient(135deg, #4f46e5, #7c3aed)',
    'linear-gradient(135deg, #0ea5e9, #0284c7)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #d97706, #f59e0b)',
    'linear-gradient(135deg, #dc2626, #ef4444)',
    'linear-gradient(135deg, #9333ea, #a855f7)',
    'linear-gradient(135deg, #0891b2, #06b6d4)',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

interface FeedItemsProps {
  items: FeedItem[];
  type: 'live' | 'history';
}

function FeedItems({ items, type }: FeedItemsProps) {
  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '1rem 0', fontStyle: 'italic' }}>
        {type === 'live' ? 'Waiting for bets...' : 'No rounds yet'}
      </div>
    );
  }

  return (
    <>
      {items.map((item, idx) => {
        const displayName = item.user || item.name || '?';
        const initial = displayName[0]?.toUpperCase() || '?';

        return (
          <article key={item.id ?? `${idx}-${item.stops?.join('-')}`} className="feed-item">
            {type === 'live' ? (
              <>
                <div className="feed-avatar" style={{ background: avatarColor(displayName) }}>
                  {initial}
                </div>
                <div className="feed-info">
                  <div className="feed-user">{displayName}</div>
                  <div className="feed-detail">
                    Floor <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{item.floor}</span>
                  </div>
                </div>
                <span className="feed-amount">₹{(item.amount ?? 0).toLocaleString('en-IN')}</span>
              </>
            ) : (
              <>
                <span className="round-id">R{item.round}</span>
                <div className="floor-chips">
                  {(item.stops ?? []).slice(0, 4).map((f, i) => (
                    <span key={i} className="mini-chip">{f}</span>
                  ))}
                  {(item.stops ?? []).length === 0 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>—</span>
                  )}
                </div>
                <strong className={`status-label ${item.mode && item.mode !== 'No Bet' ? 'win' : ''}`}>
                  {item.mode}
                </strong>
              </>
            )}
          </article>
        );
      })}
    </>
  );
}

export function DesktopSidePanel({
  liveFeed,
  historyFeed,
}: {
  liveFeed: FeedItem[];
  historyFeed: FeedItem[];
}) {
  return (
    <section className="panel desktop-side">
      <div className="side-block">
        <h2>📡 Live Bets</h2>
        <div className="feed-list mini">
          <FeedItems items={liveFeed} type="live" />
        </div>
      </div>
      <div className="side-block">
        <h2>📋 Round History</h2>
        <div className="feed-list mini">
          <FeedItems items={historyFeed} type="history" />
        </div>
      </div>
    </section>
  );
}

export function MobileFeedPanel({
  title,
  items,
  type,
}: {
  title: string;
  items: FeedItem[];
  type: 'live' | 'history';
}) {
  return (
    <section className="panel mobile-feed">
      <h2>{title}</h2>
      <div className="feed-list">
        <FeedItems items={items} type={type} />
      </div>
    </section>
  );
}
