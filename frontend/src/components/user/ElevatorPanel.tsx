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
    phase === 'MOVING' ? 'Waiting' : phaseLabel;

  return (
    <section className={`elevator-mockup-section ${mobileHidden ? 'mobile-hidden' : ''}`}>
      {/* Elevator visual */}
      <div className="elevator-wrap">
        {/* Left indicators: even floors */}
        <aside className="indicator-col">
          {FLOORS.filter((f) => f % 2 === 0)
            .reverse()
            .map((floor) => {
              const isHit = roundStops.includes(floor);
              const isCurrentStop = activeFloor === floor && doorOpen;
              return (
                <div
                  key={floor}
                  className={`indicator ${activeFloor === floor && !isCurrentStop ? 'active' : ''} ${isHit || isCurrentStop ? 'hit' : ''}`}
                >
                  {floor}
                </div>
              );
            })}
        </aside>

        {/* Center shaft */}
        <div className="elevator-core">
          <div className={`display ${doorOpen ? 'stopped-green' : ''}`}>
            {currentFloor === 0 ? 'G' : currentFloor}
          </div>
          <div className="shaft">
            <div className={`elevator-bg ${doorOpen ? 'stopped-green' : ''}`} />
            <div className={`door door-left ${doorOpen ? 'open' : ''}`} />
            <div className={`door door-right ${doorOpen ? 'open' : ''}`} />
          </div>
        </div>

        {/* Right indicators: odd floors */}
        <aside className="indicator-col">
          {FLOORS.filter((f) => f % 2 === 1)
            .reverse()
            .map((floor) => {
              const isHit = roundStops.includes(floor);
              const isCurrentStop = activeFloor === floor && doorOpen;
              return (
                <div
                  key={floor}
                  className={`indicator ${activeFloor === floor && !isCurrentStop ? 'active' : ''} ${isHit || isCurrentStop ? 'hit' : ''}`}
                >
                  {floor}
                </div>
              );
            })}
        </aside>
      </div>

      {/* Opened stops */}
      {/* {roundStops.length > 0 && (
        <div className="opened-stops-row">
          <span className="os-label">Opened Stops</span>
          <span className="os-value">{roundStops.join(', ')}</span>
        </div>
      )} */}
    </section>
  );
}

export default ElevatorPanel;
