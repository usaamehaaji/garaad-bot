// =====================================================================
// MARKET ENGINE — Adaptive simulation for ?ef
// 12 rotating states · soft streak balancing · loss recovery
// =====================================================================

const STATES = {
    BULL:        { baseWin: 0.56, label: 'Bull Market',     icon: '🚀', desc: 'Upward trend',           duration: [12, 20] },
    BEAR:        { baseWin: 0.44, label: 'Bear Market',     icon: '🐻', desc: 'Downward pressure',       duration: [12, 20] },
    PANIC:       { baseWin: 0.36, label: 'Market Panic',    icon: '💥', desc: 'Extreme sell-off',        duration: [6, 12]  },
    RALLY:       { baseWin: 0.60, label: 'Rally Mode',      icon: '🚀', desc: 'FOMO buying frenzy',      duration: [8, 14]  },
    VOLATILE:    { baseWin: 0.50, label: 'High Volatility', icon: '⚡', desc: 'Unpredictable swings',    duration: [8, 15]  },
    WHALE:       { baseWin: 0.50, label: 'Whale Activity',  icon: '🐋', desc: 'Large orders moving',     duration: [6, 10]  },
    BREAKOUT:    { baseWin: 0.63, label: 'Breakout',        icon: '📊', desc: 'Key level broken',        duration: [6, 10]  },
    CONSOLIDATE: { baseWin: 0.50, label: 'Consolidation',   icon: '⬜', desc: 'Tight range trading',     duration: [15, 25] },
    OVERBOUGHT:  { baseWin: 0.40, label: 'Overbought',      icon: '🔴', desc: 'Correction incoming',     duration: [8, 14]  },
    OVERSOLD:    { baseWin: 0.58, label: 'Oversold',        icon: '🟢', desc: 'Bounce likely',           duration: [8, 14]  },
    LIQ_SPIKE:   { baseWin: 0.50, label: 'Liquidity Spike', icon: '💫', desc: 'Liquidations cascading',  duration: [4, 8]   },
    MOMENTUM:    { baseWin: 0.52, label: 'Momentum Shift',  icon: '🔄', desc: 'Trend reversing',         duration: [8, 15]  },
};

// Weighted transitions: from current state → next state likelihoods
const TRANSITIONS = {
    BULL:        { BULL:3, BEAR:1, PANIC:0.5, RALLY:2, VOLATILE:1, WHALE:1, BREAKOUT:1, CONSOLIDATE:2, OVERBOUGHT:2, OVERSOLD:0.5, LIQ_SPIKE:0.5, MOMENTUM:1 },
    BEAR:        { BULL:1, BEAR:3, PANIC:2, RALLY:0.5, VOLATILE:1, WHALE:1, BREAKOUT:0.5, CONSOLIDATE:2, OVERBOUGHT:0.5, OVERSOLD:2, LIQ_SPIKE:1, MOMENTUM:1 },
    PANIC:       { BULL:0.5, BEAR:2, PANIC:1, RALLY:1, VOLATILE:2, WHALE:2, BREAKOUT:0.5, CONSOLIDATE:1, OVERBOUGHT:0.5, OVERSOLD:3, LIQ_SPIKE:2, MOMENTUM:2 },
    RALLY:       { BULL:2, BEAR:0.5, PANIC:0.5, RALLY:2, VOLATILE:1, WHALE:1, BREAKOUT:2, CONSOLIDATE:1, OVERBOUGHT:3, OVERSOLD:0.5, LIQ_SPIKE:1, MOMENTUM:1 },
    VOLATILE:    { BULL:1, BEAR:1, PANIC:2, RALLY:1, VOLATILE:2, WHALE:2, BREAKOUT:1, CONSOLIDATE:1, OVERBOUGHT:1, OVERSOLD:1, LIQ_SPIKE:2, MOMENTUM:2 },
    WHALE:       { BULL:1, BEAR:1, PANIC:1, RALLY:1, VOLATILE:2, WHALE:1, BREAKOUT:2, CONSOLIDATE:1, OVERBOUGHT:1, OVERSOLD:1, LIQ_SPIKE:2, MOMENTUM:2 },
    BREAKOUT:    { BULL:2, BEAR:1, PANIC:1, RALLY:2, VOLATILE:2, WHALE:1, BREAKOUT:1, CONSOLIDATE:2, OVERBOUGHT:2, OVERSOLD:1, LIQ_SPIKE:1, MOMENTUM:2 },
    CONSOLIDATE: { BULL:2, BEAR:2, PANIC:1, RALLY:1, VOLATILE:1, WHALE:1, BREAKOUT:2, CONSOLIDATE:2, OVERBOUGHT:1, OVERSOLD:1, LIQ_SPIKE:1, MOMENTUM:1 },
    OVERBOUGHT:  { BULL:1, BEAR:2, PANIC:2, RALLY:0.5, VOLATILE:2, WHALE:1, BREAKOUT:0.5, CONSOLIDATE:2, OVERBOUGHT:1, OVERSOLD:1, LIQ_SPIKE:1, MOMENTUM:2 },
    OVERSOLD:    { BULL:2, BEAR:1, PANIC:1, RALLY:2, VOLATILE:2, WHALE:1, BREAKOUT:1, CONSOLIDATE:2, OVERBOUGHT:1, OVERSOLD:1, LIQ_SPIKE:1, MOMENTUM:2 },
    LIQ_SPIKE:   { BULL:1, BEAR:2, PANIC:3, RALLY:1, VOLATILE:3, WHALE:2, BREAKOUT:1, CONSOLIDATE:1, OVERBOUGHT:1, OVERSOLD:2, LIQ_SPIKE:1, MOMENTUM:2 },
    MOMENTUM:    { BULL:2, BEAR:2, PANIC:1, RALLY:1, VOLATILE:2, WHALE:1, BREAKOUT:2, CONSOLIDATE:1, OVERBOUGHT:1, OVERSOLD:1, LIQ_SPIKE:1, MOMENTUM:1 },
};

// Partially misleading indicator pools per state: [confirming signals, fake/uncertainty signals]
const INDICATORS = {
    BULL:        [['📈 Strong buy pressure', '🟢 Bulls in control', '📊 Uptrend confirmed'],       ['⚠️ Overbought signals forming', '🐻 Bear trap possible']],
    BEAR:        [['📉 Sell wall forming', '🔴 Bears dominating', '❄️ Market cooling'],             ['📈 Oversold bounce signals', '🧠 Smart money accumulating']],
    PANIC:       [['💥 Panic selling detected', '📉 Support broken', '🔴 High sell volume'],        ['📈 Contrarian buy signal', '🐋 Whale buying the dip']],
    RALLY:       [['🔥 FOMO rally in progress', '📈 Strong momentum', '🚀 Breakout confirmed'],     ['⚠️ Overextended rally', '❄️ Cool-down incoming']],
    VOLATILE:    [['⚡ Extreme volatility', '💥 Both sides liquidating', '⚠️ High risk window'],    ['🧠 Smart money accumulating', '📊 Volatility compressing']],
    WHALE:       [['🐋 Whale position opened', '💫 Large order detected', '⚠️ Market manipulation'],['🧠 Retail following whales', '📊 Volume spike']],
    BREAKOUT:    [['📊 Key level broken', '🚀 Momentum building', '📈 Trend acceleration'],          ['⚠️ Fake breakout risk', '🐻 Bull trap possible']],
    CONSOLIDATE: [['⬜ Tight range trading', '📊 Low volatility', '❄️ Market resting'],              ['⚡ Breakout imminent', '🐋 Quiet accumulation']],
    OVERBOUGHT:  [['🔴 RSI overbought', '⚠️ Correction incoming', '📉 Sellers entering'],           ['🔥 Still some FOMO', '📈 One more push possible']],
    OVERSOLD:    [['🟢 RSI oversold', '📈 Bounce expected', '🐋 Smart money buying'],               ['📉 More downside possible', '⚠️ Dead cat bounce risk']],
    LIQ_SPIKE:   [['💥 Liquidations cascading', '⚡ Flash crash in progress', '🔴 Stop hunts active'],['🐋 Market maker reset', '📊 Volatility spike resolving']],
    MOMENTUM:    [['🔄 Trend reversing', '🧠 Momentum shift detected', '📊 New direction forming'], ['⚠️ False reversal risk', '📈 Counter-trend spike']],
};

// ── Global market state ──────────────────────────────────────────────

let currentState   = 'BULL';
let stateFlipCount = 0;
let stateDuration  = 15;

function rollDuration(state) {
    const [min, max] = STATES[state].duration;
    return min + Math.floor(Math.random() * (max - min + 1));
}

function transitionState() {
    const weights = TRANSITIONS[currentState];
    const total   = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand      = Math.random() * total;
    for (const [state, w] of Object.entries(weights)) {
        rand -= w;
        if (rand <= 0) { currentState = state; break; }
    }
    stateFlipCount = 0;
    stateDuration  = rollDuration(currentState);
}

function advanceMarket() {
    stateFlipCount++;
    if (stateFlipCount >= stateDuration) transitionState();
}

function getMarketState() {
    return {
        name:     currentState,
        ...STATES[currentState],
        flipsIn:  stateFlipCount,
        flipsMax: stateDuration,
    };
}

// ── Per-player modifiers ─────────────────────────────────────────────

function streakModifier(d) {
    const w = d.efStreak    || 0;
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
    const last10 = recent.slice(-10);
    const lost    = last10.filter(b => !b.win).reduce((s, b) => s + b.amount, 0);
    const wagered = last10.reduce((s, b) => s + b.amount, 0);
    return wagered > 0 && lost / wagered > 0.30 ? +0.08 : 0;
}

function antiFarmModifier(d) {
    const dayKey = new Date().toISOString().slice(0, 10);
    if (d.efDayKey !== dayKey) return 0;
    return (d.efFlipCount || 0) > 50 ? -0.12 : 0;
}

// ── Indicator picker ─────────────────────────────────────────────────

function pickIndicators(stateName) {
    const pool = INDICATORS[stateName] || INDICATORS.VOLATILE;
    const [truePool, fakePool] = pool;
    const shuffled = [...truePool].sort(() => Math.random() - 0.5);
    const fake     = fakePool[Math.floor(Math.random() * fakePool.length)];
    return [shuffled[0], shuffled[1], fake].filter(Boolean);
}

// ── Player behavioral profile ────────────────────────────────────────

function updatePlayerProfile(d, betAmount, walletBefore) {
    const ratio = walletBefore > 0 ? betAmount / walletBefore : 0;
    const last  = (d.efRecentBets || []).slice(-1)[0]?.amount;
    let profile = 'balanced';
    if (ratio > 0.20 || betAmount > 20000)                              profile = 'high-risk';
    else if (betAmount > 10000)                                         profile = 'aggressive';
    else if (betAmount < 500)                                           profile = 'safe';
    else if (ratio < 0.02)                                              profile = 'conservative';
    else if (last && Math.abs(betAmount - last) / Math.max(last, 1) > 0.5) profile = 'emotional';
    d.efProfile = profile;
}

// ── Main API ─────────────────────────────────────────────────────────

function calculateOutcome(userId, betAmount) {
    const { econData, checkEconUser } = require('./econStore');
    checkEconUser(userId);
    const d = econData[userId];

    let prob = STATES[currentState].baseWin;
    prob += streakModifier(d);
    prob += recoveryModifier(d);
    prob += antiFarmModifier(d);
    prob = Math.max(0.28, Math.min(0.72, prob));

    return {
        win:        Math.random() < prob,
        probability: prob,
        indicators: pickIndicators(currentState),
        stateName:  currentState,
        stateInfo:  STATES[currentState],
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

    updatePlayerProfile(d, betAmount, walletBefore);
    advanceMarket();
}

module.exports = { getMarketState, calculateOutcome, recordFlip, STATES };
