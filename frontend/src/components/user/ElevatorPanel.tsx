'use client';

import { FLOORS } from '@/lib/gameLogic'

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

function ElevatorPanel({ phaseLabel, phase, timer, currentFloor, activeFloor, roundStops, doorOpen, mobileHidden, balance, isDesktop }: ElevatorPanelProps) {
  return (
    <section className={`panel game-panel ${mobileHidden ? 'mobile-hidden' : ''}`}>
      <div className="status-row">
        <span className="phase-tag">{phaseLabel}</span>
        {!isDesktop && balance !== undefined && (
          <span style={{ fontSize: '0.78rem', color: '#fcd34d', fontWeight: 700 }}>
            <span style={{ color: '#a0abc9', marginRight: '4px' }}>Wallet</span>
            {balance}
          </span>
        )}
        <span className="timer">{phase === 'MOVING' ? '...' : `${timer}s`}</span>
      </div>

      <div className="elevator-wrap">
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

        <div className="elevator-core">
          <div className="display">{currentFloor === 0 ? 'G' : currentFloor}</div>
          <div className="shaft">
            <div className="elevator-bg" />
            <div className={`door door-left ${doorOpen ? 'open' : ''}`} />
            <div className={`door door-right ${doorOpen ? 'open' : ''}`} />
          </div>
        </div>

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

      <div className="target-row">
        <span>Opened Stops:</span>
        <strong>{roundStops.length ? roundStops.join(', ') : '-'}</strong>
      </div>
    </section>
  )
}

export default ElevatorPanel
