const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser } = require('../../economy/econStore');
const { getPrice }                = require('../../economy/market');
const { ECON_TITLES }             = require('./econShop');
const { fmt }                     = require('../../utils/helpers');

module.exports = async function jeebCmd(message) {
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;
    checkEconUser(userId);
    const d = econData[userId];

    const btcPrice  = getPrice('btc');
    const goldPrice = getPrice('gold');
    const diaPrice  = getPrice('diamond');
    const ringPrice = getPrice('ring');

    const netWorth = d.usd
        + d.btc     * btcPrice
        + d.gold    * goldPrice
        + d.diamond * diaPrice
        + d.ring    * ringPrice
        + d.banks.garaad;

    const xirfadLabel = (() => {
        if (!d.activeEconTitle) return '';
        if (d.activeEconTitle === 'custom') return d.customEconTitle ? ` (${d.customEconTitle} ✍️)` : ' (Custom ✍️)';
        return ECON_TITLES[d.activeEconTitle] ? ` (${ECON_TITLES[d.activeEconTitle].label})` : '';
    })();

    const today       = new Date().toISOString().slice(0, 10);
    const todayEarned = (d.todayEarned && d.todayEarned.date === today) ? d.todayEarned.usd : 0;

    const loanLine = (() => {
        if (!d.loan || !d.loan.owed) return '';
        const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - d.loan.takenAt) / 86400000));
        return `\n💳 **Deen:** $${fmt(d.loan.owed)} ${daysLeft > 0 ? `(${daysLeft} malin)` : '🔴 overdue'}`;
    })();

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_jeeb_${message.author.id}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle(`👜 Jeebka — ${target.username}${xirfadLabel}`)
            .setColor('#f39c12')
            .setDescription(
                `**💵 USD:** $${fmt(d.usd)}\n` +
                `**₿ BTC:** ${d.btc} ≈ $${fmt(Math.round(d.btc * btcPrice))}\n` +
                `**🥇 Gold:** ${d.gold} ≈ $${fmt(Math.round(d.gold * goldPrice))}\n` +
                `**💎 Diamond:** ${d.diamond} ≈ $${fmt(Math.round(d.diamond * diaPrice))}\n` +
                `**💍 Ring:** ${d.ring} ≈ $${fmt(Math.round(d.ring * ringPrice))}\n\n` +
                `**🏦 Garaad Bank:** $${fmt(d.banks.garaad)}\n` +
                `**📊 Net Worth: ~$${fmt(Math.round(netWorth))} USD**\n` +
                `**📈 Maanta dhakhli: +$${fmt(todayEarned)}**` +
                loanLine
            )
            .setFooter({ text: 'Garaad Economy' }),
    ], components: [closeRow] });
};
