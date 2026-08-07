'use client';

import { FLOORS } from '@/lib/gameLogic';

interface ElevatorPanelProps {
  phaseLabel: string;
  phase: string;
  timer: number;
  currentFloor: number;
  activeFloor: number;
  roundStops: number[];
  doorOpen: boolean;
  mobileHidden: boolean;
  balance: number;
  isDesktop: boolean;
}

function ElevatorPanel({
  phaseLabel,
  phase,
  timer,
  currentFloor,
  activeFloor,
  roundStops,
  doorOpen,
  mobileHidden,
  balance,
  isDesktop,
}: ElevatorPanelProps) {
  // Map phase to CSS class for color-coded badge
  const phaseClass =
    phase === 'BETTING' ? 'betting' :
    phase === 'LOCKED' ? 'locked' : 'moving';

  // Readable label
  const readableLabel =
    phase === 'BETTING' ? 'Betting Open' :
    phase === 'LOCKED' ? 'Bets Closed' :
    phase === 'MOVING' ? 'Elevator Moving' : phaseLabel;

  return (
    <section className={`panel game-panel ${mobileHidden ? 'mobile-hidden' : ''}`}>
      {/* Status bar */}
      <div className="status-row">
        <span className={`phase-tag ${phaseClass}`}>{readableLabel}</span>

        {/* Mobile inline balance */}
        {!isDesktop && balance !== undefined && (
          <span style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            ₹{balance.toLocaleString('en-IN')}
          </span>
        )}

        <span className="timer">
          {phase === 'MOVING' ? '🚀' : `${timer}s`}
        </span>
      </div>

      {/* Elevator visual */}
      <div className="elevator-wrap">
        {/* Left indicators: odd floors */}
        <aside className="indicator-col">
          {FLOORS.filter((f) => f % 2 === 1)
            .reverse()
            .map((floor) => (
              <div
                key={floor}
                className={`indicator ${activeFloor === floor ? 'active' : ''} ${roundStops.includes(floor) ? 'hit' : ''}`}
              >
                {floor}
              </div>
            ))}
        </aside>

        {/* Center shaft */}
        <div className="elevator-core">
          <div className="display">{currentFloor === 0 ? 'G' : currentFloor}</div>
          <div className="shaft">
            <div className="elevator-bg" />
            <div className={`door door-left ${doorOpen ? 'open' : ''}`} />
            <div className={`door door-right ${doorOpen ? 'open' : ''}`} />
          </div>
        </div>

        {/* Right indicators: even floors */}
        <aside className="indicator-col">
          {FLOORS.filter((f) => f % 2 === 0)
            .reverse()
            .map((floor) => (
              <div
                key={floor}
                className={`indicator ${activeFloor === floor ? 'active' : ''} ${roundStops.includes(floor) ? 'hit' : ''}`}
              >
                {floor}
              </div>
            ))}
        </aside>
      </div>

      {/* Opened stops */}
      <div className="target-row">
        <span>Opened Stops</span>
        <strong>{roundStops.length ? roundStops.join(', ') : '—'}</strong>
      </div>
    </section>
  );
}

export default ElevatorPanel;
