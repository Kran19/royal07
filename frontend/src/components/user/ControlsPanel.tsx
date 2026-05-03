'use client';

import { FLOORS } from '@/lib/gameLogic'

interface ControlsPanelProps {
  mode: string;
  setMode: (mode: string) => void;
  quickChips: number[];
  quickAmount: string;
  customQuickAmount: string;
  setCustomQuickAmount: (val: string) => void;
  onQuickSelect: (val: number | string) => void;
  onApplyCustomQuick: () => void;
  simpleFloors: number[];
  onToggleSimpleFloor: (floor: number) => void;
  placedFloorAmounts: Record<number, number>;
  pairFloors: number[];
  onTogglePairFloor: (floor: number) => void;
  pairAmount: string;
  setPairAmount: (val: string) => void;
  stake: number;
  potentialWin: number;
  onClearDraft: () => void;
  onPlaceBet: () => void;
  activeBet: any;
  autoEnabled: boolean;
  autoRounds: string;
  setAutoRounds: (val: string) => void;
  autoRoundsLeft: number;
  onToggleAuto: () => void;
  isPlaceBetDisabled: boolean;
  betActionLabel: string;
}

function ControlsPanel({
  mode,
  setMode,
  quickChips,
  quickAmount,
  customQuickAmount,
  setCustomQuickAmount,
  onQuickSelect,
  onApplyCustomQuick,
  simpleFloors,
  onToggleSimpleFloor,
  placedFloorAmounts,
  pairFloors,
  onTogglePairFloor,
  pairAmount,
  setPairAmount,
  stake,
  potentialWin,
  onClearDraft,
  onPlaceBet,
  activeBet,
  autoEnabled,
  autoRounds,
  setAutoRounds,
  autoRoundsLeft,
  onToggleAuto,
  isPlaceBetDisabled,
  betActionLabel,
}: ControlsPanelProps) {
  return (
    <section className="panel control-panel">
      <div className="mode-row">
        <button
          className={mode === 'SIMPLE' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('SIMPLE')}
          type="button"
        >
          Single (4x)
        </button>
        <button
          className={mode === 'PAIR' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('PAIR')}
          type="button"
        >
          Combo (11x / 21x / 31x)
        </button>
      </div>

      <div className="floor-section">
        {mode === 'SIMPLE' ? (
          <div className="bet-grid six-cols">
            {FLOORS.map((floor) => (
              <button
                key={floor}
                type="button"
                onClick={() => onToggleSimpleFloor(floor)}
                className={
                  `floor-btn ${simpleFloors.includes(floor) ? 'selected' : ''} ${placedFloorAmounts?.[floor] ? 'has-bet' : ''}`
                }
              >
                <span>{floor}</span>
                {placedFloorAmounts?.[floor] ? <span className="placed-chip">{placedFloorAmounts[floor]}</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="bet-grid six-cols">
              {FLOORS.map((floor) => (
                <button
                  key={floor}
                  type="button"
                  onClick={() => onTogglePairFloor(floor)}
                  className={pairFloors.includes(floor) ? 'floor-btn selected' : 'floor-btn'}
                >
                  {floor}
                </button>
              ))}
            </div>
            <div className="pair-amount-row">
              <label htmlFor="pair-amount">Pair Amount</label>
              <input
                id="pair-amount"
                className="pair-amount-input"
                inputMode="numeric"
                placeholder="100"
                value={pairAmount}
                onChange={(e) => setPairAmount(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="amount-section">
        <div className="chip-row quick-chip-row">
          {quickChips.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onQuickSelect(value)}
              className={Number(quickAmount) === value ? 'chip-btn active' : 'chip-btn'}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="custom-chip-row">
          <input
            className="custom-chip-input"
            inputMode="numeric"
            placeholder="Custom amount"
            value={customQuickAmount}
            onChange={(e) => setCustomQuickAmount(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApplyCustomQuick()
            }}
          />
          <button 
            type="button" 
            className={`ghost-btn ${(quickAmount === customQuickAmount && customQuickAmount !== '' && !quickChips.includes(Number(quickAmount))) ? 'active' : ''}`} 
            onClick={onApplyCustomQuick}
          >
            Set Chip
          </button>
        </div>
      </div>

      <div className="action-row">
        <button type="button" onClick={onClearDraft} className="ghost-btn">
          Clear
        </button>
        <button
          type="button"
          onClick={onPlaceBet}
          className={isPlaceBetDisabled ? 'primary-btn placed-btn' : 'primary-btn'}
          disabled={isPlaceBetDisabled}
        >
          {betActionLabel}
        </button>
      </div>

      <div className="auto-row">
        <div className="auto-toggle-wrap">
          <span className="auto-label">Auto Play</span>
          <input
            className="auto-rounds"
            inputMode="numeric"
            placeholder="3"
            value={autoRounds}
            onChange={(e) => setAutoRounds(e.target.value)}
          />
          <span className="auto-left">Left: {autoRoundsLeft}</span>
        </div>
        <button
          type="button"
          className={autoEnabled ? 'auto-toggle-btn on' : 'auto-toggle-btn'}
          onClick={onToggleAuto}
        >
          {autoEnabled ? 'Auto ON - Stop' : 'Auto OFF - Start'}
        </button>
      </div>

      <div className="summary">
        <div>
          <span>Stake</span>
          <strong>{stake}</strong>
        </div>
        <div>
          <span>Potential Win</span>
          <strong>{potentialWin}</strong>
        </div>
      </div>



      {activeBet && (
        <div className="active-bet">
          <div className="active-bet-head">
            <span>Round Ticket</span>
            <strong>{activeBet.stake}</strong>
          </div>
          <div className="active-bet-stats">
            <article>
              <span>Simple Floors</span>
              <strong>{Object.keys(activeBet.simpleFloorBets ?? {}).length || 0}</strong>
            </article>
            <article>
              <span>Pair Bets</span>
              <strong>{activeBet.pairBets?.length || 0}</strong>
            </article>
          </div>
          <div className="active-bet-list">
            {Object.entries(activeBet.simpleFloorBets ?? {}).map(([floor, amount]: [string, any]) => (
              <div key={`simple-${floor}`} className="active-bet-row">
                <span>Floor {floor}</span>
                <strong>{amount}</strong>
              </div>
            ))}
            {(activeBet.pairBets ?? []).map((pairBet: any, index: number) => (
              <div key={`pair-${index}`} className="active-bet-row">
                <span>Pair {pairBet.floors.join(', ')}</span>
                <strong>{pairBet.pairAmount}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default ControlsPanel
