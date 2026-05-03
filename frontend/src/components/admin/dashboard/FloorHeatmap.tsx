'use client';

import React from 'react';

interface FloorHeatmapProps {
  floorExposure: number[];
  totalStake: number;
}

export function FloorHeatmap({ floorExposure, totalStake }: FloorHeatmapProps) {
  return (
    <div className="mt-8 rounded-3xl border border-white/5 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Live Floor Exposure</h3>
          <p className="text-sm text-slate-400">Total Stake Riding: <span className="text-cyan-400 font-bold">₹{(totalStake || 0).toLocaleString()}</span></p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {floorExposure.map((exposure, index) => {
          const floorNumber = index + 1;
          const isHighExposure = exposure > 5000;
          return (
            <div 
              key={floorNumber} 
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                exposure > 0 
                  ? 'border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'border-white/5 bg-white/5'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Floor {floorNumber}</span>
              <span className={`text-xl font-black ${exposure > 0 ? 'text-white' : 'text-slate-600'}`}>
                ₹{exposure.toLocaleString()}
              </span>
              {isHighExposure && (
                <div className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
