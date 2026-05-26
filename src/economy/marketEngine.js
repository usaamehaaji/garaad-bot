// =====================================================================
// MARKET ENGINE — Dynamic time-based market states for ?ef
// 6 states · auto-transitions · MongoDB persistence
// =====================================================================

const STATES = {
    UP:       { baseWin: 0.65, label: 'Rising',   icon: '📈', desc: 'Market rising',      minDur: 30,  maxDur: 90  },
    DOWN:     { baseWin: 0.30, label: 'Falling',  icon: '📉', desc: 'Market falling',     minDur: 30,  maxDur: 90  },
    SPIKE:    { baseWin: 0.80, label: 'Spike',    icon: '🚀', desc: 'Price spike!',       minDur: 10,  maxDur: 25  },
    CRASH:    { baseWin: 0.10, label: 'Crash',    icon: '⚠️', desc: 'Market crash!',     minDur: 10,  maxDur: 25  },
    STABLE:   { baseWin: 0.50, label: 'Stable',   icon: '⬜', desc: 'Tight range',        minDur: 60,  maxDur: 120 },
    RECOVERY: { baseWin: 0.55, label: 'Recovery', icon: '🔄', desc: 'Recovering',         minDur: 45,  maxDur: 90  },
};

// Natural weighted transitions — SPIKE/CRASH are brief and non-repeating
const TRANSITIONS = {
    UP:       { DOWN: 2, SPIKE: 2, STABLE: 2, RECOVERY: 1 },
    DOWN:     { UP: 1, CRASH: 2, STABLE: 2, RECOVERY: 2 },
    SPIKE:    { DOWN: 3, STABLE: 2, CRASH: 1 },
    CRASH:    { RECOVERY: 4, STABLE: 2 },
    STABLE:   { UP: 2, DOWN: 2, SPIKE: 0.5, CRASH: 0.5, RECOVERY: 1 },
    RECOVERY: { UP: 3, STABLE: 2, DOWN: 1 },
};

let currentState   = 'STABLE';
let stateChangedAt = Date.now();
let _timer         = null;

// ── Transitions ──────────────────────────────────────────────────────

function pickNextState() {
    const weights = TRANSITIONS[currentState] || TRANSITIONS.STABLE;
    const total   = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (const [state, w] of Object.entries(weights)) {
        rand -= w;
        if (rand <= 0) return state;
    }
    return 'STABLE';
}

function transitionState() {
    const next = pickNextState();
    currentState   = next;
    stateChangedAt = Date.now();
    console.log(`[Market] → ${next} (${STATES[next].label})`);
    saveMarketState();
}

function scheduleTransition() {
    if (_timer) clearTimeout(_timer);
    const s = STATES[currentState] || STATES.STABLE;
    const delay = (s.minDur + Math.random() * (s.maxDur - s.minDur)) * 1000;
    _timer = setTimeout(() => {
        transitionState();
        scheduleTransition();
    }, delay);
}

function startMarketEngine() {
    scheduleTransition();
    console.log(`[Market] ✅ Engine started — state: ${currentState}`);
}

// ── Persistence ──────────────────────────────────────────────────────

async function saveMarketState() {
    try {
        const { getDB } = require('../db');
        const db = getDB();
        if (!db) return;
        await db.collection('market').updateOne(
            { _id: 'state' },
            { $set: { state: currentState, changedAt: stateChangedAt } },
            { upsert: true }
        );
    } catch (e) { console.error('[Market] Save error:', e.message); }
}

async function loadMarketState() {
    try {
        const { getDB } = require('../db');
        const db = getDB();
        if (!db) return;
        const doc = await db.collection('market').findOne({ _id: 'state' });
        if (doc && doc.state && STATES[doc.state]) {
            currentState   = doc.state;
            stateChangedAt = doc.changedAt || Date.now();
            console.log(`[Market] ✅ Restored state: ${currentState} (${STATES[currentState].label})`);
        }
    } catch (e) { console.error('[Market] Load error:', e.message); }
}

// ── State query ──────────────────────────────────────────────────────

function getMarketState() {
    const s        = STATES[currentState] || STATES.STABLE;
    const elapsed  = Math.floor((Date.now() - stateChangedAt) / 1000);
    return { name: currentState, ...s, elapsed };
}

// ── Per-player modifiers ─────────────────────────────────────────────

function streakModifier(d) {
    const w = d.efStreak     || 0;
    const l = d.efLoseStreak || 0;
    if (w >= 4) return -0.15;
    if (w >= 3) return -0.09;
    if (w >= 2) return -0.04;
    if (l >= 4) return +0.12;
    if (l >= 3) return +0.07;
    if (l >= 2) return +0.03;
    return 0;
}

function recoveryModifier(d) {
    const recent = d.efRecentBets || [];
    if (recent.length < 5) return 0;
    const last10   = recent.slice(-10);
    const lost     = last10.filter(b => !b.win).reduce((s, b) => s + b.amount, 0);
    const wagered  = last10.reduce((s, b) => s + b.amount, 0);
    return wagered > 0 && lost / wagered > 0.30 ? +0.08 : 0;
}

function antiFarmModifier(d) {
    const dayKey = new Date().toISOString().slice(0, 10);
    if (d.efDayKey !== dayKey) return 0;
    return (d.efFlipCount || 0) > 50 ? -0.12 : 0;
}

// ── Main outcome calculation ─────────────────────────────────────────

function calculateOutcome(userId, betAmount) {
    const { econData, checkEconUser } = require('./econStore');
    checkEconUser(userId);
    const d = econData[userId];

    let prob = (STATES[currentState] || STATES.STABLE).baseWin;
    prob += streakModifier(d);
    prob += recoveryModifier(d);
    prob += antiFarmModifier(d);
    prob = Math.max(0.08, Math.min(0.85, prob));

    return {
        win:         Math.random() < prob,
        probability: prob,
        stateName:   currentState,
        stateInfo:   STATES[currentState] || STATES.STABLE,
    };
}

function recordFlip(userId, betAmount, win, walletBefore) {
    const { econData, checkEconUser } = require('./econStore');
    checkEconUser(userId);
    const d = econData[userId];

    if (win) { d.efStreak = (d.efStreak || 0) + 1; d.efLoseStreak = 0; }
    else      { d.efLoseStreak = (d.efLoseStreak || 0) + 1; d.efStreak = 0; }

    const dayKey = new Date().toISOString().slice(0, 10);
    if (d.efDayKey !== dayKey) { d.efDayKey = dayKey; d.efFlipCount = 0; }
    d.efFlipCount = (d.efFlipCount || 0) + 1;

    d.efRecentBets = d.efRecentBets || [];
    d.efRecentBets.push({ amount: betAmount, win, ts: Date.now() });
    if (d.efRecentBets.length > 10) d.efRecentBets.shift();
}

module.exports = { getMarketState, calculateOutcome, recordFlip, startMarketEngine, loadMarketState, STATES };
