// Countdown timer management
const state = { countdownIntervals: [] };

const CountdownManager = {
    clearAll() { state.countdownIntervals.forEach(entry => clearInterval(entry.interval)); state.countdownIntervals = []; },
    register(id, interval) { state.countdownIntervals.push({ id, interval }); },
    remove(id) { state.countdownIntervals = state.countdownIntervals.filter(entry => entry.id !== id); },
    getState() { return state; }
};

window.addEventListener('beforeunload', () => CountdownManager.clearAll());

export { CountdownManager };
