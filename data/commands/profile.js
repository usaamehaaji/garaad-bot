// =====================================================================
// AMARKA: ?profile [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../../src/store');
const { econData, checkEconUser } = require('../../src/economy/econStore');
const { ECON_TITLES } = require('./economy/econShop');
const { checkUser, getLevel } = require('../../src/utils/helpers');

function getIQRank(userId) {
    const entries = Object.entries(userData).filter(([k, v]) => /^\d{17,19}$/.test(k) && typeof v.iq === 'number');
    entries.sort(([, a], [, b]) => (b.iq || 0) - (a.iq || 0));
    const idx = entries.findIndex(([uid]) => uid === userId);
    return { rank: idx >= 0 ? idx + 1 : null, total: entries.length };
}

module.exports = async function profileCommand(message) {
    const target = message.mentions.users.first() || message.author;
    checkUser(target.id);
    checkEconUser(target.id);
    const data = userData[target.id];
    const econ = econData[target.id];

    const level     = getLevel(data.iq);
    const nextLvlIq = (level + 1) * 200;
    const { rank, total } = getIQRank(target.id);

    // Economy title
    let econTitle = '';
    if (econ.activeEconTitle === 'custom' && econ.customEconTitle) {
        econTitle = econ.customEconTitle;
    } else if (econ.activeEconTitle && ECON_TITLES[econ.activeEconTitle]) {
        econTitle = ECON_TITLES[econ.activeEconTitle].label;
    }
    const titlePart = econTitle ? ` / ${econTitle}` : '';

    const s = data.stats || {};
    const totalGames = (s.soloPlayed || 0) + (s.duelWins || 0) + (s.duelLosses || 0) + (s.duelDraws || 0) + (s.quizPlayed || 0);

    const desc =
        `# 👤 ${target.username}${titlePart}\n` +
        `🧠 **IQ:** ${data.iq}  •  📈 **Level:** ${level}\n` +
        `🎯 **Next Level:** ${nextLvlIq} IQ\n` +
        `🏆 **Rank:** #${rank ?? '—'} / ${total}\n` +
        `🎮 **All Games:** ${totalGames}\n\n` +
        `**🧠 Garaad Education**\n` +
        `✨ *Kobci Garaadkaaga*`;

    const embed = new EmbedBuilder()
        .setDescription(desc)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setColor('#9b59b6');

    const viewerId = message.author.id;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_profile_${viewerId}`)
            .setLabel('✖ Xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
