const Elevator = {
    floorDisplay: null,
    queue: [],

    // Direction Indicators
    upArrow: null,
    downArrow: null,

    init() {
        this.floorDisplay = document.getElementById('elevator-floor-display');
        this.upArrow = document.getElementById('direction-indicator-up');
        this.downArrow = document.getElementById('direction-indicator-down');

        EventBus.on('PROCESS_STOPS', (stops) => {
            // Sort stops 
            this.queue = stops.sort((a, b) => a - b);
            this.processQueue();
        });

        EventBus.on('RESET_ELEVATOR', () => {
            this.updateDisplay(0);
        });
    },

    async processQueue() {
        // V6 Logic: Traverse 1 to 12.
        const stops = new Set(this.queue);

        for (let f = 1; f <= 12; f++) {
            // Force start from G (0) if we are at beginning of round
            if (f === 1) {
                this.updateDisplay(0);
                State.game.currentFloor = 0;
                EventBus.emit('FLOOR_UPDATE', 0);
                await new Promise(r => setTimeout(r, 800));
            }

            // Move to f
            await this.simulateMovement(f);

            // If f is in stops, Open Doors
            if (stops.has(f)) {
                EventBus.emit('FLOOR_ARRIVED', f);
                // Highlight happens via listener or here? 
                // Let's rely on listener or do simple class toggle
                this.floorDisplay.classList.add('text-gold-500');
                this.openDoors();

                // Wait for door cycle (4s)
                await new Promise(r => setTimeout(r, 4000));

                this.closeDoors();
                this.floorDisplay.classList.remove('text-gold-500');

                // Slight pause before resuming
                await new Promise(r => setTimeout(r, 800));
            } else {
                // Just passing through
                EventBus.emit('FLOOR_PASSING', f);
                // Pause slightly to let the user see "It passed floor X"
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // End of Line (12)
        EventBus.emit('SEQUENCE_COMPLETE');

        // Reset to G delayed
        setTimeout(() => {
            // this.updateDisplay(0); 
        }, 2000);
    },

    simulateMovement(targetFloor) {
        return new Promise(resolve => {
            const currentFloor = State.game.currentFloor;
            if (currentFloor === targetFloor) {
                resolve();
                return;
            }

            const direction = targetFloor > currentFloor ? 1 : -1;
            this.setDirectionUI(direction);

            let current = currentFloor;
            // SLOW DOWN: 1200ms per floor transition visual
            const speed = 1200;

            const interval = setInterval(() => {
                current += direction;
                this.updateDisplay(current);
                State.game.currentFloor = current;
                EventBus.emit('FLOOR_UPDATE', current);

                if (current === targetFloor) {
                    clearInterval(interval);
                    resolve();
                }
            }, speed);
        });
    },

    updateDisplay(floor) {
        this.floorDisplay.textContent = floor === 0 ? 'G' : floor;
    },

    setDirectionUI(dir) {
        if (dir === 1) {
            this.upArrow.classList.add('text-red-500', 'animate-pulse');
            this.upArrow.querySelector('i').classList.remove('text-gray-800');

            this.downArrow.classList.remove('text-red-500', 'animate-pulse');
            this.downArrow.querySelector('i').classList.add('text-gray-800');
        } else if (dir === -1) {
            this.downArrow.classList.add('text-red-500', 'animate-pulse');
            this.downArrow.querySelector('i').classList.remove('text-gray-800');

            this.upArrow.classList.remove('text-red-500', 'animate-pulse');
            this.upArrow.querySelector('i').classList.add('text-gray-800');
        } else {
            // Stop
            this.upArrow.classList.remove('text-red-500', 'animate-pulse');
            this.upArrow.querySelector('i').classList.add('text-gray-800');
            this.downArrow.classList.remove('text-red-500', 'animate-pulse');
            this.downArrow.querySelector('i').classList.add('text-gray-800');
        }
    },

    openDoors() {
        const leftDoor = document.getElementById('door-left');
        if (leftDoor && leftDoor.parentElement) {
            leftDoor.parentElement.classList.add('doors-open');
            EventBus.emit('PLAY_SOUND', 'elevator_ring');
        }
    },

    closeDoors() {
        document.getElementById('door-left').parentElement.classList.remove('doors-open');
    }
};
