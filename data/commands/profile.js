// =====================================================================
// AMARKA: ?profile [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../../src/store');
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
    const data = userData[target.id];

    const level     = getLevel(data.iq);
    const nextLvlIq = (level + 1) * 200;
    const { rank, total } = getIQRank(target.id);
    const rankStr = rank ? `**#${rank}** / ${total}` : '—';

    const s = data.stats || {};
    const fields = [
        { name: '🧠 IQ',         value: `**${data.iq}**`,      inline: true },
        { name: '📈 Level',      value: `**${level}**`,         inline: true },
        { name: '🎯 Level xiga', value: `**${nextLvlIq} IQ**`, inline: true },
        { name: '🏆 Rank',       value: rankStr,                inline: true },
        { name: '🎯 Solo',  value: `Ciyaaray: **${s.soloPlayed||0}** | Sax: **${s.soloCorrect||0}** | Qalad: **${s.soloWrong||0}**`,     inline: false },
        { name: '⚔️ Duel',  value: `Guul: **${s.duelWins||0}** | Xumaan: **${s.duelLosses||0}** | Isdhafsashad: **${s.duelDraws||0}**`, inline: false },
        { name: '📝 Quiz',  value: `Ciyaaray: **${s.quizPlayed||0}** | Guul: **${s.quizWins||0}**`,                                      inline: false },
    ];

    const embed = new EmbedBuilder()
        .setTitle(`👤 ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(fields)
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
