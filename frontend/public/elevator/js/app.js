// Main App Entry
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Initializing App Modules...");
        Auth.init();
        Elevator.init();
        UI.init();

        // Slight delay to ensure DOM is fully ready and listeners bound
        setTimeout(() => {
            console.log("Booting Game Loop...");
            startGameLoop();
        }, 500);
    } catch (e) {
        console.error("CRITICAL INIT ERROR:", e);
    }
});

let gameLoopTimer = null;

function startGameLoop() {
    console.log("Starting Game Loop - Force Phase Reset");
    setPhase('BETTING');
}

function setPhase(phase) {
    console.log(`Setting Phase: ${phase}`);
    State.game.phase = phase;

    // safe emit
    try { EventBus.emit('PHASE_CHANGE', phase); } catch (e) { console.error(e); }

    // Clear existing timer if any
    if (gameLoopTimer) {
        clearInterval(gameLoopTimer);
        gameLoopTimer = null;
    }

    if (phase === 'BETTING') {
        try { EventBus.emit('RESET_ELEVATOR'); } catch (e) { console.warn("Reset Elevator error:", e); }

        // Auto Bet Logic (Guarded)
        try {
            if (State.bets.autoBet && State.bets.lastRoundBets) {
                // Check rounds
                if (State.bets.autoBetRoundsRemaining > 0) {
                    State.bets.autoBetRoundsRemaining--;
                    const roundsInput = document.getElementById('auto-bet-rounds');
                    if (roundsInput) roundsInput.value = State.bets.autoBetRoundsRemaining;

                    if (State.bets.autoBetRoundsRemaining === 0) {
                        State.bets.autoBet = false;
                        // UI update for toggle handled by its state usually, but let's be safe
                        EventBus.emit('SHOW_TOAST', { amount: 0, floor: "Auto Bet Finished" });
                    }

                    const lastBets = State.bets.lastRoundBets;
                    let totalNeeded = 0;
                    Object.values(lastBets).forEach(amt => totalNeeded += amt);

                    if (State.user.balance >= totalNeeded) {
                        State.user.balance -= totalNeeded;
                        // Use a fresh copy of lastRoundBets to ensure independent state
                        State.bets.placedBets = { ...lastBets };
                        State.bets.lastRoundBets = { ...lastBets };
                        EventBus.emit('WALLET_UPDATE');
                        // Ensure UI reflects the re-placed bets
                        setTimeout(() => {
                            UI.updateBettingGridUI();
                            // Trigger the visual chips/rings for auto-bet
                            Object.keys(State.bets.placedBets).forEach(f => {
                                const btn = document.querySelector(`.floor-bet-btn[data-floor="${f}"]`);
                                if (btn) {
                                    const chip = btn.querySelector('.bet-chip');
                                    const val = State.bets.placedBets[f];
                                    chip.textContent = val >= 1000 ? (val / 1000).toFixed(1).replace('.0', '') + 'k' : val;
                                    chip.classList.remove('hidden');
                                    btn.classList.add('ring-2', 'ring-gold-500', 'ring-offset-2', 'ring-offset-gray-900');
                                }
                            });
                        }, 100);
                    } else {
                        State.bets.autoBet = false;
                        EventBus.emit('SHOW_TOAST', { amount: 0, floor: "Insufficient Balance" });
                    }
                } else {
                    State.bets.autoBet = false;
                }
            }
        } catch (e) {
            console.error("Auto Bet Error:", e);
        }

        runTimer(State.CONSTANTS.BETTING_TIME, () => setPhase('LOCKED'));

    } else if (phase === 'LOCKED') {
        runTimer(State.CONSTANTS.LOCKED_TIME, () => {
            try {
                // Generate Random Stops 
                const numStops = Math.floor(Math.random() * 3) + 2; // 2-4
                const stops = new Set();
                while (stops.size < numStops) {
                    stops.add(Math.floor(Math.random() * 12) + 1);
                }
                const sortedStops = Array.from(stops).sort((a, b) => a - b);
                State.game.targetFloorsQueue = sortedStops;
                console.log("Round Stops:", sortedStops);

                setPhase('MOVING');
            } catch (e) {
                console.error("Error generating stops:", e);
                setPhase('BETTING'); // Recover
            }
        });

    } else if (phase === 'MOVING') {
        try {
            EventBus.emit('PROCESS_STOPS', State.game.targetFloorsQueue);
        } catch (e) {
            console.error("Error processing stops:", e);
            setPhase('BUFFER');
        }
    } else if (phase === 'BUFFER') {
        runTimer(State.CONSTANTS.BUFFER_TIME, () => {
            setPhase('BETTING');
        });
    }
}

// ... Listeners ...
EventBus.on('FLOOR_ARRIVED', (floor) => {
    // Track current round stops
    if (!State.game.currentRoundStops) State.game.currentRoundStops = [];
    State.game.currentRoundStops.push(floor);

    // Standard Mode Payout (Immediate)
    if (State.bets.mode === 'STANDARD') {
        if (State.bets.placedBets[floor]) {
            const betAmount = State.bets.placedBets[floor];
            const multiplier = 1 + State.CONSTANTS.PAYOUT_STANDARD_PROFIT;
            const payout = betAmount * multiplier;

            State.user.balance += payout;
            EventBus.emit('WALLET_UPDATE');
            EventBus.emit('SHOW_TOAST', { amount: payout, floor: floor });
        }
    } else {
        // PAIR MODE: We track hits and payout at the end
        if (State.bets.placedBets[floor]) {
            if (!State.game.currentSessionHits) State.game.currentSessionHits = 0;
            State.game.currentSessionHits++;
        }
    }
});

EventBus.on('SEQUENCE_COMPLETE', () => {
    // Logic for Pair Mode Final Payout (Strict All-or-Nothing)
    if (State.bets.mode === 'PAIR') {
        const totalFloorsBetOn = Object.keys(State.bets.lastRoundBets || {}).length;
        const hits = State.game.currentSessionHits || 0;

        // Condition: MUST hit ALL selected floors
        if (hits > 0 && hits === totalFloorsBetOn) {
            let totalBetOnHitFloors = 0;
            Object.values(State.bets.lastRoundBets).forEach(amt => totalBetOnHitFloors += amt);

            // Payout: Total Bet * Num Hits
            const finalPayout = totalBetOnHitFloors * hits;

            if (finalPayout > 0) {
                State.user.balance += finalPayout;
                EventBus.emit('WALLET_UPDATE');
                EventBus.emit('SHOW_TOAST', { amount: finalPayout, floor: "ALL HIT! x" + hits });
            }
        }
    }

    // Add current round to history
    if (State.game.currentRoundStops && State.game.currentRoundStops.length > 0) {
        State.game.history.unshift([...State.game.currentRoundStops]);
        if (State.game.history.length > 10) State.game.history.pop();
        EventBus.emit('HISTORY_UPDATE');
    }

    // Show RED for all floors where user bet but didn't win
    Object.keys(State.bets.placedBets).forEach(f => {
        const floor = parseInt(f);
        const el = document.getElementById(`indicator-${floor}`);
        if (el && !el.classList.contains('indicator-win')) {
            el.classList.add('indicator-loss'); // Red - User loses
        }
    });

    // Reset session data
    State.game.currentSessionHits = 0;
    State.game.currentRoundStops = [];
    // CRITICAL: We clear placedBets but KEEP lastRoundBets for autoplay restoration
    State.bets.placedBets = {};
    State.bets.selectedFloors.clear();
    setPhase('BUFFER');
});

function runTimer(seconds, callback) {
    if (gameLoopTimer) clearInterval(gameLoopTimer);

    let timeLeft = seconds;
    EventBus.emit('TIMER_UPDATE', timeLeft);

    gameLoopTimer = setInterval(() => {
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(gameLoopTimer);
            gameLoopTimer = null;
            return;
        }

        EventBus.emit('TIMER_UPDATE', timeLeft);

        if (timeLeft === 0) {
            clearInterval(gameLoopTimer);
            gameLoopTimer = null;
            if (callback) callback();
        }
    }, 1000);
}
