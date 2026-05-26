// =====================================================================
// AMARKA: ?profile [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../../src/store');
const { checkUser, getLevel } = require('../../src/utils/helpers');

module.exports = async function profileCommand(message) {
    const target = message.mentions.users.first() || message.author;
    checkUser(target.id);
    const data = userData[target.id];

    const level     = getLevel(data.iq);
    const nextLvlIq = (level + 1) * 200;

    const fields = [
        { name: '🧠 IQ',         value: `**${data.iq}**`,          inline: true },
        { name: '📈 Level',      value: `**${level}**`,             inline: true },
        { name: '🎯 Level xiga', value: `**${nextLvlIq} IQ**`,     inline: true },
    ];

    const embed = new EmbedBuilder()
        .setTitle(`👤 ${titleTag}${target.username}`)
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
