// =====================================================================
// AMARKA: ?statistics / ?stats [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');

module.exports = async function statisticsCommand(message) {
    const viewerId = message.author.id;
    const target = message.mentions.users.first() || message.author;
    checkUser(target.id);
    const s = userData[target.id].stats;

    const total       = s.soloCorrect + s.soloWrong;
    const accuracy    = total > 0 ? Math.round((s.soloCorrect / total) * 100) : 0;
    const duelTotal   = s.duelWins + s.duelLosses + s.duelDraws;
    const duelWinRate = duelTotal > 0 ? Math.round((s.duelWins / duelTotal) * 100) : 0;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Tirakoobka: ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🎮 Solo (jawaabaha)', value: `**${s.soloPlayed}**`, inline: true },
            { name: '✅ Sax', value: `**${s.soloCorrect}**`, inline: true },
            { name: '❌ Qalad', value: `**${s.soloWrong}**`, inline: true },
            { name: '🎯 Saxnaanta', value: `**${accuracy}%**`, inline: true },
            { name: '⚔️ Duel guulo', value: `**${s.duelWins}**`, inline: true },
            { name: '💀 Duel khasaaro', value: `**${s.duelLosses}**`, inline: true },
            { name: '🤝 Duel barbaro', value: `**${s.duelDraws}**`, inline: true },
            { name: '📈 Duel % guul', value: `**${duelWinRate}%**`, inline: true },
            { name: '👥 Quiz', value: `**${s.quizPlayed}** ciyaar | **${s.quizWins}** hogaamiye`, inline: false },
        )
        .setColor('#1abc9c');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_statistics_${viewerId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
