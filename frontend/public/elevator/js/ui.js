const SoundManager = {
    sounds: {
        click: new Audio('sounds/v2/click.mp3'),
        chip: new Audio('sounds/v2/chip.mp3'),
        bet_placed: new Audio('sounds/v2/bet_placed.mp3'),
        clear: new Audio('sounds/v2/clear.mp3'),
        elevator_start: new Audio('sounds/v2/elevator_start.mp3'),
        elevator_ding: new Audio('sounds/v2/elevator_ding.mp3'),
        elevator_ring: new Audio('sounds/v2/elevator_ring.mp3'),
        win: new Audio('sounds/v2/win.mp3'),
        lose: new Audio('sounds/v2/lose.mp3'),
        mode_switch: new Audio('sounds/v2/mode_switch.mp3'),
        tick: new Audio('sounds/v2/tick.mp3')
    },

    init() {
        // Preload sounds and set volumes
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.5;
            sound.load();
        });
        this.sounds.elevator_start.volume = 0.2; // Lower for ambient background
        this.sounds.win.volume = 0.7;
    },

    play(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.warn("Sound play failed:", e));
        }
    }
};

const UI = {
    init() {
        console.log("UI.init: Starting...");
        SoundManager.init();

        // 1. Core Component Rendering
        try {
            this.renderBettingGrid();
            this.renderChipSelection();
            this.renderElevatorIndicators();
        } catch (e) {
            console.error("UI Init - Rendering Error:", e);
        }

        // 2. Event Binding
        try {
            this.bindEvents();
            this.updateTotalBetPreview();
        } catch (e) {
            console.error("UI Init - Binding Error:", e);
        }

        // 3. Logic Modules
        try {
            this.startLiveBetsSimulation();
        } catch (e) {
            console.error("UI Init - Simulation Error:", e);
        }

        // 4. Global Event Listeners
        EventBus.on('TIMER_UPDATE', (time) => this.updateTimer(time));
        EventBus.on('PHASE_CHANGE', (phase) => this.updatePhase(phase));
        EventBus.on('LOGIN_SUCCESS', () => this.updateHeader());
        EventBus.on('WALLET_UPDATE', () => this.updateWallet());
        EventBus.on('SHOW_TOAST', (data) => this.showToast(data));
        EventBus.on('PLAY_SOUND', (name) => SoundManager.play(name));

        // V6 Visual Listeners
        EventBus.on('FLOOR_UPDATE', (floor) => {
            document.querySelectorAll('.floor-indicator-large').forEach(el => el.classList.remove('active-floor-trace'));
            const el = document.getElementById(`indicator-${floor}`);
            if (el) el.classList.add('active-floor-trace');
        });

        EventBus.on('FLOOR_PASSING', (floor) => {
            // Just remove active outline when passing
            const el = document.getElementById(`indicator-${floor}`);
            if (el) {
                el.classList.remove('active-floor-trace');
            }
        });
        EventBus.on('FLOOR_ARRIVED', (floor) => this.highlightFloor(floor));
        EventBus.on('RESET_ELEVATOR', () => this.resetHighlights());

        EventBus.on('HISTORY_UPDATE', () => {
            this.renderHistory();
            this.renderMobileHistory();
        });

        console.log("UI.init: Completed successfully.");
    },

    renderChipSelection() {
        const container = document.getElementById('chip-container');
        if (!container) {
            console.error("chip-container NOT FOUND!");
            return;
        }

        container.innerHTML = '';
        const chips = [10, 50, 100, 500, 1000];

        chips.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'chip-btn aspect-square rounded-full border border-dashed border-white/20 hover:border-gold-500 hover:bg-white/5 flex items-center justify-center font-bold text-[8px] md:text-xs transition-all w-8 h-8 md:w-10 md:h-10';
            btn.dataset.value = val;
            btn.textContent = val >= 1000 ? (val / 1000) + 'k' : val;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('chip-active', 'border-solid', 'bg-gold-500', 'text-black', 'border-gold-500'));
                btn.classList.add('chip-active', 'border-solid', 'bg-gold-500', 'text-black', 'border-gold-500');

                const input = document.getElementById('bet-amount-input');
                if (input) input.value = val;
                State.bets.currentChipValue = val;
                this.updateTotalBetPreview();
            });

            container.appendChild(btn);
        });

        // Select first by default
        if (container.firstChild) container.firstChild.click();
    },

    renderElevatorIndicators() {
        const leftContainer = document.getElementById('indicators-left');
        const rightContainer = document.getElementById('indicators-right');

        if (!leftContainer || !rightContainer) return;

        leftContainer.innerHTML = '';
        rightContainer.innerHTML = '';

        const odds = [11, 9, 7, 5, 3, 1];
        const evens = [12, 10, 8, 6, 4, 2];

        odds.forEach(num => leftContainer.appendChild(this.createIndicator(num)));
        evens.forEach(num => rightContainer.appendChild(this.createIndicator(num)));
    },

    createIndicator(num) {
        const el = document.createElement('div');
        el.className = 'floor-indicator-large w-12 h-10 md:w-16 md:h-12 bg-black/50 border border-white/10 rounded flex items-center justify-center font-bold text-gray-500 text-lg md:text-xl shadow-inner transition-all duration-300';
        el.id = `indicator-${num}`;
        el.textContent = num;
        return el;
    },

    highlightFloor(floor) {
        if (floor === 0) return;
        const el = document.getElementById(`indicator-${floor}`);
        if (!el) return;

        // Remove all previous active outlines
        document.querySelectorAll('.floor-indicator-large').forEach(i => i.classList.remove('active-floor-trace'));

        // Add yellow outline to current floor only
        el.classList.add('active-floor-trace');

        // Add win/loss color if user had a bet on this floor
        const betAmount = State.bets.placedBets[floor];
        if (betAmount && betAmount > 0) {
            el.classList.add('indicator-win'); // Green - User wins
        }
    },


    renderHistory() {
        const container = document.getElementById('history-container');
        if (!container) return;
        container.innerHTML = '';

        State.game.history.forEach((round, index) => {
            const roundEl = document.createElement('div');
            roundEl.className = 'flex items-center gap-2 text-sm text-gray-400';

            const label = document.createElement('span');
            label.className = 'text-gray-400 w-10 flex-shrink-0 font-semibold';
            label.textContent = `R${State.game.history.length - index}:`;
            roundEl.appendChild(label);

            const floorsContainer = document.createElement('div');
            floorsContainer.className = 'flex flex-wrap gap-1.5';

            round.forEach(floor => {
                const floorEl = document.createElement('div');
                floorEl.className = 'w-8 h-8 rounded bg-gray-800 border border-gold-500/40 flex items-center justify-center text-xs font-bold text-white';
                floorEl.textContent = floor;
                floorsContainer.appendChild(floorEl);
            });

            roundEl.appendChild(floorsContainer);
            container.appendChild(roundEl);
        });
    },

    resetHighlights() {
        document.querySelectorAll('.floor-indicator-large').forEach(el => {
            el.classList.remove('active-floor-trace', 'indicator-win', 'indicator-loss');
        });
    },

    renderBettingGrid() {
        const grid = document.getElementById('betting-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 1; i <= 12; i++) {
            const btn = document.createElement('button');
            btn.className = 'floor-bet-btn aspect-square lg:aspect-[4/3] bg-gray-800 border lg:border-2 border-gray-700 rounded-md lg:rounded-lg text-sm lg:text-lg font-bold text-gray-300 hover:border-gold-500 hover:text-white transition-all relative overflow-hidden group flex flex-col items-center justify-center shadow-lg';
            btn.dataset.floor = i;

            btn.innerHTML = `
                <span class="relative z-10 text-lg lg:text-2xl font-black italic">${i}</span>
                <div class="absolute inset-0 bg-gold-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div class="bet-chip absolute top-0 right-0 bg-gradient-to-r from-gold-400 to-yellow-600 text-black text-[7px] lg:text-[10px] rounded-full w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center hidden shadow-sm border border-white/30 font-bold z-20">0</div>
            `;

            btn.addEventListener('click', () => this.handleFloorClick(i, btn));
            grid.appendChild(btn);
        }
    },

    bindEvents() {
        const placeBtn = document.getElementById('place-bet-btn');
        if (placeBtn) {
            placeBtn.addEventListener('click', () => {
                const amountInput = document.getElementById('bet-amount-input');
                const amount = parseInt(amountInput.value);
                if (amount > 0 && State.bets.selectedFloors.size > 0) {
                    this.placeBet(amount);
                }
            });
        }

        const clearBtn = document.getElementById('clear-selection-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection();
                SoundManager.play('clear');
            });
        }

        // Mode Buttons
        const btnStandard = document.getElementById('btn-mode-standard');
        const btnPair = document.getElementById('btn-mode-pair');

        if (btnStandard && btnPair) {
            btnStandard.addEventListener('click', () => {
                // if (State.game.phase !== 'BETTING') return; // Allow viewing modes anytime? Usually better.
                this.setBetMode('STANDARD');
            });

            btnPair.addEventListener('click', () => {
                // if (State.game.phase !== 'BETTING') return;
                this.setBetMode('PAIR');
            });
        }

        // Bet Amount Controls
        const plusBtn = document.getElementById('bet-plus');
        const minusBtn = document.getElementById('bet-minus');
        const amountInput = document.getElementById('bet-amount-input');

        if (plusBtn && minusBtn && amountInput) {
            plusBtn.addEventListener('click', () => {
                let val = parseInt(amountInput.value) || 0;
                val += 10;
                amountInput.value = val;
                this.updateTotalBetPreview();
            });

            minusBtn.addEventListener('click', () => {
                let val = parseInt(amountInput.value) || 0;
                if (val > 10) val -= 10;
                amountInput.value = val;
                this.updateTotalBetPreview();
            });
        }

        // Rounds Buttons
        const rPlusBtn = document.getElementById('rounds-plus');
        const rMinusBtn = document.getElementById('rounds-minus');
        const rInput = document.getElementById('auto-bet-rounds');

        if (rPlusBtn && rMinusBtn && rInput) {
            rPlusBtn.addEventListener('click', () => {
                let val = parseInt(rInput.value) || 0;
                val += 1;
                rInput.value = val;
                if (State.bets.autoBet) State.bets.autoBetRoundsRemaining = val;
            });

            rMinusBtn.addEventListener('click', () => {
                let val = parseInt(rInput.value) || 0;
                if (val > 1) val -= 1;
                rInput.value = val;
                if (State.bets.autoBet) State.bets.autoBetRoundsRemaining = val;
            });
        }

        // Auto Bet
        const autoToggle = document.getElementById('auto-bet-toggle');
        const autoRoundsInput = document.getElementById('auto-bet-rounds');
        const autoKnob = document.getElementById('auto-bet-knob');

        if (autoToggle && autoRoundsInput && autoKnob) {
            autoToggle.addEventListener('click', () => {
                State.bets.autoBet = !State.bets.autoBet;

                if (State.bets.autoBet) {
                    autoToggle.classList.remove('bg-gray-700');
                    autoToggle.classList.add('bg-green-600');
                    autoKnob.classList.add('translate-x-3.5');
                    State.bets.autoBetRoundsRemaining = parseInt(autoRoundsInput.value) || 1;
                } else {
                    autoToggle.classList.add('bg-gray-700');
                    autoToggle.classList.remove('bg-green-600');
                    autoKnob.classList.remove('translate-x-3.5');
                }
            });
        }
    },

    updateTotalBetPreview() {
        const count = State.bets.selectedFloors.size;
        const input = document.getElementById('bet-amount-input');
        const amount = input ? (parseInt(input.value) || 0) : 0;
        const total = count * amount;

        // Calculate potential winnings (1.9x multiplier in standard mode)
        const multiplier = State.bets.mode === 'STANDARD' ? 1.9 : State.bets.selectedFloors.size;
        const potentialWin = total * multiplier;

        const display = document.getElementById('total-bet-display');
        if (display) {
            display.textContent = total > 0 ? `${total} (Win: ${potentialWin.toFixed(0)})` : '0';
        }
    },

    setBetMode(mode) {
        if (State.bets.mode === mode) return; // No sound if clicking same
        State.bets.mode = mode;
        SoundManager.play('mode_switch');

        const btnStandard = document.getElementById('btn-mode-standard');
        const btnPair = document.getElementById('btn-mode-pair');

        const activeClass = "px-2 lg:px-3 py-1 text-[10px] lg:text-xs font-bold rounded-md bg-gold-500 text-black shadow-sm transition-all hover:bg-gold-400";
        const inactiveClass = "px-2 lg:px-3 py-1 text-[10px] lg:text-xs font-bold rounded-md text-gray-400 hover:text-white transition-all";

        if (mode === 'STANDARD') {
            if (btnStandard) btnStandard.className = activeClass;
            if (btnPair) btnPair.className = inactiveClass;
        } else {
            if (btnStandard) btnStandard.className = inactiveClass;
            if (btnPair) btnPair.className = activeClass;
        }

        this.updateTotalBetPreview();
    },

    placeBet(amountPerFloor) {
        // Pair mode validation: minimum 2 floors
        if (State.bets.mode === 'PAIR' && State.bets.selectedFloors.size < 2) {
            alert("PAIR Mode requires at least 2 floors!");
            return;
        }

        const totalBet = State.bets.selectedFloors.size * amountPerFloor; // Renamed to totalBet for clarity
        if (totalBet > State.user.balance) {
            alert("Insufficient Balance!");
            return;
        }

        State.user.balance -= totalBet;
        // Assuming createBetObjects and currentRoundBets are part of State or another module
        // For now, sticking to original State.bets.placedBets structure
        State.bets.selectedFloors.forEach(floor => {
            State.bets.placedBets[floor] = amountPerFloor;
        });

        // Store for autoplay
        State.bets.lastRoundBets = { ...State.bets.placedBets };

        EventBus.emit('WALLET_UPDATE');
        this.clearSelection(); // Use the new clearSelection method
        this.updateBettingGridUI();
        // Assuming showToast is for general messages, not just win/loss
        // this.showToast(`Bet of ${totalBet} placed successfully!`, 'success');
        SoundManager.play('bet_placed');
    },

    clearSelection() {
        State.bets.selectedFloors.clear();
        this.updateBettingGridUI();
    },

    handleFloorClick(floor, btnEl) {
        if (State.game.phase !== 'BETTING') return;

        if (State.bets.selectedFloors.has(floor)) {
            State.bets.selectedFloors.delete(floor);
            SoundManager.play('click'); // Deselect sound
        } else {
            State.bets.selectedFloors.add(floor);
            SoundManager.play('chip'); // Select/Chip sound
        }

        this.updateBettingGridUI();
        this.updateTotalBetPreview();
    },

    updateBettingGridUI() {
        document.querySelectorAll('.floor-bet-btn').forEach(btn => {
            const floor = parseInt(btn.dataset.floor);
            const chipEl = btn.querySelector('.bet-chip');

            // Selection (Active) State
            if (State.bets.selectedFloors.has(floor)) {
                btn.classList.add('border-gold-500', 'text-white');
            } else {
                btn.classList.remove('border-gold-500', 'text-white');
            }

            // Bet Placed Display
            if (State.bets.placedBets[floor]) {
                chipEl.textContent = State.bets.placedBets[floor];
                chipEl.classList.remove('hidden');
            } else {
                chipEl.classList.add('hidden');
            }
        });
    },

    updatePhase(phase) {
        const statusEl = document.getElementById('status-text');
        if (!statusEl) return;

        if (phase === 'BETTING') {
            statusEl.textContent = 'BETTING';
            statusEl.className = 'text-green-400 font-bold tracking-widest text-[10px] lg:text-xs uppercase w-20 text-center';
        } else if (phase === 'RUNNING') {
            statusEl.textContent = 'RUNNING';
            statusEl.className = 'text-cyan-400 font-bold tracking-widest text-[10px] lg:text-xs uppercase w-20 text-center';
        } else if (phase === 'BUFFER') {
            statusEl.textContent = 'BUFFER';
            statusEl.className = 'text-yellow-400 font-bold tracking-widest text-[10px] lg:text-xs uppercase w-20 text-center';
        }
    },

    updateTimer(time) {
        const timerEl = document.getElementById('main-timer');
        if (timerEl) {
            timerEl.textContent = time;
            if (time <= 5 && time > 0 && State.game.phase === 'BETTING') {
                SoundManager.play('tick');
                timerEl.classList.add('text-red-500', 'scale-110');
            } else {
                timerEl.classList.remove('text-red-500', 'scale-110');
            }
        }
    },

    updateWallet() {
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) balanceEl.textContent = State.user.balance.toFixed(0);
    },

    updateHeader() {
        // No username element in current HTML, just update wallet
        this.updateWallet();
    },

    showToast(data, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        // Handle Object Input (from App.js SHOW_TOAST event)
        let message = data;
        let msgType = type;

        if (typeof data === 'object' && data !== null) {
            if (data.amount) {
                message = `Win! +${data.amount} Coins (Flr ${data.floor})`;
                msgType = 'win';
            } else if (data.message) {
                message = data.message;
                if (data.type) msgType = data.type;
            }
        }

        const toast = document.createElement('div');
        // Different styles for success/error/info
        let bgClass = 'bg-gray-800 border-gray-600';
        let icon = 'fa-info-circle';

        if (msgType === 'success' || msgType === 'win') {
            bgClass = 'bg-gradient-to-r from-green-600 to-emerald-700 border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
            icon = 'fa-trophy';
            SoundManager.play('win');
        } else if (msgType === 'error' || msgType === 'loss') {
            bgClass = 'bg-gradient-to-r from-red-600 to-rose-700 border-red-500';
            icon = 'fa-circle-xmark';
            SoundManager.play('lose');
        } else if (msgType === 'warning') {
            bgClass = 'bg-yellow-600 border-yellow-500';
            icon = 'fa-triangle-exclamation';
        }

        toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg border text-white shadow-xl transform transition-all duration-300 translate-y-10 opacity-0 ${bgClass}`;
        toast.innerHTML = `
            <i class="fa-solid ${icon} text-xl"></i>
            <span class="font-bold text-sm text-balance">${message}</span>
        `;

        container.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });

        // Animate Out & Remove
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    startLiveBetsSimulation() {
        const container = document.getElementById('live-bets-container-desktop');
        if (!container) return;

        const names = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
        const floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        setInterval(() => {
            const name = names[Math.floor(Math.random() * names.length)];
            const floor = floors[Math.floor(Math.random() * floors.length)];
            const amount = [10, 50, 100, 500][Math.floor(Math.random() * 4)];

            // Desktop Card
            const betCard = document.createElement('div');
            betCard.className = 'bg-gray-800/50 border border-white/5 rounded-lg p-2 text-[10px] flex items-center gap-2 opacity-0 transition-opacity duration-500';
            betCard.innerHTML = `
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-black font-bold text-[8px]">${name[0]}</div>
                <div class="flex-1">
                    <div class="text-white font-semibold">${name}</div>
                    <div class="text-gray-400">Floor ${floor} · ₹${amount}</div>
                </div>
            `;

            // Mobile Compact Item
            const mobileContainer = document.getElementById('live-bets-container-mobile');
            if (mobileContainer) {
                const mobileItem = document.createElement('div');
                mobileItem.className = 'flex justify-between text-[9px] text-gray-400 border-b border-white/5 pb-1 opacity-0 transition-opacity duration-300';
                mobileItem.innerHTML = `
                    <span>${name}</span>
                    <span class="text-gold-500">Floor ${floor}</span>
                    <span class="text-white">₹${amount}</span>
                `;
                mobileContainer.insertBefore(mobileItem, mobileContainer.firstChild);
                setTimeout(() => mobileItem.classList.remove('opacity-0'), 10);
                if (mobileContainer.children.length > 5) {
                    mobileContainer.removeChild(mobileContainer.lastChild);
                }
            }

            container.insertBefore(betCard, container.firstChild);
            setTimeout(() => betCard.classList.remove('opacity-0'), 10);

            if (container.children.length > 20) {
                container.removeChild(container.lastChild);
            }
        }, 2000);
    },

    renderMobileHistory() {
        const container = document.getElementById('mobile-history-row');
        if (!container) return;
        container.innerHTML = '';

        // Take last 5 rounds for compact view
        const recent = State.game.history.slice(0, 5);
        recent.forEach(round => {
            // Just showing the first winning floor of the round for compactness
            if (round.length > 0) {
                const ball = document.createElement('div');
                ball.className = 'w-4 h-4 rounded-full bg-gray-700/80 border border-gray-600 flex items-center justify-center text-[8px] font-bold text-gray-300';
                ball.textContent = round[0];
                container.appendChild(ball);
            }
        });
    }
};
