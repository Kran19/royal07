import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface GameHistoryItem {
  stops: number[];
  bet: any;
}

interface RoundHistoryBarProps {
  history: GameHistoryItem[];
}

export function RoundHistoryBar({ history }: RoundHistoryBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get color configuration based on how many floors opened in a round
  const getBadgeStyle = (stopsCount: number) => {
    if (stopsCount === 1) {
      return 'text-[#38bdf8] bg-[rgba(56,189,248,0.08)] border-[rgba(56,189,248,0.2)]';
    }
    if (stopsCount === 2) {
      return 'text-[#c084fc] bg-[rgba(192,132,252,0.08)] border-[rgba(192,132,252,0.2)]';
    }
    return 'text-[#fbbf24] bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.2)]';
  };

  // Format stops display (e.g. [1, 7] -> "1, 7")
  const formatStops = (stops: number[]) => {
    if (!stops || stops.length === 0) return '—';
    return stops.join(', ');
  };

  // We show up to 30 items in the dropdown, and up to 15 in the main horizontal bar
  const recentHistory = history.slice(0, 30);
  const horizontalHistory = history.slice(0, 15);

  return (
    <div className="relative w-full z-40 bg-transparent px-3 pb-2 pt-0.5 flex items-center justify-between gap-2 select-none">
      {/* Horizontal List of Past Rounds */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 scroll-smooth">
        {horizontalHistory.length === 0 ? (
          <span className="text-[10px] text-slate-500 italic">Waiting for rounds...</span>
        ) : (
          horizontalHistory.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-shrink-0 text-[11px] font-black font-display px-2.5 py-0.5 rounded-full border transition-all duration-300",
                getBadgeStyle(item.stops.length)
              )}
            >
              {formatStops(item.stops)}
            </div>
          ))
        )}
      </div>

      {/* Chevron dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/5 transition-all text-slate-400 hover:text-white",
          isOpen && "bg-white/10 text-white"
        )}
      >
        <svg
          className={cn("w-3 h-3 transition-transform duration-300", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Popover (expandable grid of 30 rounds) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#090f1a] border-b border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in slide-in-from-top-2 duration-200 p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">History (Last 30 Rounds)</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-slate-400 hover:text-white uppercase font-black"
            >
              Close
            </button>
          </div>
          
          {recentHistory.length === 0 ? (
            <div className="text-center py-6 text-[11px] text-slate-500 italic">No round history available yet.</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {recentHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-2 rounded-lg border text-[11px] font-black font-display text-center",
                    getBadgeStyle(item.stops.length)
                  )}
                >
                  <span className="opacity-40 text-[8px] font-normal mb-0.5">#{history.length - idx}</span>
                  <span>{formatStops(item.stops)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
