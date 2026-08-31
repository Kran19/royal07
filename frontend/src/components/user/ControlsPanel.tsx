'use client';

import { FLOORS } from '@/lib/gameLogic';
import { cn } from "../../lib/utils";

interface ControlsPanelProps {
  mode: string;
  setMode: (mode: string) => void;
  quickChips: number[];
  quickAmount: string;
  customQuickAmount: string;
  setCustomQuickAmount: (val: string) => void;
  onQuickSelect: (val: number | string) => void;
  onApplyCustomQuick: () => void;
  draftSimpleBets: Record<number, number>;
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

import { formatCurrency } from '@/lib/utils/currency';
import { useAuth } from '@/context/AuthContext';

function ControlsPanel({
  mode, setMode,
  quickChips, quickAmount,
  customQuickAmount, setCustomQuickAmount,
  onQuickSelect, onApplyCustomQuick,
  draftSimpleBets, onToggleSimpleFloor,
  placedFloorAmounts,
  pairFloors, onTogglePairFloor,
  pairAmount, setPairAmount,
  stake, potentialWin,
  onClearDraft, onPlaceBet,
  activeBet,
  autoEnabled, autoRounds, setAutoRounds, autoRoundsLeft, onToggleAuto,
  isPlaceBetDisabled, betActionLabel,
}: ControlsPanelProps) {
  const { user } = useAuth();
  
  return (
    <section className={cn('panel', 'control-panel')}>

      {/* 1. MODE TOGGLE — pill switch */}
      <div className="mode-row">
        <button
          className={mode === 'SIMPLE' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('SIMPLE')}
          type="button"
        >
          Single (3x)
        </button>
        <button
          className={mode === 'PAIR' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('PAIR')}
          type="button"
        >
          Combo ( 10× / 20x / 30× )
        </button>
      </div>

      {/* 2. FLOOR GRID */}
      <div className="control-group">
        <div className="section-label">1. Select Floors</div>
        <div className="floor-section">
          {mode === 'SIMPLE' ? (
            <div className="bet-grid">
              {FLOORS.map((floor) => {
                const draftAmt = draftSimpleBets[floor];
                const placedAmt = placedFloorAmounts?.[floor];
                return (
                <button
                  key={floor}
                  type="button"
                  onClick={() => onToggleSimpleFloor(floor)}
                  className={
                    `floor-btn ${draftAmt ? 'selected' : ''} ${placedAmt ? 'has-bet' : ''}`
                  }
                >
                  <span className="floor-text">
                    <span className="floor-prefix">F</span>{floor}
                  </span>
                  <div className="chip-stack">
                  {placedAmt > 0 && (
                    <span className="placed-chip">{formatCurrency(placedAmt, user?.currency || 'INR', true)}</span>
                  )}
                  {draftAmt > 0 && (
                    <span className="draft-chip">{formatCurrency(draftAmt, user?.currency || 'INR', true)}</span>
                  )}
                </div></button>
              )})}
            </div>
          ) : (
            <>
              <div className="bet-grid">
                {FLOORS.map((floor) => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => onTogglePairFloor(floor)}
                    className={pairFloors.includes(floor) ? 'floor-btn selected' : 'floor-btn'}
                  >
                    <span className="floor-text">
                      <span className="floor-prefix">F</span>{floor}
                    </span>
                  </button>
                ))}
              </div>
             
              {pairFloors.length > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>
                  Selected: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{pairFloors.join(', ')}</span>
                  {' '}({pairFloors.length === 2 ? '10×' : pairFloors.length === 3 ? '20×' : pairFloors.length === 4 ? '30×' : ''})
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. BET CONTROLS — Aviator layout */}
      <div className="control-group">
        <div className="section-label">2. Set Stake &amp; Bet</div>

        <div className="bet-action-row">
          {/* Amount stepper */}
          <div className="amount-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => {
                const cur = Number(quickAmount) || 0;
                const step = cur >= 500 ? 500 : cur >= 100 ? 100 : cur >= 10 ? 10 : 1;
                onQuickSelect(Math.max(1, cur - step));
              }}
            >
              −
            </button>
            <input
              className="stepper-display"
              inputMode="numeric"
              placeholder="0"
              value={quickAmount}
              onChange={(e) => onQuickSelect(Number(e.target.value.replace(/\D/g, '')) || '')}
            />
            <button
              type="button"
              className="stepper-btn"
              onClick={() => {
                const cur = Number(quickAmount) || 0;
                const step = cur >= 500 ? 500 : cur >= 100 ? 100 : cur >= 10 ? 10 : 1;
                onQuickSelect(cur + step);
              }}
            >
              +
            </button>
          </div>

          {/* BET button */}
          <button
            type="button"
            onClick={onPlaceBet}
            className={isPlaceBetDisabled ? 'primary-btn placed-btn' : 'primary-btn'}
            disabled={isPlaceBetDisabled}
          >
            {!isPlaceBetDisabled ? (
              <div className="bet-btn-content">
                <span className="btn-label">Bet {stake > 0 ? formatCurrency(stake, user?.currency || 'INR', true) : '—'}</span>
              </div>
            ) : (
              <span className="btn-amount" style={{ fontSize: '0.82rem' }}>{betActionLabel}</span>
            )}
          </button>
        </div>

        {/* Quick-select chips (now below, so they don't stretch the bet button) */}
        <div className={cn('chip-row', 'quick-chip-row')}>
          {quickChips.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onQuickSelect(value)}
              className={Number(quickAmount) === value ? 'chip-btn active' : 'chip-btn'}
            >
              {value >= 1000 ? `${value / 1000}K` : value}
            </button>
          ))}
        </div>
      </div>

      {/* 4. STAKE / WIN SUMMARY */}
      <div className="summary">
        <div>
          <span>Total Stake</span>
          <strong>{formatCurrency(stake, user?.currency || 'INR', true)}</strong>
        </div>
        <div className="summary-item">
          <span className="label">Potential Win</span>
          <strong className="text-[#10b981]">
            {formatCurrency(potentialWin, user?.currency || 'INR', true)}
          </strong>
        </div>
      </div>

      {/* 5. AUTOPLAY + CLEAR — pill row */}
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
          {autoEnabled && (
            <span className="auto-left">{autoRoundsLeft} left</span>
          )}
        </div>
        <button
          type="button"
          className={autoEnabled ? 'auto-toggle-btn on' : 'auto-toggle-btn'}
          onClick={onToggleAuto}
        >
          {autoEnabled ? '⏹ Stop' : '▶ Start'}
        </button>
        <button type="button" onClick={onClearDraft} className="ghost-btn" style={{ width: 'auto', padding: '0 1rem', minWidth: '60px' }}>
          Clear
        </button>
      </div>

      {/* 7. ACTIVE BET TICKET (desktop only via CSS) */}
      {activeBet && (
        <div className="active-bet">
          <div className="ab-row">
            <span className="ab-label">Stake</span>
            <strong>{formatCurrency(activeBet.stake || 0, user?.currency || 'INR', true)}</strong>
          </div>
          <div className="active-bet-stats">
            <article>
              <span>Singles</span>
              <strong>{Object.keys(activeBet.simpleFloorBets ?? {}).length}</strong>
            </article>
            <article>
              <span>Combos</span>
              <strong>{activeBet.pairBets?.length || 0}</strong>
            </article>
          </div>
          <div className="active-bet-list">
            {Object.entries(activeBet.simpleFloorBets ?? {}).map(([floor, amount]: [string, any]) => (
              <div key={floor} className="ab-bet-item flex justify-between">
                <span>Floor {floor}</span>
                <strong>{formatCurrency(amount, user?.currency || 'INR', true)}</strong>
              </div>
            ))}
            {(activeBet.pairBets ?? []).map((pb: any, i: number) => (
              <div key={i} className="ab-bet-item flex justify-between">
                <span>Pair {pb.floors.join('-')}</span>
                <strong>{formatCurrency(pb.pairAmount, user?.currency || 'INR', true)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default ControlsPanel;
