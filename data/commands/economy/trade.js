// =====================================================================
// COMMAND: ?trade — Garaad Predict (UP / DOWN Binary Trading, BTC only)
// Flow: ?trade → Predict BTC button → amount modal → time → direction → confirm → lock
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser }     = require('../../economy/econStore');
const { getMarketSnapshot, getPrice } = require('../../economy/market');
const { getActivePrediction, WIN_MULTI, LOSE_MULTI, ASSET_LABEL } = require('../../economy/prediction');
const pfmt = n => Math.round(n).toLocaleString();

// ── Embed: Market overview ─────────────────────────────────────────

function buildMarketEmbed(d) {
    const snap = getMarketSnapshot();
    const btcEntry = snap.find(s => s.asset === 'btc');

    const ind = btcEntry
        ? (btcEntry.change > 0 ? `🟢 +${btcEntry.change.toFixed(1)}%` : btcEntry.change < 0 ? `🔴 ${btcEntry.change.toFixed(1)}%` : '⬜ 0.0%')
        : '';
    const sig = btcEntry
        ? (btcEntry.change > 2 ? ' 📈 *Rising*' : btcEntry.change < -2 ? ' ⚠️ *Falling*' : '')
        : '';
    const spark = btcEntry?.spark ?? '';
    const price = btcEntry?.price ?? getPrice('btc');

    return new EmbedBuilder()
        .setTitle('📊 Garaad Predict — BTC Market')
        .setColor('#1a1a2e')
        .setDescription(
            `₿ **BTC**  **${pfmt(price)}**  ${ind}\n\`${spark}\`${sig}` +
            `\n\nWallet: **₿${pfmt(d.btc || 0)}**\n\n` +
            `**Click "📊 Predict BTC" to start a prediction:**`
        )
        .setFooter({ text: 'Garaad Predict • Choose UP or DOWN, wait for the result' });
}

// ── Embed: Time selection ──────────────────────────────────────────

function buildTimeEmbed(asset, stakeType, stakeAmount, stakeUsd) {
    return new EmbedBuilder()
        .setTitle('⏱️ Choose Duration — BTC Prediction')
        .setColor('#8e44ad')
        .setDescription(
            `**Stake:** ₿${pfmt(stakeUsd)}\n\n` +
            `How many minutes do you want to wait?\n\n` +
            `> 🟡 **5 minutes** — Quick\n` +
            `> 🎯 **10 minutes** — Recommended\n` +
            `> 🟣 **15 minutes** — Longer, lower volatility\n` +
            `> ⭐ **30 minutes** — Long, highest potential`
        )
        .setFooter({ text: 'Garaad Predict • Minimum 5 minutes' });
}

// ── Embed: Direction ──────────────────────────────────────────────

function buildDirectionEmbed(asset, stakeType, stakeAmount, stakeUsd, minutes) {
    const price = getPrice('btc');
    return new EmbedBuilder()
        .setTitle('🎯 Choose Direction — BTC Prediction')
        .setColor('#e67e22')
        .setDescription(
            `**Asset:** ₿ BTC\n` +
            `**Stake:** ₿${pfmt(stakeUsd)}\n` +
            `**Duration:** ${minutes} minutes\n` +
            `**Current price:** ${pfmt(price)}\n\n` +
            `⬆️ **UP** — You predict the price will go up\n` +
            `⬇️ **DOWN** — You predict the price will go down`
        )
        .setFooter({ text: 'Garaad Predict' });
}

// ── Embed: Confirm ────────────────────────────────────────────────

function buildConfirmEmbed(asset, stakeType, stakeAmount, stakeUsd, minutes, direction) {
    const price    = getPrice('btc');
    const dirLabel = direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    const winPay   = Math.floor(stakeUsd * WIN_MULTI);
    const losePay  = Math.floor(stakeUsd * LOSE_MULTI);
    return new EmbedBuilder()
        .setTitle('📌 Prediction Setup — Confirm')
        .setColor('#27ae60')
        .setDescription(
            `₿ **Asset:** BTC\n` +
            `📊 **Current price:** ${pfmt(price)}\n` +
            `💰 **Stake:** ₿${pfmt(stakeUsd)}\n` +
            `⏱️ **Duration:** ${minutes} minutes\n` +
            `🎯 **Direction:** ${dirLabel}\n\n` +
            `🏆 **If you win:** +₿${pfmt(winPay - stakeUsd)} profit → total: **₿${pfmt(winPay)}**\n` +
            `💀 **If you lose:** −₿${pfmt(stakeUsd - losePay)} loss → returned: **₿${pfmt(losePay)}**\n\n` +
            `⚡ **Prediction will be LOCKED — cannot be changed**`
        )
        .setFooter({ text: 'Garaad Predict • Lock to confirm' });
}

// ── Embed: Active prediction ──────────────────────────────────────

function buildActiveEmbed(pred) {
    const remaining = Math.max(0, pred.endTime - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const dirLabel = pred.direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    return new EmbedBuilder()
        .setTitle('⏳ Active Prediction — Waiting...')
        .setColor('#f39c12')
        .setDescription(
            `📌 **Asset:**        ₿ BTC\n` +
            `📊 **Entry price:**  ${pfmt(pred.entryPrice)}\n` +
            `🎯 **Direction:**    ${dirLabel}\n` +
            `💰 **Stake:**        ₿${pfmt(pred.stakeUsd)}\n` +
            `⏱️ **Time left:**    **${mins}m ${secs}s**\n\n` +
            `🔔 When time expires, the result will be posted in this channel!`
        )
        .setFooter({ text: 'Garaad Predict • Cannot be changed once locked' });
}

// ── Embed: Disclaimer ─────────────────────────────────────────────

function buildDisclaimerEmbed() {
    return new EmbedBuilder()
        .setTitle('⚠️ Garaad Predict — Risk Disclaimer')
        .setColor('#e67e22')
        .setDescription(
            `**Every prediction carries both profit and loss potential.**\n\n` +
            `Before locking any prediction, you accept that **all outcomes** — profit or loss — are your sole responsibility.\n\n` +
            `📌 _Predictions are managed strategically and risk-calculated to ensure stability and opportunity._\n\n` +
            `Do you accept these terms?`
        )
        .setFooter({ text: 'Garaad Predict • Accept to enter the market' });
}

// ── Rows ──────────────────────────────────────────────────────────

// Main panel: predict BTC + refresh
function mainRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_a_btc_${userId}`).setLabel('📊 Predict BTC').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_refresh_${userId}`).setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
    );
}

function tradeCloseRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('✖ Close').setStyle(ButtonStyle.Danger),
    );
}

function controlRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_refresh_${userId}`).setLabel('🔄 Refresh').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`) .setLabel('✖ Close').setStyle(ButtonStyle.Danger),
    );
}

function timeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_t_5_${userId}`) .setLabel('5 min').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pred_t_10_${userId}`).setLabel('10 min 🎯').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_t_15_${userId}`).setLabel('15 min').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`pred_t_30_${userId}`).setLabel('30 min ⭐').setStyle(ButtonStyle.Danger),
    );
}

function backRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_back_${userId}`).setLabel('🔙 Back').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('✖ Cancel').setStyle(ButtonStyle.Danger),
    );
}

function directionRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_d_up_${userId}`)  .setLabel('⬆️ UP').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_d_down_${userId}`).setLabel('⬇️ DOWN').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`pred_back_${userId}`)  .setLabel('🔙 Back').setStyle(ButtonStyle.Secondary),
    );
}

function confirmRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pred_lock_${userId}`)  .setLabel('🔒 LOCK — Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`pred_cancel_${userId}`).setLabel('✖ Cancel').setStyle(ButtonStyle.Danger),
    );
}

function disclaimerRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trade_accept_${userId}`).setLabel('✅ Accept — Enter Market').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`close_trade_${userId}`) .setLabel('✖ Cancel')               .setStyle(ButtonStyle.Danger),
    );
}

// ── Command entry ─────────────────────────────────────────────────

module.exports = async function tradeCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    const active = getActivePrediction(userId);
    if (active) {
        return message.reply({
            embeds:     [buildActiveEmbed(active)],
            components: [controlRow(userId)],
        });
    }

    return message.reply({
        embeds:     [buildMarketEmbed(d)],
        components: [mainRow(userId), tradeCloseRow(userId)],
    });
};

// ── Named exports for interactionHandler ─────────────────────────

module.exports.buildDisclaimerEmbed = buildDisclaimerEmbed;
module.exports.disclaimerRow        = disclaimerRow;
module.exports.buildMarketEmbed     = buildMarketEmbed;
module.exports.buildTimeEmbed       = buildTimeEmbed;
module.exports.buildDirectionEmbed  = buildDirectionEmbed;
module.exports.buildConfirmEmbed    = buildConfirmEmbed;
module.exports.buildActiveEmbed     = buildActiveEmbed;
module.exports.mainRow              = mainRow;
module.exports.tradeCloseRow        = tradeCloseRow;
module.exports.controlRow           = controlRow;
module.exports.timeRow              = timeRow;
module.exports.backRow              = backRow;
module.exports.directionRow         = directionRow;
module.exports.confirmRow           = confirmRow;
