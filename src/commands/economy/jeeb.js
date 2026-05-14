const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser } = require('../../economy/econStore');
const { getPrice }                = require('../../economy/market');
const { ECON_TITLES }             = require('./econShop');

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
        + d.banks.mandeeq
        + d.banks.garaad;

    const xirfadLabel = (() => {
        if (!d.activeEconTitle) return '';
        if (d.activeEconTitle === 'custom') return d.customEconTitle ? ` (${d.customEconTitle} ✍️)` : ' (Custom ✍️)';
        return ECON_TITLES[d.activeEconTitle] ? ` (${ECON_TITLES[d.activeEconTitle].label})` : '';
    })();

    const today       = new Date().toISOString().slice(0, 10);
    const todayEarned = (d.todayEarned && d.todayEarned.date === today) ? d.todayEarned.usd : 0;

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
                `**💵 USD:** $${d.usd.toLocaleString()}\n` +
                `**₿ BTC:** ${d.btc} ≈ $${(d.btc * btcPrice).toLocaleString()}\n` +
                `**🥇 Gold:** ${d.gold} oz ≈ $${(d.gold * goldPrice).toLocaleString()}\n` +
                `**💎 Diamond:** ${d.diamond} ≈ $${(d.diamond * diaPrice).toLocaleString()}\n` +
                `**💍 Ring:** ${d.ring} ≈ $${(d.ring * ringPrice).toLocaleString()}\n\n` +
                `**🏦 Mandeeq Bank:** $${d.banks.mandeeq.toLocaleString()}\n` +
                `**🏦 Garaad Bank:** $${d.banks.garaad.toLocaleString()}\n\n` +
                `**📊 Net Worth: ~$${Math.round(netWorth).toLocaleString()} USD**\n` +
                `**📈 Maanta dhakhli: +$${todayEarned.toLocaleString()}**`
            )
            .setFooter({ text: 'Garaad Economy' }),
    ], components: [closeRow] });
};
