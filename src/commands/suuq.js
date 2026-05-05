const { EmbedBuilder } = require('discord.js');
const { getMarketSummary } = require('../games/marketManager');

module.exports = async function suuqCommand(message) {
    const market = getMarketSummary();
    const embed = new EmbedBuilder()
        .setTitle('📈 Suuqa — Forex/Crypto/Gold/Materials')
        .setColor('#8e44ad')
        .setDescription(`${market.icon} Waxaa hadda jira: **${market.mood}**`)
        .addFields(
            { name: 'BTC', value: `$${market.btcPrice.toLocaleString()} (${market.trend.BTC >= 0 ? '+' : ''}${market.trend.BTC})`, inline: true },
            { name: 'EUR', value: `$${market.eurPrice.toLocaleString()} (${market.trend.EUR >= 0 ? '+' : ''}${market.trend.EUR})`, inline: true },
            { name: 'GOLD', value: `$${market.goldPrice.toLocaleString()} (${market.trend.GOLD >= 0 ? '+' : ''}${market.trend.GOLD})`, inline: true },
            { name: 'MAT', value: `$${market.matPrice.toLocaleString()} (${market.trend.MAT >= 0 ? '+' : ''}${market.trend.MAT})`, inline: true },
        )
        .setFooter({ text: 'Suuqa ayaa si otomaatig ah u cusbooneysiinaya (market update interval).' });

    return message.reply({ embeds: [embed] });
};
