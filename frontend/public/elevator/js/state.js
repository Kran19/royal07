const State = {
    // User Data
    user: {
        isLoggedIn: false,
        mobile: null,
        balance: 10000.00, // Initial Mock Balance
        username: 'Player 1'
    },

    // Game Loop State
    game: {
        phase: 'BETTING', // BETTING, LOCKED, MOVING
        timer: 30,
        currentFloor: 0, // 0 = G
        targetFloorsQueue: [], // Array of stops
        history: [], // Last 10 rounds (each round is array of stops)
        currentRoundStops: [], // Current round's stops
    },

    // Betting State
    bets: {
        selectedFloors: new Set(),
        currentChipValue: 10,
        placedBets: {}, // Map of floor -> amount

        // V5 New Fields
        mode: 'STANDARD', // 'STANDARD' or 'PAIR'
        autoBet: false,   // Toggle
        autoBetRoundsRemaining: 0,
        lastRoundBets: null // Object { floor: amount } to restore
    },

    // Constants
    CONSTANTS: {
        BETTING_TIME: 30,
        LOCKED_TIME: 5,
        BUFFER_TIME: 10,
        FLOORS: 13,
        PAYOUT_STANDARD_PROFIT: 0.9,
        PAYOUT_PAIR_PROFIT: 3.0
    }
};

// Event Bus
const EventBus = {
    listeners: {},
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },
    emit(event, data) {
        // console.log(`EventBus: Emitting ${event}`, data); 
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`Error in listener for ${event}:`, e);
                }
            });
        }
    }
};
