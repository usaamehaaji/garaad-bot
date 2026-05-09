// =====================================================================
// AMARKA: ?suuqa  —  Suuqa Maanta (chart + qiimayaasha + khibaad)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData }     = require('../store');
const { checkUser }    = require('../utils/helpers');
const { getPrices, getPriceHistory, renderChart, pctChange, portfolioValue } = require('../utils/market');

function pctLine(pct) {
    const n = parseFloat(pct);
    return n >= 0 ? `🟢 +${pct}%` : `🔴 ${pct}%`;
}

module.exports = async function suuqaCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    const d      = userData[userId];
    const prices = getPrices();

    const assets = ['BTC','EUR','GOLD','SOS'];
    const labels = { BTC:'₿ Bitcoin', EUR:'🔵 Euro', GOLD:'🟡 Dahabka', SOS:'🇸🇴 Shilinka Somaali' };
    const units  = { BTC:'$', EUR:'$', GOLD:'$', SOS:'SOS/$1' };

    let fieldsText = '';
    for (const a of assets) {
        const hist  = getPriceHistory(a, 7);
        const chart = renderChart(hist);
        const pct   = pctChange(hist);
        const price = a === 'SOS'
            ? `${prices[a].toLocaleString()} SOS = $1`
            : `$${(typeof prices[a] === 'number' ? prices[a] : 0).toLocaleString()}`;
        fieldsText += `**${labels[a]}**\n${price}  ${pctLine(pct)}\n\`${chart}\`\n\n`;
    }

    const portVal  = portfolioValue(d.portfolio || {}, prices);
    const total    = Math.round((d.cash || 0) + portVal);

    const embed = new EmbedBuilder()
        .setTitle('📊 Suuqa Hadda — Garaad Markets')
        .setColor('#2c3e50')
        .setDescription(
            fieldsText +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💵 Naqdiga: **$${(d.cash||0).toLocaleString()}** | 🇸🇴 SOS: **${(d.portfolio?.SOS||0).toLocaleString()}**\n` +
            `💼 Hantida: **$${portVal.toLocaleString()}** | 🏦 Wadarta: **$${total.toLocaleString()}**`
        )
        .setFooter({ text: 'Qiimayaashu waxay beddelmaan saacad kasta · ?trade si aad u ganacsato' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`suuqa_refresh_${userId}`).setLabel('🔄 Cusboona').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`close_suuqa_${userId}`).setLabel('Ka bax').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('jeeb_open_trade').setLabel('💹 Ganacsi').setStyle(ButtonStyle.Secondary),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
