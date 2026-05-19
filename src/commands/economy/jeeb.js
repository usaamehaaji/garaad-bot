const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser } = require('../../economy/econStore');
const { ECON_TITLES }             = require('./econShop');
const { fmt }                     = require('../../utils/helpers');

const BTC_ICON = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';

function buildJeebEmbed(userId, username) {
    checkEconUser(userId);
    const d = econData[userId];

    const btc  = d.btc  || 0;
    const bank = d.banks?.garaad || 0;

    const titleLabel = (() => {
        if (!d.activeEconTitle) return '';
        if (d.activeEconTitle === 'custom') return d.customEconTitle ? ` [${d.customEconTitle} ✍️]` : ' [Custom ✍️]';
        return ECON_TITLES[d.activeEconTitle] ? ` [${ECON_TITLES[d.activeEconTitle].label}]` : '';
    })();

    const loanLine = (() => {
        if (!d.loan || !d.loan.owed) return '';
        const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - d.loan.takenAt) / 86400000));
        return `\n💳 **Loan:** ${fmt(d.loan.owed)} BTC due ${daysLeft > 0 ? `(${daysLeft}d left)` : '🔴 overdue'}`;
    })();

    const netWorth = btc + bank - (d.loan?.owed || 0);

    return new EmbedBuilder()
        .setTitle(`💼 Wallet — ${username}${titleLabel}`)
        .setColor('#f39c12')
        .setThumbnail(BTC_ICON)
        .setDescription(
            `₿ **Wallet:** ${fmt(btc)} BTC\n` +
            `🏦 **Bank:** ${fmt(bank)} BTC\n\n` +
            `📊 **Net Worth:** ${fmt(Math.max(0, netWorth))} BTC` +
            loanLine
        )
        .setFooter({ text: `Garaad Economy • ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, iconURL: BTC_ICON });
}

function jeebRow(authorId, targetId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`jeeb_refresh_${authorId}_${targetId}`)
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_jeeb_${authorId}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function jeebCmd(message) {
    const userId = message.author.id;

    return message.reply({
        embeds:     [buildJeebEmbed(userId, message.author.username)],
        components: [jeebRow(userId, userId)],
    });
};

module.exports.buildJeebEmbed = buildJeebEmbed;
module.exports.jeebRow        = jeebRow;
