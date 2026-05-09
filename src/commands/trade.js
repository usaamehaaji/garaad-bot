// =====================================================================
// AMARKA: ?trade  —  Suuqa Ganacsiga (BTC, EUR, GOLD, SOS)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData }                    = require('../store');
const { checkUser }                             = require('../utils/helpers');
const { getPrices, getPriceHistory, renderChart, pctChange, portfolioValue } = require('../utils/market');
const { PREFIX } = require('../config');

function arrowPct(pct) {
    const n = parseFloat(pct);
    return n >= 0 ? `🟢 +${pct}%` : `🔴 ${pct}%`;
}

function buildTradeEmbed(userId, prices) {
    checkUser(userId);
    const d       = userData[userId];
    const portVal = portfolioValue(d.portfolio || {}, prices);
    const total   = Math.round((d.cash || 0) + portVal);
    const pnl     = d.realizedPnl || 0;
    const pnlSign = pnl >= 0 ? '+' : '';

    const assets = [
        { key:'BTC',  icon:'₿',  label:'Bitcoin' },
        { key:'EUR',  icon:'🔵', label:'Euro' },
        { key:'GOLD', icon:'🟡', label:'Dahabka' },
        { key:'SOS',  icon:'🇸🇴', label:'Shilinka Somaali' },
    ];

    let marketStr = '';
    for (const a of assets) {
        const hist  = getPriceHistory(a.key, 7);
        const chart = renderChart(hist);
        const pct   = pctChange(hist);
        const price = a.key === 'SOS'
            ? `${prices[a.key].toLocaleString()} SOS=$1`
            : `$${prices[a.key].toLocaleString()}`;
        const held  = a.key === 'SOS'
            ? `${(d.portfolio?.SOS||0).toLocaleString()} SOS`
            : a.key === 'BTC'  ? `${(d.portfolio?.BTC||0).toFixed(5)} BTC`
            : a.key === 'EUR'  ? `${(d.portfolio?.EUR||0).toFixed(2)} EUR`
            : `${(d.portfolio?.GOLD||0).toFixed(3)} GOLD`;
        marketStr += `${a.icon} **${a.label}** — ${price}  ${arrowPct(pct)}\n\`${chart}\`  _(Haysataa: ${held})_\n\n`;
    }

    return new EmbedBuilder()
        .setTitle('💹 Suuqa Ganacsiga — Garaad Markets')
        .setColor('#16213e')
        .setDescription(
            marketStr +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💵 Naqdiga: **$${(d.cash||0).toLocaleString()}** | 💼 Hantida: **$${portVal.toLocaleString()}** | 🏦 Wadarta: **$${total.toLocaleString()}**\n` +
            `${pnl >= 0 ? '🟢' : '🔴'} P&L: **${pnlSign}$${Math.round(pnl).toLocaleString()}**\n\n` +
            `_Riix badhanka si aad u iibsato ama u iibiyo · saacad kasta qiimuhu wuu beddeli doonaa_`
        )
        .setFooter({ text: `${PREFIX}suuqa chart faahfaahsan · ${PREFIX}jeeb jeebkaaga · ${PREFIX}manta dakhlig maanta` })
        .setTimestamp();
}

function buildTradeRows(userId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_buy_BTC_100_${userId}`).setLabel('₿ Iibso BTC $100').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`trade_buy_EUR_100_${userId}`).setLabel('🔵 Iibso EUR $100').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`trade_buy_GOLD_100_${userId}`).setLabel('🟡 Iibso Gold $100').setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_buy_SOS_100_${userId}`).setLabel('🇸🇴 Iibso SOS $100').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`trade_buymax_BTC_${userId}`).setLabel('₿ BTC Max').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`trade_buymax_GOLD_${userId}`).setLabel('🟡 GOLD Max').setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_sell_BTC_${userId}`).setLabel('Iibi BTC Dhan').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`trade_sell_EUR_${userId}`).setLabel('Iibi EUR Dhan').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`trade_sell_GOLD_${userId}`).setLabel('Iibi Gold Dhan').setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_sell_SOS_${userId}`).setLabel('Iibi SOS Dhan').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`trade_refresh_${userId}`).setLabel('🔄 Cusboona').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`close_trade_${userId}`).setLabel('Ka bax').setStyle(ButtonStyle.Danger),
        ),
    ];
}

module.exports = async function tradeCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    const prices = getPrices();
    return message.reply({ embeds: [buildTradeEmbed(userId, prices)], components: buildTradeRows(userId) });
};

module.exports.buildTradeEmbed = buildTradeEmbed;
module.exports.buildTradeRows  = buildTradeRows;
