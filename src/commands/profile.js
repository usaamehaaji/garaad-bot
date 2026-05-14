// =====================================================================
// AMARKA: ?profile [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../store');
const { checkUser, getLevel, getDisplayTitle } = require('../utils/helpers');

const SOLO_HINT =
    '📘 **Talo:** `?today` maalin kasta ku hel IQ, USD ama asset bilaash ah. ' +
    '`?solo` ciyaar IQ hel (+3 sax / −1 qalad). `?duel @qof` tartam IQ dhig.';

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
        { name: '📈 Level', value: `**${level}**`, inline: true },
        { name: '🎯 Level xiga', value: `**${nextLvlIq} IQ**`, inline: true },
        { name: '💱 Dhibco tartan', value: `**${data.pendingQuizPoints || 0}** — \`?exchange\` (IQ ku badal)`, inline: false },
        { name: '🏷️ Cinwaan', value: dispTitle ? `**${dispTitle}**` : '—', inline: false },
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
