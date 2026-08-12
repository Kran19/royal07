'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GameMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    username?: string;
    avatar?: string;
  } | null;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  musicEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
  animationEnabled: boolean;
  setAnimationEnabled: (v: boolean) => void;
  onMyBetsOpen: () => void;
}

export default function GameMenuModal({
  isOpen,
  onClose,
  user,
  soundEnabled,
  setSoundEnabled,
  musicEnabled,
  setMusicEnabled,
  animationEnabled,
  setAnimationEnabled,
  onMyBetsOpen
}: GameMenuModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className={cn('fixed', 'inset-0', 'z-[100]')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className={cn('absolute', 'inset-0', 'bg-black/40', 'backdrop-blur-sm', 'pointer-events-none')} />

      {/* Menu Dropdown/Popover */}
      <div className={cn('absolute', 'top-16', 'right-4', 'w-[320px]', 'max-h-[calc(100vh-5rem)]', 'bg-[#1b1c1d]', 'rounded-xl', 'shadow-2xl', 'flex', 'flex-col', 'animate-in', 'fade-in', 'zoom-in-95', 'duration-200', 'overflow-hidden', 'border', 'border-white/10')}>
        
        {/* Header / Profile */}
        <div className={cn('flex', 'items-center', 'justify-between', 'p-4', 'bg-[#232527]', 'border-b', 'border-white/5')}>
          <div className={cn('flex', 'items-center', 'gap-3')}>
            <div className={cn('w-10', 'h-10', 'rounded-full', 'bg-gradient-to-br', 'from-gray-700', 'to-gray-600', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'border', 'border-white/10')}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className={cn('w-full', 'h-full', 'object-cover')} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </div>
            <div className={cn('font-display', 'font-bold', 'text-white', 'text-sm')}>
              {user?.username || 'demo_user'}
            </div>
          </div>
          <button className={cn('flex', 'items-center', 'gap-1.5', 'px-3', 'py-1.5', 'rounded-full', 'border', 'border-white/10', 'hover:bg-white/5', 'text-xs', 'text-slate-300', 'transition-colors')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Change
          </button>
        </div>

        {/* Scrollable Items */}
        <div className={cn('flex-1', 'overflow-y-auto', 'py-2')}>
          
          {/* Toggles */}
          <div className={cn('flex', 'flex-col')}>
            <ToggleItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>}
              label="Sound" 
              checked={soundEnabled} 
              onChange={setSoundEnabled} 
            />
            <ToggleItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>}
              label="Music" 
              checked={musicEnabled} 
              onChange={setMusicEnabled} 
            />
            {/* <ToggleItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>}
              label="Animation" 
              checked={animationEnabled} 
              onChange={setAnimationEnabled} 
            /> */}
          </div>

          <div className={cn('my-2', 'h-[1px]', 'bg-white/5')} />

          {/* Links */}
          <div className={cn('flex', 'flex-col')}>
            <MenuItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
              label="My Bet History" 
              onClick={() => {
                onMyBetsOpen();
                onClose();
              }}
            />
            <MenuItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>}
              label="Game Limits" 
            />
            <MenuItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
              label="How To Play" 
            />
            <MenuItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
              label="Game Rules" 
            />
            <MenuItem 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>}
              label="Provably Fair Settings" 
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponents
function ToggleItem({ icon, label, checked, onChange }: any) {
  return (
    <div className={cn('flex', 'items-center', 'justify-between', 'px-4', 'py-3', 'hover:bg-white/5', 'transition-colors', 'cursor-pointer')} onClick={() => onChange(!checked)}>
      <div className={cn('flex', 'items-center', 'gap-3', 'text-slate-300')}>
        <span className="opacity-70">{icon}</span>
        <span className={cn('text-sm', 'font-medium')}>{label}</span>
      </div>
      <div className={cn("w-10 h-5 rounded-full relative transition-colors duration-200", checked ? "bg-green-500" : "bg-slate-600")}>
        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm", checked ? "translate-x-5" : "translate-x-0.5")} />
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: any) {
  return (
    <div className={cn('flex', 'items-center', 'gap-3', 'px-4', 'py-3', 'hover:bg-white/5', 'transition-colors', 'cursor-pointer', 'text-slate-300')} onClick={onClick}>
      <span className="opacity-70">{icon}</span>
      <span className={cn('text-sm', 'font-medium')}>{label}</span>
    </div>
  );
}
