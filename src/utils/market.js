// =====================================================================
// SUUQA — Qiimaha BTC, EUR, GOLD, SOS (beddelmaan saacad kasta)
// =====================================================================

const SOS_PER_USD = 23_000; // 1 USD ≈ 23,000 SOS (base rate)

function seedAt(hourOffset) {
    const h = Math.floor(Date.now() / (1000 * 60 * 60 * 5)) + hourOffset; // 5 saacadood kasta
    const x = Math.sin(h * 9301 + 49297) * 233280;
    return x - Math.floor(x);
}

function assetBaseAt(asset, offset) {
    const s = seedAt(offset);
    const s2 = seedAt(offset + 7);
    const s3 = seedAt(offset + 13);
    if (asset === 'BTC')  return Math.round(40000 + (s * 2 - 1) * 7000);
    if (asset === 'EUR')  return parseFloat((1.10 + (s2 * 2 - 1) * 0.07).toFixed(4));
    if (asset === 'GOLD') return Math.round(2000 + (s3 * 2 - 1) * 250);
    if (asset === 'SOS')  return parseFloat((SOS_PER_USD + (s * 2 - 1) * 800).toFixed(0));
    return 0;
}

/** Qiimaha hadda */
function getPrices() {
    return {
        BTC:  assetBaseAt('BTC', 0),
        EUR:  assetBaseAt('EUR', 0),
        GOLD: assetBaseAt('GOLD', 0),
        SOS:  assetBaseAt('SOS', 0), // SOS/USD rate (1 USD = X SOS)
    };
}

/** Taariikh 7 saacadood (ugu horeeyay → hadda) */
function getPriceHistory(asset, count = 7) {
    const arr = [];
    for (let i = -(count - 1); i <= 0; i++) {
        arr.push(assetBaseAt(asset, i));
    }
    return arr;
}

/** Emoji bar chart (▁▂▃▄▅▆▇█) */
function renderChart(prices) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
    const last  = prices[prices.length - 1];
    const prev  = prices[prices.length - 2] || last;
    const trend = last >= prev ? '📈' : '📉';
    const chart = prices.map(p => {
        const idx = Math.round(((p - min) / range) * (bars.length - 1));
        return bars[Math.max(0, Math.min(bars.length - 1, idx))];
    }).join('');
    return `${chart} ${trend}`;
}

function portfolioValue(portfolio, prices) {
    // SOS: user holds SOS units (each unit = 1 SOS), but we need USD value
    // 1 SOS = 1/rate USD
    const sosUsd = ((portfolio.SOS || 0)) / (prices.SOS || SOS_PER_USD);
    return Math.round(
        (portfolio.BTC  || 0) * prices.BTC  +
        (portfolio.EUR  || 0) * prices.EUR  +
        (portfolio.GOLD || 0) * prices.GOLD +
        sosUsd
    );
}

function formatPrice(asset, prices) {
    if (asset === 'BTC')  return `$${prices.BTC.toLocaleString()}`;
    if (asset === 'EUR')  return `$${prices.EUR}`;
    if (asset === 'GOLD') return `$${prices.GOLD.toLocaleString()}`;
    if (asset === 'SOS')  return `${prices.SOS.toLocaleString()} SOS/$1`;
    return '?';
}

function pctChange(hist) {
    if (hist.length < 2) return 0;
    const first = hist[0], last = hist[hist.length - 1];
    return ((last - first) / first * 100).toFixed(2);
}

module.exports = { getPrices, getPriceHistory, renderChart, portfolioValue, formatPrice, pctChange, SOS_PER_USD };
