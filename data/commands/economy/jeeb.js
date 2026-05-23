const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser } = require('../../economy/econStore');
const { ECON_TITLES }             = require('./econShop');

const BTC_ICON = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';

function fmtW(n) {
    return Math.round(n || 0).toLocaleString();
}

function getPlayerRank(userId) {
    const sorted = Object.entries(econData)
        .filter(([k]) => !k.startsWith('__'))
        .sort(([, a], [, b]) => (b.btc || 0) - (a.btc || 0));
    const idx = sorted.findIndex(([uid]) => uid === userId);
    return idx >= 0 ? idx + 1 : null;
}

function buildJeebEmbed(userId, username) {
    checkEconUser(userId);
    const d = econData[userId];

    const btc    = d.btc             || 0;
    const bank   = d.banks?.garaad   || 0;
    const streak = d.streak          || 0;
    const total  = Math.max(0, btc + bank - (d.loan?.owed || 0));
    const rank   = getPlayerRank(userId);

    const titleLabel = (() => {
        if (!d.activeEconTitle) return '';
        if (d.activeEconTitle === 'custom') return d.customEconTitle ? ` [${d.customEconTitle} ✍️]` : '';
        return ECON_TITLES[d.activeEconTitle] ? ` [${ECON_TITLES[d.activeEconTitle].label}]` : '';
    })();

    const loanLine = d.loan?.owed
        ? `\n💳 **Loan:** ₿: ${fmtW(d.loan.owed)}`
        : '';

    return new EmbedBuilder()
        .setTitle(`💼 Garaad Wallet`)
        .setColor('#f39c12')
        .setThumbnail(BTC_ICON)
        .setDescription(
            `👤 **${username}**${titleLabel}\n\n` +
            `💰 **Wallet:** ₿: ${fmtW(btc)}\n` +
            `🏦 **Bank:** ₿: ${fmtW(bank)}\n` +
            `📊 **Wadarta:** ₿: ${fmtW(total)}\n` +
            `🏷️ **Rank:** #${rank ?? '—'}\n` +
            `🔥 **Streak:** ${streak} day${streak !== 1 ? 's' : ''}` +
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
