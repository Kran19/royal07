// Replace the renderHistory function in ui.js with this:

renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    container.innerHTML = '';

    // Show last 10 rounds (each round shows all floors)
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
}
