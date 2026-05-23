const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser } = require('../../../src/economy/econStore');
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

function buildJeebEmbed(userId, username, isOwner = true) {
    checkEconUser(userId);
    const d = econData[userId];

    const btc    = d.btc           || 0;
    const bank   = d.banks?.garaad || 0;
    const streak = d.streak        || 0;
    const total  = Math.max(0, btc + bank - (d.loan?.owed || 0));
    const rank   = getPlayerRank(userId);

    const titleLabel = (() => {
        if (!d.activeEconTitle) return '';
        if (d.activeEconTitle === 'custom') return d.customEconTitle ? ` [${d.customEconTitle} ✍️]` : '';
        return ECON_TITLES[d.activeEconTitle] ? ` [${ECON_TITLES[d.activeEconTitle].label}]` : '';
    })();

    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // ── Other player: wallet only ──
    if (!isOwner) {
        return new EmbedBuilder()
            .setTitle(`💼 ${username}${titleLabel}`)
            .setColor('#95a5a6')
            .setThumbnail(BTC_ICON)
            .setDescription(`🏷️ **Rank #${rank ?? '—'}**`)
            .addFields(
                { name: '💳 Wallet', value: `**₿ ${fmtW(btc)}**`, inline: true },
            )
            .setFooter({ text: `Garaad Wallet • ${time}`, iconURL: BTC_ICON });
    }

    // ── Own wallet: full info ──
    const fields = [
        { name: '💳 Wallet',       value: `**₿ ${fmtW(btc)}**`,   inline: true },
        { name: '🏦 Bank Balance', value: `**₿ ${fmtW(bank)}**`,  inline: true },
        { name: '📊 Net Worth',    value: `**₿ ${fmtW(total)}**`, inline: true },
    ];
    if (d.loan?.owed) fields.push({ name: '⚠️ Loan Due', value: `**₿ ${fmtW(d.loan.owed)}**`, inline: true });

    return new EmbedBuilder()
        .setTitle(`💼 ${username}${titleLabel}`)
        .setColor('#f39c12')
        .setThumbnail(BTC_ICON)
        .setDescription(`🏷️ **Rank #${rank ?? '—'}**  •  🔥 **${streak} day${streak !== 1 ? 's' : ''}**`)
        .addFields(...fields)
        .setFooter({ text: `Garaad Wallet • ${time}`, iconURL: BTC_ICON });
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
    const authorId = message.author.id;
    const target   = message.mentions.users.first();
    const userId   = target ? target.id       : authorId;
    const username = target ? target.username : message.author.username;
    const isOwner  = !target || target.id === authorId;

    return message.reply({
        embeds:     [buildJeebEmbed(userId, username, isOwner)],
        components: [jeebRow(authorId, userId)],
    });
};

module.exports.buildJeebEmbed = buildJeebEmbed;
module.exports.jeebRow        = jeebRow;
