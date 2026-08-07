'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloorHeatmapProps {
  floorExposure: number[];
  totalStake: number;
}

export function FloorHeatmap({ floorExposure, totalStake }: FloorHeatmapProps) {
  const maxExposure = Math.max(...floorExposure, 1000);

  return (
    <Card className="h-full flex flex-col min-h-[320px] shadow-sm border-slate-200/60 dark:border-slate-800">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Live Floor Exposure
            </CardTitle>
            <CardDescription className="mt-1.5">
              Real-time capital distribution across all 12 floors
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Stake</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              ₹{(totalStake || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-center pb-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 h-full content-center">
          {floorExposure.map((exposure, index) => {
            const floorNumber = index + 1;
            const hasExposure = exposure > 0;
            const isHighExposure = exposure > 5000;
            // Calculate a heat intensity from 0 to 1
            const heat = hasExposure ? Math.max(0.1, exposure / maxExposure) : 0;

            return (
              <div 
                key={floorNumber} 
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-[16px] transition-all duration-300 overflow-hidden group border",
                  hasExposure 
                    ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500/30 shadow-[0_4px_15px_rgba(99,102,241,0.08)] hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(99,102,241,0.12)]" 
                    : "bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-70"
                )}
              >
                {/* Heat Background Fill */}
                {hasExposure && (
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-indigo-50 dark:bg-indigo-500/10 transition-all duration-700 ease-out"
                    style={{ height: `${heat * 100}%` }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    hasExposure ? "text-indigo-400 dark:text-indigo-500" : "text-slate-400"
                  )}>
                    F{floorNumber}
                  </span>
                  
                  <span className={cn(
                    "text-sm sm:text-base font-black tracking-tight w-full text-center truncate",
                    hasExposure ? "text-indigo-950 dark:text-white" : "text-slate-400"
                  )}>
                    {hasExposure ? `₹${exposure.toLocaleString()}` : '-'}
                  </span>
                </div>

                {/* Pulse for high exposure */}
                {isHighExposure && (
                  <div className="absolute top-2 right-2 h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
