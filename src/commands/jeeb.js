// =====================================================================
// AMARKA: ?jeeb [@user]  —  Jeebka Dhaqaalaha
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData }                              = require('../store');
const { checkUser }                             = require('../utils/helpers');
const { getPrices, portfolioValue, renderChart, getPriceHistory, pctChange } = require('../utils/market');

module.exports = async function jeebCommand(message) {
    const target = message.mentions.users.first() || message.author;
    checkUser(target.id);
    const d      = userData[target.id];
    const prices = getPrices();
    const port   = d.portfolio || {};

    const portVal  = portfolioValue(port, prices);
    const totalVal = Math.round((d.cash || 0) + portVal);
    const pnl      = Math.round(d.realizedPnl || 0);
    const pnlSign  = pnl >= 0 ? '+' : '';
    const shield   = (d.shieldActiveUntil || 0) > Date.now() ? '🛡️ Shield Active' : '';

    const btcVal  = Math.round((port.BTC  || 0) * prices.BTC);
    const eurVal  = Math.round((port.EUR  || 0) * prices.EUR);
    const goldVal = Math.round((port.GOLD || 0) * prices.GOLD);
    const sosVal  = Math.round((port.SOS  || 0) / (prices.SOS || 23000)); // USD value of SOS

    const embed = new EmbedBuilder()
        .setTitle(`💼 Jeebka: ${target.username} ${shield}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setColor('#0f3460')
        .addFields(
            { name: '💵 Lacagta Naqdiga', value: `**$${(d.cash||0).toLocaleString()}**`, inline: true },
            { name: '📦 Qiimaha Hantida', value: `**$${portVal.toLocaleString()}**`, inline: true },
            { name: '🏦 Wadarta', value: `**$${totalVal.toLocaleString()}**`, inline: true },
            { name: `${pnl >= 0 ? '🟢' : '🔴'} P&L Dhamaad`, value: `**${pnlSign}$${pnl.toLocaleString()}**`, inline: true },
            {
                name: '🪙 Hantida Kooban',
                value:
                    `₿ BTC: \`${(port.BTC||0).toFixed(6)}\` ≈ $${btcVal.toLocaleString()}\n` +
                    `🔵 EUR: \`${(port.EUR||0).toFixed(2)}\` ≈ $${eurVal.toLocaleString()}\n` +
                    `🟡 GOLD: \`${(port.GOLD||0).toFixed(4)}\` ≈ $${goldVal.toLocaleString()}\n` +
                    `🇸🇴 SOS: \`${(port.SOS||0).toLocaleString()}\` ≈ $${sosVal.toLocaleString()}`,
                inline: false,
            },
            {
                name: '📊 Qiimaha Suuqa (Hadda)',
                value:
                    `₿ BTC: **$${prices.BTC.toLocaleString()}** ${renderChart(getPriceHistory('BTC',5))}\n` +
                    `🟡 GOLD: **$${prices.GOLD.toLocaleString()}** ${renderChart(getPriceHistory('GOLD',5))}\n` +
                    `🔵 EUR: **$${prices.EUR}** ${renderChart(getPriceHistory('EUR',5))}\n` +
                    `🇸🇴 SOS: **${prices.SOS.toLocaleString()} SOS/$1** ${renderChart(getPriceHistory('SOS',5))}`,
                inline: false,
            },
        )
        .setFooter({ text: '?trade — ganacsi | ?suuqa — chart faahfaahsan | ?manta — dakhlig maanta' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_jeeb_${message.author.id}`).setLabel('Iska xir').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('jeeb_open_trade').setLabel('💹 Ganacsi').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`suuqa_refresh_${message.author.id}`).setLabel('📊 Suuqa').setStyle(ButtonStyle.Secondary),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
