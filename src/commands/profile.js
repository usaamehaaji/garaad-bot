// =====================================================================
// AMARKA: ?profile [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../store');
const { checkUser, getLevel, getDisplayTitle } = require('../utils/helpers');

const SOLO_HINT =
    '📘 **Macallin (solo):** `?solo` waxaad ku ciyaartaa su\'aalo. Jawaab sax ah: **+3 IQ**, qalad ama waqti: **−1 IQ**. ' +
    'Marka hore waxaad heli kartaa **5 IQ** maalin kasta: `?today` — markaas waxaad ku tartami kartaa `?duel` (dhig 5 IQ).';

module.exports = async function profileCommand(message) {
    const target = message.mentions.users.first() || message.author;
    checkUser(target.id);
    const data = userData[target.id];

    const level     = getLevel(data.iq);
    const nextLvlIq = (level + 1) * 200;
    const dispTitle = getDisplayTitle(target.id);
    const titleTag  = dispTitle ? `[${dispTitle}] ` : '';

    const fields = [
        { name: '🧠 IQ', value: `**${data.iq}**`, inline: true },
        { name: '✨ XP', value: `**${data.xp}**`, inline: true },
        { name: '📈 Level', value: `**${level}**`, inline: true },
        { name: '🎯 Level xiga', value: `**${nextLvlIq} IQ**`, inline: false },
        { name: '💱 Dhibco tartan (quiz)', value: `**${data.pendingQuizPoints || 0}** — \`?exchange xp\` / \`?exchange iq\``, inline: false },
        { name: '🏷️ Cinwaan', value: dispTitle ? `**${dispTitle}**` : '—', inline: false },
        {
            name: '⚡ Blitz',
            value:
                `🎮 Ciyaaray: **${data.stats.blitzPlayed || 0}** · ` +
                `🥇 Guulaha: **${data.stats.blitzWins || 0}** · ` +
                `🏅 Ugu sarr: **${data.stats.blitzTopScore || 0}** dhibcood`,
            inline: false,
        },
    ];

    const viewerIsTarget = message.author.id === target.id;
    if (viewerIsTarget && data.iq <= 0) {
        fields.push({ name: '💡 Talo', value: SOLO_HINT, inline: false });
    }

    const embed = new EmbedBuilder()
        .setTitle(`👤 Profile: ${titleTag}${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(fields)
        .setColor('#9b59b6');

    const viewerId = message.author.id;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_profile_${viewerId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
