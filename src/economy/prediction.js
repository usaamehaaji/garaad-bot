// =====================================================================
// GARAAD PREDICT — Binary Prediction Trading (UP / DOWN)
// WIN  = stake × 1.8 (faa'iido 80%)
// LOSE = stake × 0.4 (dib u celinta 40%)
// =====================================================================

const { getPrice }  = require('./market');
const { econData, checkEconUser, saveEcon, trackEarning, addToTreasury } = require('./econStore');
const { fmt }       = require('../utils/helpers');

const pendingSetup      = new Map();  // userId -> partial setup state
const activePredictions = new Map();  // userId -> locked prediction

const WIN_MULTI  = 1.8;
const LOSE_MULTI = 0.4;

const ASSET_LABEL = {
    btc:     '₿ BTC',
    gold:    '🥇 Gold',
    diamond: '💎 Diamond',
    ring:    '💍 Ring',
};

// ── Pending state helpers ──────────────────────────────────────────

function setPending(userId, patch) {
    const cur = pendingSetup.get(userId) || {};
    pendingSetup.set(userId, { ...cur, ...patch });
}

function getPending(userId)  { return pendingSetup.get(userId)  || null; }
function clearPending(userId){ pendingSetup.delete(userId); }

// ── Active prediction helpers ──────────────────────────────────────

function hasPrediction(userId)        { return activePredictions.has(userId); }
function getActivePrediction(userId)  { return activePredictions.get(userId) || null; }

// ── Lock prediction ────────────────────────────────────────────────

async function lockPrediction(userId, client) {
    const pend = getPending(userId);
    if (!pend)                  return { ok: false, msg: '⚠️ Setup xog ma jirto — bilow marlabaad.' };
    if (hasPrediction(userId))  return { ok: false, msg: '⚠️ Saadaalin firfircoon ayaad haysataa. Sug.' };

    const { asset, stakeType, stakeAmount, stakeUsd, minutes, direction, channelId, messageId } = pend;
    if (!asset || !stakeType || !stakeAmount || !minutes || !direction) {
        return { ok: false, msg: '⚠️ Macluumaad dhameystiran kuma jiro. Bilow marlabaad.' };
    }

    checkEconUser(userId);
    const d = econData[userId];

    if (stakeType === 'usd') {
        if (d.usd < stakeAmount)
            return { ok: false, msg: `⚠️ USD kugu filna ma lihid. Haysataa: **$${d.usd.toLocaleString()}**` };
        d.usd -= stakeAmount;
    } else {
        if ((d[asset] || 0) < stakeAmount)
            return { ok: false, msg: `⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[asset] || 0}**` };
        d[asset] -= stakeAmount;
    }
    saveEcon();

    const entryPrice = getPrice(asset);
    const endTime    = Date.now() + minutes * 60 * 1000;

    const pred = {
        userId, asset, stakeType, stakeAmount,
        stakeUsd: stakeUsd || stakeAmount,
        minutes, direction, endTime, entryPrice,
        channelId, messageId,
    };
    activePredictions.set(userId, pred);
    clearPending(userId);

    setTimeout(() => resolvePrediction(userId, client), minutes * 60 * 1000);
    return { ok: true };
}

// ── Resolve prediction ─────────────────────────────────────────────

async function resolvePrediction(userId, client) {
    const pred = activePredictions.get(userId);
    if (!pred) return;

    const exitPrice   = getPrice(pred.asset);
    const priceWentUp = exitPrice > pred.entryPrice;
    const priceEqual  = exitPrice === pred.entryPrice;

    let win    = false;
    let isDraw = false;
    if (priceEqual) {
        isDraw = true;
    } else {
        win = (pred.direction === 'up' && priceWentUp) || (pred.direction === 'down' && !priceWentUp);
    }

    const payout = isDraw
        ? pred.stakeUsd
        : win
            ? Math.floor(pred.stakeUsd * WIN_MULTI)
            : Math.floor(pred.stakeUsd * LOSE_MULTI);

    checkEconUser(userId);
    const d = econData[userId];
    d.usd += payout;

    if (!isDraw) {
        if (win) trackEarning(userId, payout - pred.stakeUsd);
        else     addToTreasury(pred.stakeUsd - payout);
    }
    saveEcon();
    activePredictions.delete(userId);

    const pctChange   = ((exitPrice - pred.entryPrice) / pred.entryPrice * 100).toFixed(2);
    const dirLabel    = pred.direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    const assetLabel  = ASSET_LABEL[pred.asset] || pred.asset.toUpperCase();
    const profit      = payout - pred.stakeUsd;

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const showAsset = pred.stakeType !== 'usd';
    const resultEmbed = new EmbedBuilder()
        .setTitle(
            isDraw ? '🤝 Saadaalin — Xeerka! (Draw)'
            : win  ? '🏆 Saadaalin — GUUL! WIN!'
                   : '😢 Saadaalin — KHASAARO! LOSE'
        )
        .setColor(isDraw ? '#f1c40f' : win ? '#2ecc71' : '#e74c3c')
        .setDescription(
            (showAsset ? `📌 **Asset:**       ${assetLabel}\n` : '') +
            `🎯 **Saadaal:**     ${dirLabel}\n` +
            (showAsset
                ? `📊 **Galitaanka:**  **$${fmt(pred.entryPrice)}**\n` +
                  `📊 **Bixitaanka:**  **$${fmt(exitPrice)}** (${pctChange > 0 ? '+' : ''}${pctChange}%)\n\n`
                : '\n') +
            `💰 **Dhigay:**      $${fmt(pred.stakeUsd)} USD\n` +
            (isDraw
                ? `✅ **Dib u celinta:** $${fmt(payout)} (qiime iskumid — dib oo dhan)`
                : win
                    ? `✅ **Dib u celinta:** $${fmt(payout)} (+$${fmt(profit)} faa'iido)`
                    : `❌ **Dib u celinta:** $${fmt(payout)} (-$${fmt(Math.abs(profit))} khasaaro)`) +
            `\n\n💵 **USD-kaaga hadda:** $${fmt(d.usd)}`
        )
        .setFooter({ text: 'Garaad Predict • ?trade si aad dib u bilaabasho' });

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_trade_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    // Edit original message
    if (client && pred.channelId && pred.messageId) {
        try {
            const ch  = await client.channels.fetch(pred.channelId).catch(() => null);
            if (ch) {
                const msg = await ch.messages.fetch(pred.messageId).catch(() => null);
                if (msg) await msg.edit({ embeds: [resultEmbed], components: [closeRow] }).catch(() => {});
            }
        } catch {}
    }

    // Channel ping
    if (client && pred.channelId) {
        try {
            const ch = await client.channels.fetch(pred.channelId).catch(() => null);
            if (ch) {
                await ch.send({
                    content: `<@${userId}> — natiijahaaga saadaalinta:`,
                    embeds:  [resultEmbed],
                    components: [closeRow],
                }).catch(() => {});
            }
        } catch {}
    }

    // DM notification
    if (client) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                await user.send({ embeds: [
                    new EmbedBuilder()
                        .setTitle(isDraw ? '🤝 Garaad Predict — Xeerka' : win ? '🏆 Garaad Predict — Guul!' : '😢 Garaad Predict — Khasaaro')
                        .setColor(isDraw ? '#f1c40f' : win ? '#2ecc71' : '#e74c3c')
                        .setDescription(
                            `**${pred.stakeType === 'usd' ? '💵 USD' : assetLabel}** | **${dirLabel}**\n` +
                            `💰 Dhigay: **$${fmt(pred.stakeUsd)}** → Heshay: **$${fmt(payout)}**\n` +
                            `💵 USD-kaaga hadda: **$${fmt(d.usd)}**`
                        )
                        .setFooter({ text: 'Garaad Predict' }),
                ] }).catch(() => {});
            }
        } catch {}
    }
}

module.exports = {
    pendingSetup,
    activePredictions,
    WIN_MULTI,
    LOSE_MULTI,
    ASSET_LABEL,
    setPending,
    getPending,
    clearPending,
    hasPrediction,
    getActivePrediction,
    lockPrediction,
    resolvePrediction,
};
