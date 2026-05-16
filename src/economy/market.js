const fs   = require('fs');
const path = require('path');

const MARKET_PATH = path.join(__dirname, '../../data/market.json');
const TICK_MS     = 60 * 1000;       // 1 daqiiqo
const HISTORY_MAX = 10;              // Taariikhda qiimaha (10 daqiiqo)

const BASE_PRICES = {
    btc:     30000,
    gold:    1800,
};

const VOLATILITY = {
    btc:     0.04,
    gold:    0.025,
};

const trends = { btc: 0, gold: 0 };

let marketData = {
    prices:     { ...BASE_PRICES },
    previous:   { ...BASE_PRICES },
    history:    { btc: [], gold: [] },
    lastUpdate: 0,
};

try {
    if (fs.existsSync(MARKET_PATH)) {
        const loaded = JSON.parse(fs.readFileSync(MARKET_PATH, 'utf8'));
        if (loaded && loaded.prices) {
            marketData = {
                prices:     loaded.prices,
                previous:   loaded.previous   || { ...BASE_PRICES },
                history:    loaded.history     || { btc: [], gold: [] },
                lastUpdate: loaded.lastUpdate  || 0,
            };
        }
    }
} catch (e) {
    console.error('[Market] Khalad:', e.message);
}

function saveMarket() {
    try {
        const dir = path.dirname(MARKET_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MARKET_PATH, JSON.stringify(marketData, null, 2));
    } catch (e) {
        console.error('[Market] Khalad keydintiinta:', e.message);
    }
}

function doOneTick() {
    for (const asset of Object.keys(BASE_PRICES)) {
        const prev   = marketData.prices[asset];
        const vol    = VOLATILITY[asset];
        const trend  = trends[asset] || 0;
        const bias   = trend * vol * 0.35;
        const change = (Math.random() * 2 - 1) * vol + bias;
        trends[asset] = change > 0 ? 1 : change < 0 ? -1 : 0;
        const next   = Math.max(
            Math.round(BASE_PRICES[asset] * 0.3),
            Math.round(prev * (1 + change))
        );
        marketData.previous[asset] = prev;
        marketData.prices[asset]   = next;
        marketData.history[asset] ??= [];
        marketData.history[asset].push(next);
        if (marketData.history[asset].length > HISTORY_MAX) {
            marketData.history[asset].shift();
        }
    }
}

function tickMarket() {
    const now      = Date.now();
    const elapsed  = now - marketData.lastUpdate;
    if (elapsed < TICK_MS) return false;

    // Catch-up: advance one tick per missed minute (max 60)
    const ticks = Math.min(60, Math.floor(elapsed / TICK_MS));
    for (let i = 0; i < ticks; i++) doOneTick();

    marketData.lastUpdate = now;
    saveMarket();
    return true;
}

// Wakhtiga ugu dhaw ee isbeddelka
function nextTickSeconds() {
    const elapsed = Date.now() - marketData.lastUpdate;
    return Math.max(0, Math.ceil((TICK_MS - elapsed) / 1000));
}

// Farriinta is-bedelka %
function getPriceChange(asset) {
    const cur  = marketData.prices[asset];
    const prev = marketData.previous[asset] || cur;
    if (!prev || prev === 0) return 0;
    return ((cur - prev) / prev) * 100;
}

// Xarfaha shaxanka yar (sparkline)
function sparkline(asset) {
    const hist = marketData.history[asset];
    if (!hist || hist.length < 2) return '▄▄▄▄▄';
    const min   = Math.min(...hist);
    const max   = Math.max(...hist);
    const range = max - min || 1;
    const bars  = '▁▂▃▄▅▆▇█';
    return hist.map(v => bars[Math.min(7, Math.floor(((v - min) / range) * 7))]).join('');
}

function getPrice(asset) {
    tickMarket();
    return marketData.prices[asset.toLowerCase()] ?? null;
}

function getPrices() {
    tickMarket();
    return { ...marketData.prices };
}

function getMarketSnapshot() {
    tickMarket();
    const assets = Object.keys(BASE_PRICES);
    return assets.map(asset => ({
        asset,
        price:    marketData.prices[asset],
        change:   getPriceChange(asset),
        spark:    sparkline(asset),
    }));
}

module.exports = { getPrice, getPrices, getMarketSnapshot, nextTickSeconds, BASE_PRICES, tickMarket };
