'use client';

interface FeedItem {
  id?: string;
  name?: string;
  floor?: string;
  amount?: number;
  round?: number;
  stops?: number[];
  mode?: string;
}

interface FeedItemsProps {
  items: FeedItem[];
  type: 'live' | 'history';
}

function FeedItems({ items, type }: FeedItemsProps) {
  return (
    <>
      {items.map((item, idx) => (
        <article key={item.id ?? `${idx}-${item.stops?.join('-')}`} className="feed-item">
          {type === 'live' ? (
            <>
              <span className="user-label">{item.name}</span>
              <span className="floor-indicator">F{item.floor}</span>
              <strong className="amount-value">₹{item.amount}</strong>
            </>
          ) : (
            <>
              <span className="round-id">R{item.round}</span>
              <div className="floor-chips">
                {(item.stops ?? []).slice(0, 4).map((f, i) => (
                  <span key={i} className="mini-chip">{f}</span>
                ))}
              </div>
              <strong className={`status-label ${item.mode && item.mode !== 'No Bet' ? 'win' : ''}`}>
                {item.mode}
              </strong>
            </>
          )}
        </article>
      ))}
    </>
  )
}

export function DesktopSidePanel({ liveFeed, historyFeed }: { liveFeed: FeedItem[], historyFeed: FeedItem[] }) {
  return (
    <section className="panel desktop-side">
      <div className="side-block">
        <h2>Live Bets</h2>
        <div className="feed-list mini">
          <FeedItems items={liveFeed} type="live" />
        </div>
      </div>
      <div className="side-block">
        <h2>Round History</h2>
        <div className="feed-list mini">
          <FeedItems items={historyFeed} type="history" />
        </div>
      </div>
    </section>
  )
}

export function MobileFeedPanel({ title, items, type }: { title: string, items: FeedItem[], type: 'live' | 'history' }) {
  return (
    <section className="panel mobile-feed">
      <h2>{title}</h2>
      <div className="feed-list">
        <FeedItems items={items} type={type} />
      </div>
    </section>
  )
}
