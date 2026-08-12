'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';
import ControlsPanel from '@/components/user/ControlsPanel';
import ElevatorPanel from '@/components/user/ElevatorPanel';
import MobileNav from '@/components/user/MobileNav';
import { DesktopSidePanel } from '@/components/user/SidePanel';
import TopBar from '@/components/user/TopBar';
import { MobileHeader } from '@/components/user/MobileHeader';
import { RoundHistoryBar } from '@/components/user/RoundHistoryBar';
import WalletModal from '@/components/user/WalletModal';
import MyBetsModal from '@/components/user/MyBetsModal';
import WalletPanel from '@/components/user/WalletPanel';
import GameMenuModal from '@/components/user/GameMenuModal';
import { createPairBetTemplate, createSimpleSelectionTemplate, createSimpleBetTemplate, PAIR_MULTIPLIERS } from '@/lib/gameLogic';
import type { ValidationResult, BetTemplate } from '@/lib/gameLogic';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { BetType, RoundStatus } from '@/types';
import './game.css';
import { cn } from "../../lib/utils";

const soundBetPlaced = '/elevator/sounds/v2/bet_placed.mp3';
const soundElevatorStart = '/elevator/sounds/v2/elevator_start.mp3';
const soundElevatorDing = '/elevator/sounds/v2/elevator_ding.mp3';
const soundElevatorRing = '/elevator/sounds/v2/elevator_ring.mp3';
const soundTick = '/elevator/sounds/v2/tick.mp3';
const soundWin = '/elevator/sounds/v2/win.mp3';
const soundMiss = '/elevator/sounds/v2/clear.mp3';

const INITIAL_QUICK_CHIPS = [10, 20, 30, 50, 100, 200, 500, 1000];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : API_BASE);

interface GameBet {
  stake: number;
  simpleFloorBets: Record<number, number>;
  pairBets: { floors: number[]; pairAmount: number }[];
}

interface Toast {
  id: string;
  message: string;
  type: string;
}

interface GameHistoryItem {
  stops: number[];
  bet: GameBet | null;
}

interface LiveFeedItem {
  id: string;
  user: string;
  amount: number;
  floor: string;
}

function App() {
  const { user, token: authToken, isLoggedIn, login, logout, isLoading: isAuthLoading } = useAuth();
  const authUserId = user?.id || '';
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const [myBetsOpen, setMyBetsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [balance, setBalance] = useState(10000);
  const [phase, setPhase] = useState('BETTING');
  const [timer, setTimer] = useState(30);
  const [roundId, setRoundId] = useState('');
  const [mode, setMode] = useState('SIMPLE');
  const [quickAmount, setQuickAmount] = useState('100');
  const [quickChips, setQuickChips] = useState(INITIAL_QUICK_CHIPS);
  const [customQuickAmount, setCustomQuickAmount] = useState('');
  const [draftSimpleBets, setDraftSimpleBets] = useState<Record<number, number>>({});
  const [pairFloors, setPairFloors] = useState<number[]>([]);
  const [pairAmount, setPairAmount] = useState('100');
  const [activeBet, setActiveBet] = useState<GameBet | null>(null);

  // Elevator State
  const [targetStops, setTargetStops] = useState<number[]>([]);
  const [roundStops, setRoundStops] = useState<number[]>([]);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [activeFloor, setActiveFloor] = useState(0);
  const [doorOpen, setDoorOpen] = useState(false);

  // History / Feed
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileTab, setMobileTab] = useState('game');
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);

  // Autoplay
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoRounds, setAutoRounds] = useState('3');
  const [autoRoundsLeft, setAutoRoundsLeft] = useState(0);
  const [autoTemplate, setAutoTemplate] = useState<BetTemplate | null>(null);
  const [autoPlacedId, setAutoPlacedId] = useState('');

  const activeBetRef = useRef<GameBet | null>(null);
  const balanceRef = useRef(balance);
  const socketRef = useRef<any>(null);
  const soundsRef = useRef<Record<string, HTMLAudioElement>>({});
  const lastRunRoundId = useRef<string | null>(null);

  useEffect(() => { activeBetRef.current = activeBet; }, [activeBet]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  useEffect(() => {
    const pool = {
      bet: new Audio(soundBetPlaced),
      start: new Audio(soundElevatorStart),
      ding: new Audio(soundElevatorDing),
      ring: new Audio(soundElevatorRing),
      tick: new Audio(soundTick),
      win: new Audio(soundWin),
      lose: new Audio(soundMiss),
    };
    pool.bet.volume = 0.55;
    pool.start.volume = 0.35;
    pool.ding.volume = 0.5;
    pool.ring.volume = 0.45;
    pool.tick.volume = 0.18;
    pool.win.volume = 0.65;
    pool.lose.volume = 0.34;
    soundsRef.current = pool;

    return () => {
      Object.values(pool).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const playSound = useCallback((name: string) => {
    if (!soundEnabled) return;
    const sound = soundsRef.current[name];
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => { });
  }, [soundEnabled]);

  const pushToast = useCallback((message: string, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/status`);
      const data = await res.json();
      if (data.success && data.data) {
        setMaintenanceMode(data.data.maintenanceMode);
      }
    } catch (e) {
      console.error('Status check failed', e);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const syncState = useCallback(async () => {
    if (!isLoggedIn || !authToken) return;
    try {
      // Sync balance
      const bRes = await fetch(`${API_BASE}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const bData = await bRes.json();
      if (bData.success) setBalance(bData.data.balance);

      // Sync active bets for current round
      const btRes = await fetch(`${API_BASE}/bets/current-round`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const btData = await btRes.json();
      if (btData.success && btData.data.userBets.length > 0) {
        const totalStake = btData.data.totalStake;
        const simpleFloorBets: Record<number, number> = {};
        const pairBets: any[] = [];

        btData.data.userBets.forEach((b: any) => {
          if (b.betType === 'SINGLE') {
            b.numbers.forEach((n: number) => {
              simpleFloorBets[n] = (simpleFloorBets[n] || 0) + b.amount;
            });
          } else {
            pairBets.push({ floors: b.numbers, pairAmount: b.amount });
          }
        });

        setActiveBet({
          stake: totalStake,
          simpleFloorBets,
          pairBets
        });
      }
    } catch (e) {
      console.error('State sync failed', e);
    }
  }, [isLoggedIn, authToken]);

  useEffect(() => {
    if (isLoggedIn) syncState();
  }, [isLoggedIn, syncState]);


  // 🔌 WEBSOCKET INTEGRATION - Updated for Production Lifecycle
  useEffect(() => {
    if (!isLoggedIn) return;

    const socket = io(WS_URL, {
      auth: { token: authToken, userId: authUserId },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to RoyalBet Engine');
      pushToast('Connected to Game Engine!', 'success');
    });

    let lastPhase = '';

    socket.on('game_state', (data) => {
      setPhase((prevPhase) => {
        if (prevPhase !== 'BETTING' && data.phase === 'BETTING') {
          // Reset visually on new round start
          setCurrentFloor(0);
          setActiveFloor(0);
          if (animationEnabled) {
            setDoorOpen(false);
          }
          setActiveBet(null);
          setTargetStops([]);
          setRoundStops([]);
          setAutoPlacedId('');
          lastRunRoundId.current = null; // Reset for new round
        }
        return data.phase;
      });

      if (data.timer !== undefined) setTimer(data.timer);
      if (data.roundId) setRoundId(data.roundId);

      if (data.phase !== lastPhase) {
        if (data.phase === 'LOCKED') {
          pushToast('Betting Closed', 'info');
        } else if (data.phase === 'MOVING' && data.targetStops) {
          setTargetStops([...data.targetStops]);
          if (data.roundId) setRoundId(data.roundId);
        } else if (data.phase === 'RESULT' && data.payouts) {
          // You could parse payouts here if you want to notify specific user wins
        }
        lastPhase = data.phase;
      } else if (data.phase === 'MOVING' && data.targetStops) {
        // Just sync roundId if missing
        if (data.roundId) setRoundId(data.roundId);
      }
    });

    socket.on('bet_confirmed', (res) => {
      playSound('bet');
      pushToast(`Bet Confirmed! ₹${res.amount}`, 'info');
      if (res.balance !== undefined) setBalance(res.balance);
    });

    socket.on('bet_rejected', (data) => {
      pushToast(data.message || 'Bet Rejected', 'loss');
    });

    socket.on('balance_update', (data) => {
      setBalance(data.balance);
    });

    socket.on('new_bet', (data) => {
      setLiveFeed((prev) => [data, ...prev].slice(0, 50));
    });

    return () => {
      if (socket) socket.disconnect();
      socketRef.current = null;
    };
  }, [playSound, pushToast, isLoggedIn, authToken, authUserId, animationEnabled]);

  const [personalHistory, setPersonalHistory] = useState<any[]>([]);
  const loadPersonalHistory = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/bets/history`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setPersonalHistory(data.data.items);
      }
    } catch (e) {
      console.error('History load failed', e);
    }
  }, [authToken]);

  const loadRoundHistory = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`${API_BASE}/game/history?page=1&limit=30`, { headers });
      const data = await res.json();
      if (data.success && data.data?.items) {
        const mappedHistory = data.data.items.map((r: any) => ({
          stops: r.openingResult || r.stops || [],
          bet: null
        }));
        setHistory(mappedHistory);
      }
    } catch (e) {
      console.error('History load failed', e);
    }
  }, [authToken]);

  useEffect(() => {
    loadRoundHistory();
  }, [loadRoundHistory]);

  useEffect(() => {
    if (mobileTab === 'history') loadPersonalHistory();
  }, [mobileTab, loadPersonalHistory]);

  const draftCheck: ValidationResult = useMemo(() => {
    if (mode === 'SIMPLE') return createSimpleBetTemplate(draftSimpleBets);
    return createPairBetTemplate(pairFloors, pairAmount);
  }, [mode, draftSimpleBets, quickAmount, pairFloors, pairAmount]);

  const draftStake = draftCheck.valid ? draftCheck.template?.stake || 0 : 0;
  const draftWin = draftCheck.valid ? draftCheck.template?.potentialWin || 0 : 0;

  const activeStake = activeBet?.stake || 0;
  let maxActiveWin = 0;
  if (activeBet?.simpleFloorBets) {
    const totalSimpleStake = Object.values(activeBet.simpleFloorBets).reduce((a: any, b: any) => a + b, 0) as number;
    maxActiveWin += totalSimpleStake * 4; // Updated to 4x
  }
  if (activeBet?.pairBets) {
    activeBet.pairBets.forEach((pb: any) => {
      const mult = PAIR_MULTIPLIERS[pb.floors.length] || 0;
      maxActiveWin += pb.pairAmount * mult;
    });
  }

  const stake = draftStake + activeStake;
  const potentialWin = draftWin + maxActiveWin;
  const placedFloorAmounts = activeBet?.simpleFloorBets ?? {};

  const stopAuto = useCallback(() => {
    setAutoEnabled(false);
    setAutoRoundsLeft(0);
    setAutoTemplate(null);
  }, []);

  const stopAutoOnDraftChange = useCallback(() => {
    if (!autoEnabled || activeBetRef.current) return;
    stopAuto();
    pushToast('Auto stopped because bet settings changed', 'info');
  }, [autoEnabled, pushToast, stopAuto]);

  const onFloorClick = useCallback((floor: number) => {
    stopAutoOnDraftChange();
    const amt = Number(quickAmount) || 0;
    if (amt <= 0) {
      pushToast('Select a chip amount first', 'info');
      return;
    }
    setDraftSimpleBets((prev) => {
      const next = { ...prev };
      if (next[floor]) {
        delete next[floor];
      } else {
        next[floor] = amt;
      }
      return next;
    });
  }, [quickAmount, stopAutoOnDraftChange, pushToast]);

  const onQuickSelect = useCallback((value: number | string) => {
    stopAutoOnDraftChange();
    const val = String(value);
    setQuickAmount(val);
    setCustomQuickAmount(val);
    if (mode === 'PAIR') setPairAmount(val);
  }, [mode, stopAutoOnDraftChange]);

  const onApplyCustomQuick = useCallback(() => {
    if (!/^\d+$/.test(customQuickAmount)) return;
    stopAutoOnDraftChange();
    const parsedVal = Math.max(1, Number.parseInt(customQuickAmount, 10));
    const val = String(parsedVal);

    setQuickChips((prev) => {
      const idx = prev.findIndex((chip) => String(chip) === quickAmount);
      if (idx !== -1 && String(parsedVal) !== quickAmount) {
        const next = [...prev];
        next[idx] = parsedVal;
        return next;
      }
      return prev;
    });

    setQuickAmount(val);
    setCustomQuickAmount(val);
    if (mode === 'PAIR') setPairAmount(val);
  }, [customQuickAmount, mode, quickAmount, stopAutoOnDraftChange]);

  const onTogglePairFloor = useCallback((floor: number) => {
    stopAutoOnDraftChange();
    setPairFloors((prev) => {
      if (prev.includes(floor)) return prev.filter((f) => f !== floor);
      if (prev.length >= 4) return prev;
      return [...prev, floor].sort((a, b) => a - b);
    });
  }, [stopAutoOnDraftChange]);

  const onModeChange = useCallback((nextMode: string) => {
    stopAutoOnDraftChange();
    setMode(nextMode);
  }, [stopAutoOnDraftChange]);

  const onPairAmountChange = useCallback((value: string) => {
    stopAutoOnDraftChange();
    setPairAmount(value);
  }, [stopAutoOnDraftChange]);

  const onAutoRoundsChange = useCallback((value: string) => {
    stopAutoOnDraftChange();
    setAutoRounds(value);
  }, [stopAutoOnDraftChange]);

  const clearDraft = useCallback(() => {
    stopAutoOnDraftChange();
    if (mode === 'SIMPLE') setDraftSimpleBets({});
    else {
      setPairFloors([]);
      setPairAmount('');
    }
  }, [mode, stopAutoOnDraftChange]);

  const isPlaceBetDisabled = phase !== 'BETTING';

  const betActionLabel = useMemo(() => {
    if (phase === 'BETTING' && activeBet?.stake) return 'Add Bet';
    if (phase === 'LOCKED') return 'Betting Closed';
    if (phase === 'MOVING') return 'Waiting';
    return 'Place Bet';
  }, [activeBet, phase]);

  const sendBetToBackend = useCallback((template: BetTemplate, source = 'manual') => {
    if (phase !== 'BETTING' || !socketRef.current) return false;

    // Mapping UI templates to Backend BetTypes
    let betType: BetType = BetType.SINGLE;
    if (template.mode === 'PAIR') {
      const count = template.floors.length;
      if (count === 2) betType = BetType.PAIR;
      else if (count === 3) betType = BetType.TRIPLE;
      else if (count === 4) betType = BetType.QUAD;
    }

    const payload = {
      betType,
      numbers: template.floors,
      amount: template.stake / (template.mode === 'SIMPLE' ? template.floors.length : 1)
    };

    // Optimistic UI merge
    setActiveBet((prev: any) => {
      if (!prev) {
        return {
          stake: template.stake,
          simpleFloorBets: template.mode === 'SIMPLE' ? { ...template.floorBets } : {},
          pairBets: template.mode === 'PAIR' ? [{ floors: template.floors, pairAmount: template.pairAmount }] : []
        };
      }

      const newSimpleBets = { ...prev.simpleFloorBets };
      if (template.mode === 'SIMPLE') {
        for (const [f, amt] of Object.entries(template.floorBets)) {
          newSimpleBets[f] = (newSimpleBets[f] || 0) + amt;
        }
      }

      return {
        stake: prev.stake + template.stake,
        simpleFloorBets: newSimpleBets,
        pairBets: template.mode === 'PAIR'
          ? [...prev.pairBets, { floors: template.floors, pairAmount: template.pairAmount }]
          : prev.pairBets
      };
    });

    socketRef.current.emit('place_bet', payload);

    if (source !== 'auto') {
      setDraftSimpleBets({});
      setPairFloors([]);
    } else {
      setAutoPlacedId(Date.now().toString());
    }
    return true;
  }, [phase]);

  const handlePlaceBet = useCallback(() => {
    if (!draftCheck.valid) {
      pushToast(draftCheck.error || 'Please select floors', 'loss');
      return;
    }
    sendBetToBackend(draftCheck.template!, 'manual');
  }, [draftCheck, pushToast, sendBetToBackend]);

  const handleToggleAuto = useCallback(() => {
    if (autoEnabled) {
      stopAuto();
      pushToast('Autoplay stopped', 'info');
      return;
    }
    if (!draftCheck.valid) {
      pushToast(draftCheck.error || 'Please select floors', 'loss');
      return;
    }
    const rounds = Math.max(1, Number.parseInt(autoRounds, 10) || 1);
    setAutoEnabled(true);
    setAutoTemplate(draftCheck.template ?? null);
    setAutoRoundsLeft(rounds);
    pushToast(`Autoplay started for ${rounds} rounds`, 'info');

    // Immediate trigger if already in Betting phase
    if (phase === 'BETTING' && !activeBetRef.current?.stake) {
      if (sendBetToBackend(draftCheck.template!, 'auto')) {
        setAutoRoundsLeft(rounds - 1);
      }
    }
  }, [autoEnabled, autoRounds, draftCheck, phase, pushToast, sendBetToBackend, stopAuto]);

  // 🔄 AUTOPLAY PERSISTENCE ENGINE
  useEffect(() => {
    if (!autoEnabled || !autoTemplate || autoRoundsLeft <= 0) return;
    if (phase === 'BETTING' && !activeBetRef.current?.stake) {
      if (sendBetToBackend(autoTemplate, 'auto')) {
        setAutoRoundsLeft(prev => prev - 1);
      }
    }
  }, [phase, autoEnabled, autoTemplate, autoRoundsLeft, sendBetToBackend]);

  // 🏗️ PRODUCTION ELEVATOR ANIMATION ENGINE
  useEffect(() => {
    if (phase !== 'MOVING' || targetStops.length === 0) return;
    if (lastRunRoundId.current === roundId) return;

    lastRunRoundId.current = roundId;
    let cancelled = false;

    const move = async () => {
      playSound('start');
      const latestStops: number[] = [];

      for (let floor = 1; floor <= 12; floor++) {
        if (cancelled) return;
        setCurrentFloor(floor);
        setActiveFloor(floor);
        playSound('tick');
        await new Promise((resolve) => setTimeout(resolve, 700)); // 700ms per floor

        if (targetStops.includes(floor)) {
          latestStops.push(floor);
          setRoundStops(prev => [...prev, floor]);
          if (animationEnabled) {
            setDoorOpen(true);
          }
          playSound('ding');
          playSound('ring');

          if (activeBetRef.current?.simpleFloorBets?.[floor]) {
            playSound('win');
            pushToast(`🎉 Floor ${floor} Hit! +${(activeBetRef.current.simpleFloorBets[floor] * 3).toLocaleString()}`, 'win');
          }

          const pairBets = activeBetRef.current?.pairBets || [];
          pairBets.forEach((pb: any) => {
            const lastFloorOfPair = Math.max(...pb.floors);
            if (floor === lastFloorOfPair) {
              const allFloorsHit = pb.floors.every((f: number) => targetStops.includes(f));
              if (allFloorsHit) {
                playSound('win');
                pushToast(`🔥 Combo Hit! All ${pb.floors.length} floors opened!`, 'win');
              }
            }
          });

          await new Promise((resolve) => setTimeout(resolve, 2500)); // 2.5s door stays open
          setDoorOpen(false);
          await new Promise((resolve) => setTimeout(resolve, 300)); // brief pause before moving again
        }
      }

      setHistory((prev) => [{ stops: latestStops, bet: activeBetRef.current }, ...prev].slice(0, 50));
    };

    move();
    return () => { cancelled = true; };
  }, [phase, roundId, playSound, pushToast, animationEnabled]); // Depend on roundId for stability

  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const phaseLabel = phase === 'BETTING' ? 'BETTING OPEN' : phase;

  const historyFeed = useMemo(() => history.map((item, idx) => ({
    round: history.length - idx,
    stops: item.stops,
    mode: item.bet?.simpleFloorBets && Object.keys(item.bet.simpleFloorBets).length ? 'Single' : (item.bet?.pairBets?.length ? 'Combo' : 'No Bet'),
  })), [history]);

  if (isAuthLoading) {
    return (
      <div className={cn('flex', 'min-h-screen', 'items-center', 'justify-center', 'bg-[#030712]')}>
        <div className={cn('h-12', 'w-12', 'animate-spin', 'rounded-full', 'border-4', 'border-yellow-400', 'border-t-transparent', 'shadow-[0_0_15px_rgba(250,204,21,0.3)]')}></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="fx-bg" />

      {maintenanceMode && (
        <div className={cn('fixed', 'inset-0', 'z-[100]', 'flex', 'items-center', 'justify-center', 'bg-[#030712]/95', 'backdrop-blur-xl')}>
          <div className={cn('panel', 'max-w-lg', 'p-10', 'text-center', 'shadow-2xl')} style={{ borderTop: '4px solid #f59e0b' }}>
            <div className={cn('mb-6', 'flex', 'justify-center')}>
              <div className={cn('relative', 'h-24', 'w-24')}>
                <div className={cn('absolute', 'inset-0', 'animate-ping', 'rounded-full', 'bg-yellow-500/20')} />
                <div className={cn('relative', 'flex', 'h-full', 'w-full', 'items-center', 'justify-center', 'rounded-full', 'bg-yellow-500/10', 'text-yellow-500', 'shadow-[0_0_30px_rgba(245,158,11,0.2)]')}>
                  <svg className={cn('h-12', 'w-12')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>
            <h1 className={cn('mb-3', 'text-4xl', 'font-black', 'italic', 'tracking-tighter', 'text-yellow-400')} style={{ fontFamily: 'Sora' }}>
              REPAIR IN PROGRESS
            </h1>
            <p className={cn('mb-8', 'text-lg', 'font-medium', 'leading-relaxed', 'text-slate-300')}>
              The Royal Elevator is currently undergoing its 100-floor inspection.
              Our technicians are polishing the gold and greasing the gears.
            </p>
            <div className={cn('flex', 'flex-col', 'items-center', 'gap-4')}>
              <div className={cn('flex', 'items-center', 'gap-2', 'rounded-full', 'bg-white/5', 'px-4', 'py-2', 'text-sm', 'font-bold', 'text-slate-400')}>
                <span className={cn('h-2', 'w-2', 'animate-pulse', 'rounded-full', 'bg-cyan-400')} />
                ESTIMATED COMPLETION: SOON™
              </div>
              <p className={cn('text-xs', 'italic', 'text-slate-500')}>Thank you for your patience, Your Highness.</p>
            </div>
          </div>
        </div>
      )}

      {!isLoggedIn ? (
        <AuthForm
          mode={authMode}
          setMode={setAuthMode}
          name={userName} setName={setUserName}
          mobile={userMobile} setMobile={setUserMobile}
          password={userPassword} setPassword={setUserPassword}
          confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
          loading={authLoading}
          pushToast={pushToast}
          onSubmit={async () => {
            if (userMobile.length !== 10) {
              pushToast('Mobile number must be 10 digits', 'error');
              return;
            }
            if (authMode === 'register' && userPassword !== confirmPassword) {
              pushToast('Passwords do not match', 'error');
              return;
            }
            if (authMode === 'register' && !userName) {
              pushToast('Please enter your name', 'error');
              return;
            }

            setAuthLoading(true);
            try {
              const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
              const body = authMode === 'register'
                ? { mobile: userMobile.trim(), username: userName.trim(), password: userPassword }
                : { mobile: userMobile.trim(), password: userPassword };

              const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const data = await res.json();
              if (data.success) {
                setBalance(data.data.user.balance);
                login(data.data.token, data.data.user);
                playSound('ding');
                pushToast(authMode === 'register' ? 'Welcome! Account created successfully.' : 'Welcome back!', 'success');
              } else {
                const errorMsg = data.error?.message || data.message || 'Authentication failed';
                pushToast(errorMsg, 'error');
              }
            } catch (err) {
              pushToast('Server error. Try again.', 'error');
              console.error('Auth error:', err);
            }
            setAuthLoading(false);
          }}
        />
      ) : (
        <>
          {isDesktop && <TopBar balance={balance} onWalletOpen={() => setWalletOpen(true)} onMyBetsOpen={() => setMyBetsOpen(true)} onMenuOpen={() => setMenuOpen(true)} onLogout={logout} />}
          {isDesktop && <RoundHistoryBar history={history} />}

          <main className={isDesktop ? "layout" : "mobile-layout overflow-hidden h-[100dvh]"}>
            {isDesktop ? (
              <>
                <DesktopSidePanel liveFeed={liveFeed.slice(0, 8)} historyFeed={historyFeed.slice(0, 8)} />

                <div className="flex flex-col flex-1 h-full min-h-0">
                    <div className="flex justify-center my-1.5 flex-shrink-0 w-full px-4">
                      <div className={cn(
                        "relative flex flex-col items-center justify-center w-full max-w-[320px] h-8 rounded bg-[#0f192b] border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300",
                        phase === 'BETTING' ? 'shadow-[0_0_15px_rgba(251,191,36,0.15)]' : 
                        phase === 'LOCKED' ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 
                        'shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      )}>
                        <div className={cn(
                          "flex items-center justify-center gap-2 z-10 font-display font-black text-[11px] uppercase tracking-widest",
                          phase === 'BETTING' ? 'text-[#fbbf24]' : 
                          phase === 'LOCKED' ? 'text-[#ef4444]' : 
                          'text-[#3b82f6]'
                        )}>
                          <span>
                            {phase === 'BETTING' ? 'PLACE YOUR BETS' : phase === 'LOCKED' ? 'WAITING FOR NEXT ROUND' : 'ELEVATOR MOVING'}
                          </span>
                          {phase === 'BETTING' && (
                            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              <span>{timer}s</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress Bar for Betting Phase */}
                        {phase === 'BETTING' && (
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-[#fbbf24] transition-all duration-1000 ease-linear"
                            style={{ width: `${(timer / 15) * 100}%` }}
                          />
                        )}
                        
                        {/* Static Bars for other phases */}
                        {phase === 'LOCKED' && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef4444]/60" />
                        )}
                        {phase === 'MOVING' && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3b82f6]/60" />
                        )}
                      </div>
                    </div>

                  <ElevatorPanel
                    phaseLabel={phaseLabel}
                    phase={phase}
                    timer={timer}
                    currentFloor={currentFloor}
                    activeFloor={activeFloor}
                    roundStops={roundStops}
                    doorOpen={doorOpen}
                    isDesktop={true}
                    balance={balance}
                    mobileHidden={false}
                  />
                </div>

                <section className={cn('controls-right', 'desktop-only')}>
                  <ControlsPanel
                    mode={mode} setMode={onModeChange}
                    quickChips={quickChips} quickAmount={quickAmount}
                    customQuickAmount={customQuickAmount} setCustomQuickAmount={setCustomQuickAmount}
                    onQuickSelect={onQuickSelect} onApplyCustomQuick={onApplyCustomQuick}
                    draftSimpleBets={draftSimpleBets} onToggleSimpleFloor={onFloorClick}
                    placedFloorAmounts={placedFloorAmounts} pairFloors={pairFloors}
                    onTogglePairFloor={onTogglePairFloor} pairAmount={pairAmount} setPairAmount={onPairAmountChange}
                    stake={stake} potentialWin={potentialWin} onClearDraft={clearDraft}
                    onPlaceBet={handlePlaceBet} activeBet={activeBet}
                    autoEnabled={autoEnabled} autoRounds={autoRounds} setAutoRounds={onAutoRoundsChange}
                    autoRoundsLeft={autoRoundsLeft} onToggleAuto={handleToggleAuto}
                    isPlaceBetDisabled={isPlaceBetDisabled} betActionLabel={betActionLabel}
                  />
                </section>
              </>
            ) : (
              <>
                {/* Mobile Game Screen */}
                {mobileTab === 'game' && (
                  <div className={cn('flex', 'flex-col', 'flex-1', 'h-full', 'overflow-hidden')}>
                    
                    <div className="bg-[#0c1524] border-b border-white/5 pb-1 flex-shrink-0">
                      <MobileHeader 
                        balance={balance} 
                        onWalletClick={() => setWalletOpen(true)} 
                        onMenuClick={() => setMenuOpen(true)}
                      />
                      
                      <RoundHistoryBar history={history} />
                    </div>

                    {/* Timer Pill above the Elevator on Mobile */}
                    <div className="flex justify-center my-1.5 flex-shrink-0 w-full px-4">
                      <div className={cn(
                        "relative flex flex-col items-center justify-center w-full max-w-[320px] h-8 rounded bg-[#0f192b] border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300",
                        phase === 'BETTING' ? 'shadow-[0_0_15px_rgba(251,191,36,0.15)]' : 
                        phase === 'LOCKED' ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 
                        'shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      )}>
                        <div className={cn(
                          "flex items-center justify-center gap-2 z-10 font-display font-black text-[11px] uppercase tracking-widest",
                          phase === 'BETTING' ? 'text-[#fbbf24]' : 
                          phase === 'LOCKED' ? 'text-[#ef4444]' : 
                          'text-[#3b82f6]'
                        )}>
                          <span>
                            {phase === 'BETTING' ? 'PLACE YOUR BETS' : phase === 'LOCKED' ? 'WAITING FOR NEXT ROUND' : 'ELEVATOR MOVING'}
                          </span>
                          {phase === 'BETTING' && (
                            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              <span>{timer}s</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress Bar for Betting Phase */}
                        {phase === 'BETTING' && (
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-[#fbbf24] transition-all duration-1000 ease-linear"
                            style={{ width: `${(timer / 15) * 100}%` }}
                          />
                        )}
                        
                        {/* Static Bars for other phases */}
                        {phase === 'LOCKED' && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef4444]/60" />
                        )}
                        {phase === 'MOVING' && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3b82f6]/60" />
                        )}
                      </div>
                    </div>

                    <ElevatorPanel
                      phaseLabel={phaseLabel}
                      phase={phase}
                      timer={timer}
                      currentFloor={currentFloor}
                      activeFloor={activeFloor}
                      roundStops={roundStops}
                      doorOpen={doorOpen}
                      isDesktop={false}
                      balance={balance}
                      mobileHidden={false}
                    />

                    <section className="mobile-controls">
                      <ControlsPanel
                        mode={mode} setMode={onModeChange}
                        quickChips={quickChips} quickAmount={quickAmount}
                        customQuickAmount={customQuickAmount} setCustomQuickAmount={setCustomQuickAmount}
                        onQuickSelect={onQuickSelect} onApplyCustomQuick={onApplyCustomQuick}
                        draftSimpleBets={draftSimpleBets} onToggleSimpleFloor={onFloorClick}
                        placedFloorAmounts={placedFloorAmounts} pairFloors={pairFloors}
                        onTogglePairFloor={onTogglePairFloor} pairAmount={pairAmount} setPairAmount={onPairAmountChange}
                        stake={stake} potentialWin={potentialWin} onClearDraft={clearDraft}
                        onPlaceBet={handlePlaceBet} activeBet={activeBet}
                        autoEnabled={autoEnabled} autoRounds={autoRounds} setAutoRounds={onAutoRoundsChange}
                        autoRoundsLeft={autoRoundsLeft} onToggleAuto={handleToggleAuto}
                        isPlaceBetDisabled={isPlaceBetDisabled} betActionLabel={betActionLabel}
                      />
                    </section>
                  </div>
                )}

                {/* Mobile Live Social Screen */}
                {mobileTab === 'live' && (
                  <section className={cn('mobile-stage', 'h-full', 'overflow-y-auto')}>
                    <h3 className={cn('text-xl', 'font-black', 'text-yellow-400', 'p-4', 'border-b', 'border-white/10', 'bg-slate-900/50', 'flex', 'items-center', 'gap-2')}>
                      <span>📡</span> Live Social Feed
                    </h3>
                    <div className={cn('p-4', 'space-y-3', 'pb-32')}>
                      {liveFeed.length === 0 ? (
                        <div className={cn('py-20', 'text-center', 'text-slate-500', 'italic')}>Connecting to live feed...</div>
                      ) : (
                        liveFeed.map((bet, idx) => (
                          <div key={idx} className={cn('flex', 'items-center', 'justify-between', 'p-4', 'rounded-2xl', 'bg-white/5', 'border', 'border-white/5', 'animate-in', 'fade-in', 'slide-in-from-right-4', 'duration-500')}>
                            <div>
                              <p className={cn('text-sm', 'font-bold', 'text-slate-200', 'uppercase', 'tracking-tighter')}>{bet.user}</p>
                              <p className={cn('text-[10px]', 'text-slate-400', 'italic')}>Placed bet on <span className={cn('text-cyan-400', 'font-semibold')}>{bet.floor}</span></p>
                            </div>
                            <div className="text-right">
                              <p className={cn('text-sm', 'font-black', 'text-yellow-400')}>₹{bet.amount.toLocaleString()}</p>
                              <p className={cn('text-[10px]', 'text-slate-500', 'uppercase', 'tracking-widest')}>Active Bet</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {/* Mobile Personal History Screen */}
                {mobileTab === 'history' && (
                  <section className={cn('mobile-stage', 'h-full', 'overflow-y-auto')}>
                    <h3 className={cn('text-xl', 'font-black', 'text-yellow-400', 'p-4', 'border-b', 'border-white/10', 'bg-slate-900/50', 'flex', 'items-center', 'gap-2')}>
                      <span>📋</span> Bet History
                    </h3>
                    <div className={cn('p-4', 'space-y-3', 'pb-32')}>
                      {personalHistory.length === 0 ? (
                        <div className={cn('py-20', 'text-center', 'text-slate-500', 'italic')}>No bets found. Start playing to see your history!</div>
                      ) : (
                        personalHistory.map((bet: any) => (
                          <div key={bet.id} className={cn('p-4', 'rounded-2xl', 'bg-white/5', 'border', 'border-white/5', 'flex', 'flex-col', 'gap-2')}>
                            <div className={cn('flex', 'items-center', 'justify-between')}>
                              <div className={cn('flex', 'items-center', 'gap-2')}>
                                <span className={cn('text-xs', 'font-bold', 'text-slate-500')}>Round #{bet.round.roundNumber}</span>
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${bet.settlementAmount > 0 ? 'bg-emerald-500/20 text-emerald-400' : (bet.round.status === 'SETTLED' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/20 text-slate-400')}`}>
                                  {bet.settlementAmount > 0 ? 'WIN' : (bet.round.status === 'SETTLED' ? 'LOSE' : 'WAITING')}
                                </span>
                              </div>
                              <span className={cn('text-sm', 'font-black', 'text-white')}>₹{bet.amount.toLocaleString()}</span>
                            </div>
                            <div className={cn('text-xs', 'text-slate-400')}>
                              Mode: <span className="text-slate-200">{bet.betType}</span> |
                              Floors: <span className="text-slate-200">{bet.numbers.join(', ')}</span>
                            </div>
                            {bet.round.status === 'SETTLED' && (
                              <div className={cn('text-[10px]', 'text-slate-500', 'border-t', 'border-white/5', 'pt-2')}>
                                Opened Floors: {bet.round.openingResult?.join(', ') || 'None'}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {/* Mobile Full Screen Wallet Screen */}
                {mobileTab === 'wallet' && (
                  <section className={cn('mobile-stage', 'h-full', 'flex', 'flex-col', 'bg-slate-950')}>
                    <div className={cn('p-4', 'border-b', 'border-white/10', 'bg-slate-900', 'flex', 'items-center', 'justify-between')}>
                      <h3 className={cn('text-xl', 'font-black', 'text-white', 'flex', 'items-center', 'gap-2')}>
                        <span>💳</span> My Wallet
                      </h3>
                    </div>
                    <div className={cn('flex-1', 'overflow-y-auto', 'p-4', 'pb-32')}>
                      <WalletPanel token={authToken || ''} balance={balance} onBalanceChange={setBalance} onLogout={logout} />
                    </div>
                  </section>
                )}
              </>
            )}
          </main>

          {/* Wallet Modal */}
          <WalletModal
            isOpen={walletOpen}
            onClose={() => setWalletOpen(false)}
            token={authToken || ''}
            balance={balance}
            onBalanceChange={setBalance}
            onLogout={logout}
          />

          {/* My Bets Modal */}
          <MyBetsModal
            isOpen={myBetsOpen}
            onClose={() => setMyBetsOpen(false)}
            token={authToken || ''}
          />
          
          {/* Menu Modal */}
          <GameMenuModal
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            user={user}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            musicEnabled={musicEnabled}
            setMusicEnabled={setMusicEnabled}
            animationEnabled={animationEnabled}
            setAnimationEnabled={setAnimationEnabled}
            onMyBetsOpen={() => setMyBetsOpen(true)}
          />
        </>
      )}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}


function AuthForm({ mode, setMode, name, setName, mobile, setMobile, password, setPassword, confirmPassword, setConfirmPassword, loading, onSubmit, pushToast }: any) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setMobile(val);
    }
  };

  const handleSendOtp = () => {
    if (mobile.length !== 10) {
      pushToast('Enter 10-digit mobile first', 'error');
      return;
    }
    setOtpLoading(true);
    // Simulation
    setTimeout(() => {
      setOtpSent(true);
      setOtpLoading(false);
      pushToast('OTP sent to ' + mobile, 'success');
      // Testing Auto-fill
      setTimeout(() => {
        setOtp('123456');
        setIsVerified(true);
        pushToast('Mobile Verified!', 'success');
      }, 1000);
    }, 800);
  };

  const resetOtp = () => {
    setOtpSent(false);
    setOtp('');
    setIsVerified(false);
  };

  return (
    <div className="auth-container">
      <div className={cn('auth-card', 'animate-in', 'fade-in', 'zoom-in', 'duration-500')}>
        <div className={cn('auth-header', 'mb-4')}>
          <h2 className="!text-xl">RoyalBet</h2>
          <p className="!text-xs">{mode === 'login' ? 'Enter the arena' : 'Join the community'}</p>
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <div className={cn('input-group', 'animate-in', 'slide-in-from-top-4')}>
              <input
                type="text"
                className="amount-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                disabled={loading}
              />
            </div>
          )}

          <div className="input-group">
            <div className={cn('flex', 'gap-2')}>
              <div className={cn('relative', 'flex-1')}>
                <span className={cn('absolute', 'left-4', 'top-1/2', '-translate-y-1/2', 'text-slate-500', 'font-bold', 'text-sm')}>+91</span>
                <input
                  type="tel"
                  className={cn('amount-input', '!pl-14')}
                  value={mobile}
                  onChange={handleMobileChange}
                  placeholder="Mobile Number"
                  disabled={loading || (mode === 'register' && otpSent)}
                />
              </div>
              {mode === 'register' && (
                !isVerified ? (
                  <button
                    onClick={handleSendOtp}
                    disabled={otpLoading || mobile.length !== 10}
                    className="otp-btn"
                  >
                    {otpLoading ? '...' : 'Send OTP'}
                  </button>
                ) : (
                  <div className="verified-badge">✓ Verified</div>
                )
              )}
            </div>
          </div>

          {mode === 'register' && otpSent && !isVerified && (
            <div className={cn('input-group', 'animate-in', 'slide-in-from-top-2')}>
              <input
                type="text"
                className="amount-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-Digit OTP"
                disabled={loading}
              />
            </div>
          )}

          <div className="input-group">
            <div className="password-wrapper">
              <input
                type={showPass ? "text" : "password"}
                className={cn('amount-input', '!pr-14')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
              />
              <button type="button" className={cn('password-toggle', '!top-1/2', '!-translate-y-1/2')} onClick={() => setShowPass(!showPass)}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className={cn('input-group', 'animate-in', 'slide-in-from-top-4')}>
              <div className="password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  className={cn('amount-input', '!pr-14')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  disabled={loading}
                />
                <button type="button" className={cn('password-toggle', '!top-1/2', '!-translate-y-1/2')} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <button
            className={cn('primary-btn', 'w-full', '!py-3', '!text-sm', 'mt-2', 'transform', 'active:scale-[0.98]', 'transition-all', 'hover:brightness-110')}
            disabled={loading || (mode === 'register' && !isVerified)}
            onClick={onSubmit}
          >
            {loading ? (
              <span className={cn('flex', 'items-center', 'justify-center', 'gap-2')}>
                <div className={cn('h-4', 'w-4', 'animate-spin', 'rounded-full', 'border-2', 'border-slate-900', 'border-t-transparent')} />
                Processing...
              </span>
            ) : (mode === 'register' && !isVerified ? 'Verify Mobile First' : (mode === 'login' ? 'Enter Casino' : 'Join Now'))}
          </button>

          <div className={cn('auth-footer', '!mt-2')}>
            <p className={cn('auth-link', '!text-xs')}>
              {mode === 'login' ? (
                <>New here? <strong onClick={() => { setMode('register'); resetOtp(); }}>Register</strong></>
              ) : (
                <>Already a member? <strong onClick={() => { setMode('login'); resetOtp(); }}>Login</strong></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
