// =====================================================================
// GARAAD BOT - Economy Trading Game
// Assets: Forex/Crypto/Gold/Materials
// Currency: cash (economy) + XP rewards (economy)
// IQ is NOT used here.
// =====================================================================

const { userData, saveData, activeTrades } = require('../store');
const { EmbedBuilder } = require('discord.js');
const { getMarketState } = require('./marketManager');
const { addXp } = require('../utils/helpers');

function formatUsd(amount) {
    return `$${amount.toFixed(2)}`;
}

function formatAsset(amount, symbol) {
    if (symbol === 'BTC') return `${amount.toFixed(3)} BTC`;
    if (symbol === 'EUR') return `${amount.toFixed(0)} EUR`;
    if (symbol === 'GOLD') return `${amount.toFixed(2)} oz`;
    if (symbol === 'MAT') return `${amount.toFixed(0)} MAT`;
    return `${amount.toFixed(2)} ${symbol}`;
}

function randomPercent() {
    return (Math.random() * 2 - 1) / 100;
}

function createTradeState(userId) {
    const existing = activeTrades.get(userId);
    if (existing) return existing;

    const state = {
        userId,
        prices: {
            BTC: 27500 + Math.random() * 5000,
            EUR: 1.05 + Math.random() * 0.15,
        },
        trend: {
            BTC: 0,
            EUR: 0,
        },
        lastUpdated: Date.now(),
    };

    activeTrades.set(userId, state);
    return state;
}

function getTradeState(userId) {
    return activeTrades.get(userId);
}

function refreshTradePrices(state) {
    if (!state) return;
    const assets = Object.keys(state.prices);
    assets.forEach(asset => {
        const change = randomPercent();
        const oldPrice = state.prices[asset];
        const newPrice = Math.max(oldPrice * (1 + change), asset === 'EUR' ? 0.5 : 1000);
        state.prices[asset] = newPrice;
        state.trend[asset] = newPrice - oldPrice;
    });
    state.lastUpdated = Date.now();
    return state;
}

function getPriceText(asset, price, diff) {
    const emoji = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
    const sign = diff > 0 ? '+' : '';
    const d = asset === 'EUR' ? diff.toFixed(4) : diff.toFixed(2);
    return `${asset} • ${formatUsd(price)} ${emoji} (${sign}${d})`;
}

function getShareAmount(asset) {
    if (asset === 'BTC') return 0.01;
    if (asset === 'EUR') return 50;
    if (asset === 'GOLD') return 0.10; // 0.10 oz
    if (asset === 'MAT') return 10;    // 10 units
    return 1;
}

function calculateAverageBasis(user, asset, amountBought, cost) {
    const previousAmount = user.portfolio?.[asset] || 0;
    const previousBasis = user.basis?.[asset] || 0;
    if (previousAmount <= 0) return cost / amountBought;
    return ((previousBasis * previousAmount) + cost) / (previousAmount + amountBought);
}

function addTradeXp(userId, amount) {
    const xpGain = Math.max(5, Math.floor(amount / 30));
    addXp(userId, xpGain);
}

function getAssetPriceFromMarket(market, asset) {
    if (asset === 'BTC') return market.btcPrice;
    if (asset === 'EUR') return market.eurPrice;
    if (asset === 'GOLD') return market.goldPrice;
    if (asset === 'MAT') return market.matPrice;
    return 0;
}

function executeTrade(userId, assetKey, action, unitsOverride) {
    const user = userData[userId];
    if (!user) return { success: false, message: 'Xogtaada lama helin. Fadlan mar kale isku day.' };

    const asset = assetKey.toUpperCase();
    const market = getMarketState();
    const price = getAssetPriceFromMarket(market, asset);
    if (!price) {
        return { success: false, message: 'Asset-ka la doortay lama aqoonsan.' };
    }

    const unit = Number.isFinite(unitsOverride) && unitsOverride > 0 ? unitsOverride : getShareAmount(asset);
    const cost = price * unit;
    user.cash ??= Number.isFinite(user.usdBalance) ? user.usdBalance : 0;
    user.portfolio ??= { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 };
    user.basis ??= { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 };
    const portfolio = user.portfolio;

    if (action === 'buy') {
        if (user.cash < cost) {
            return { success: false, message: `Ma haysid lacag ku filan. U baahan tahay ugu yaraan ${formatUsd(cost)}.` };
        }
        user.cash -= cost;
        portfolio[asset] = (portfolio[asset] || 0) + unit;
        user.basis[asset] = calculateAverageBasis(user, asset, unit, cost);
        user.tradeHistory = user.tradeHistory || [];
        user.tradeHistory.unshift({
            when: new Date().toISOString(),
            type: 'Buy',
            asset,
            amount: unit,
            price,
            total: cost,
        });
        if (user.tradeHistory.length > 6) user.tradeHistory.pop();
        saveData();
        addTradeXp(userId, cost);
        return { success: true, message: `✅ Waxaad iibsatay ${formatAsset(unit, asset)} ${asset} oo qiimo ahaan ${formatUsd(cost)}.` };
    }

    if (action === 'sell') {
        if ((portfolio[asset] || 0) < unit) {
            return { success: false, message: `Ma haysid ${formatAsset(unit, asset)} ${asset} si aad u iibiso.` };
        }
        const avgBasis = user.basis[asset] || price;
        const pnl = cost - (avgBasis * unit);
        portfolio[asset] -= unit;
        if (portfolio[asset] <= 0) {
            portfolio[asset] = 0;
            user.basis[asset] = 0;
        }
        user.cash += cost;
        // Shield: haddii active oo khasaaro (pnl<0), khasaaraha yaree 60% hal mar, kadibna shield-ka dami
        let adjustedPnl = pnl;
        const shieldActive = (user.shieldActiveUntil || 0) > Date.now();
        if (shieldActive && adjustedPnl < 0) {
            adjustedPnl = adjustedPnl * 0.4;
            user.shieldActiveUntil = 0;
        }
        user.realizedPnl = (user.realizedPnl || 0) + adjustedPnl;
        user.tradeHistory = user.tradeHistory || [];
        user.tradeHistory.unshift({
            when: new Date().toISOString(),
            type: 'Sell',
            asset,
            amount: unit,
            price,
            total: cost,
            pnl: adjustedPnl,
            shielded: shieldActive && pnl < 0,
        });
        if (user.tradeHistory.length > 6) user.tradeHistory.pop();
        saveData();
        addTradeXp(userId, Math.max(5, Math.floor(Math.abs(adjustedPnl) / 5)));
        const resultText = adjustedPnl >= 0
            ? `Waxaad ka faa'iideysatay ${formatUsd(adjustedPnl)}.`
            : `Khasaaro ${formatUsd(Math.abs(adjustedPnl))} ayuu kugu dhacay${shieldActive ? ' (shield ayaa yareeyay).' : '.'}`;
        return { success: true, message: `✅ Waxaad iibisay ${formatAsset(unit, asset)} ${asset} oo aad heshay ${formatUsd(cost)}. ${resultText}` };
    }

    return { success: false, message: 'Hawl aan sax ahayn la doortay.' };
}

function buildTradeEmbed(userId) {
    const user = userData[userId];
    if (!user) return null;
    const market = getMarketState();
    user.cash ??= Number.isFinite(user.usdBalance) ? user.usdBalance : 0;
    user.portfolio ??= { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 };
    user.basis ??= { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 };

    const balanceText = formatUsd(user.cash || 0);
    const btcHolding = formatAsset(user.portfolio?.BTC || 0, 'BTC');
    const eurHolding = formatAsset(user.portfolio?.EUR || 0, 'EUR');
    const goldHolding = formatAsset(user.portfolio?.GOLD || 0, 'GOLD');
    const matHolding = formatAsset(user.portfolio?.MAT || 0, 'MAT');

    const btcValue = (user.portfolio.BTC || 0) * market.btcPrice;
    const eurValue = (user.portfolio.EUR || 0) * market.eurPrice;
    const goldValue = (user.portfolio.GOLD || 0) * market.goldPrice;
    const matValue = (user.portfolio.MAT || 0) * market.matPrice;
    const portfolioValue = btcValue + eurValue + goldValue + matValue;
    const secretLabel = market.secretDay ? '🚀 Secret High-Value Day' : '📉 Normal Day';
    const shieldLine = (user.shieldActiveUntil || 0) > Date.now()
        ? `🛡️ Active (${Math.ceil((user.shieldActiveUntil - Date.now()) / (60 * 1000))} min)`
        : '—';

    const history = (user.tradeHistory || []).slice(0, 4).map(entry => {
        const type = entry.type === 'Buy' ? 'Iibso' : 'Iibis';
        const pnlText = entry.type === 'Sell' ? ` | P/L: ${formatUsd(entry.pnl || 0)}` : '';
        return `• ${type} ${formatAsset(entry.amount, entry.asset)} ${entry.asset} @ ${formatUsd(entry.price)} (${formatUsd(entry.total)})${pnlText}`;
    }).join('\n') || 'Ma wax macaamil ah weli ma jiro.';

    const embed = new EmbedBuilder()
        .setTitle('💱 ?trade — Forex/Crypto/Gold/Materials')
        .setDescription(
            'Suuqa waa isbedelaa. Isticmaal button-ka ama qor:\n' +
            '`?trade buy BTC 0.02` ama `?trade sell GOLD 0.3`'
        )
        .setColor('#1abc9c')
        .addFields(
            { name: 'Cash', value: balanceText, inline: true },
            { name: 'Shield', value: shieldLine, inline: true },
            { name: 'Qiimaha Portfolio', value: `${formatUsd(portfolioValue)}`, inline: true },
            { name: 'Holdings', value: `${btcHolding}\n${eurHolding}\n${goldHolding}\n${matHolding}`, inline: true },
            { name: 'BTC', value: `${formatUsd(market.btcPrice)} (${market.trend.BTC >= 0 ? '+' : ''}${market.trend.BTC.toFixed(2)})`, inline: true },
            { name: 'EUR', value: `${formatUsd(market.eurPrice)} (${market.trend.EUR >= 0 ? '+' : ''}${market.trend.EUR.toFixed(4)})`, inline: true },
            { name: 'GOLD', value: `${formatUsd(market.goldPrice)} (${market.trend.GOLD >= 0 ? '+' : ''}${market.trend.GOLD.toFixed(2)})`, inline: true },
            { name: 'MAT', value: `${formatUsd(market.matPrice)} (${market.trend.MAT >= 0 ? '+' : ''}${market.trend.MAT.toFixed(2)})`, inline: true },
            { name: 'Maalin Suuq', value: secretLabel, inline: true },
            { name: 'Avg Buy (Basis)', value: `BTC: ${formatUsd(user.basis.BTC || 0)}\nEUR: ${formatUsd(user.basis.EUR || 0)}\nGOLD: ${formatUsd(user.basis.GOLD || 0)}\nMAT: ${formatUsd(user.basis.MAT || 0)}`, inline: true },
            { name: 'Realized P/L', value: formatUsd(user.realizedPnl || 0), inline: true },
            { name: 'Taariikhda Ugu Dambeysay', value: history, inline: false },
        )
        .setFooter({ text: 'Riix Refresh si aad u hesho xog cusub oo la cusbooneysiiyay.' });

    return embed;
}

module.exports = {
    executeTrade,
    buildTradeEmbed,
};
