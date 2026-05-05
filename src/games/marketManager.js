// =====================================================================
// GARAAD BOT - Market Manager
// =====================================================================

const { SOS_BASE_RATE, SOS_VOLATILITY, SECRET_DAY_CHANCE, SECRET_DAY_MULTIPLIER, MARKET_UPDATE_MS } = require('../config');

const marketState = {
    btcPrice: 27500,
    eurPrice: 1.12,
    goldPrice: 2350, // per oz (approx index)
    matPrice: 50,    // materials index (abstract)
    baseSosRate: SOS_BASE_RATE,
    sosRate: SOS_BASE_RATE,
    secretDay: false,
    lastUpdated: Date.now(),
    trend: { BTC: 0, EUR: 0, GOLD: 0, MAT: 0, SOS: 0 },
};

function round(value, digits = 2) {
    return Number(value.toFixed(digits));
}

function randomPercent(max = SOS_VOLATILITY) {
    return (Math.random() * 2 - 1) * max;
}

function refreshMarket() {
    const now = Date.now();
    const oldBtc = marketState.btcPrice;
    const oldEur = marketState.eurPrice;
    const oldGold = marketState.goldPrice;
    const oldMat = marketState.matPrice;
    const oldSos = marketState.sosRate;

    marketState.btcPrice = Math.max(1000, oldBtc * (1 + randomPercent()));
    marketState.eurPrice = Math.max(0.5, oldEur * (1 + randomPercent(0.01)));
    // GOLD: low volatility
    marketState.goldPrice = Math.max(200, oldGold * (1 + randomPercent(0.005)));
    // Materials index: higher volatility
    marketState.matPrice = Math.max(1, oldMat * (1 + randomPercent(0.03)));
    marketState.baseSosRate = Math.max(100, marketState.baseSosRate * (1 + randomPercent(0.02)));

    marketState.secretDay = Math.random() < SECRET_DAY_CHANCE || new Date().getDay() === 5;
    marketState.sosRate = marketState.secretDay
        ? marketState.baseSosRate * SECRET_DAY_MULTIPLIER
        : marketState.baseSosRate;

    marketState.trend.BTC  = round(marketState.btcPrice - oldBtc, 2);
    marketState.trend.EUR  = round(marketState.eurPrice - oldEur, 4);
    marketState.trend.GOLD = round(marketState.goldPrice - oldGold, 2);
    marketState.trend.MAT  = round(marketState.matPrice - oldMat, 2);
    marketState.trend.SOS = round(marketState.sosRate - oldSos, 2);
    marketState.lastUpdated = now;
    return marketState;
}

function getMarketState() {
    const elapsed = Date.now() - marketState.lastUpdated;
    if (elapsed >= MARKET_UPDATE_MS) {
        refreshMarket();
    }
    return marketState;
}

function getMarketSummary() {
    const state = getMarketState();
    const mood = state.secretDay ? 'Secret High-Value Day' : 'Normal Day';
    const icon = state.secretDay ? '🚀' : (state.trend.SOS > 0 ? '📈' : '📉');
    return {
        btcPrice: round(state.btcPrice, 2),
        eurPrice: round(state.eurPrice, 4),
        goldPrice: round(state.goldPrice, 2),
        matPrice: round(state.matPrice, 2),
        sosRate: round(state.sosRate, 2),
        mood,
        icon,
        trend: state.trend,
        lastUpdated: state.lastUpdated,
    };
}

function initializeMarket() {
    refreshMarket();
    setInterval(refreshMarket, MARKET_UPDATE_MS);
    return marketState;
}

module.exports = { getMarketState, getMarketSummary, initializeMarket };
