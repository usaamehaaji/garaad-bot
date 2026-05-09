// =====================================================================
// AMARKA: ?dhaqaale — Amarrada Dhaqaalaha kaliya
// =====================================================================

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { buildDhaqaaleEmbed } = require('./help');

module.exports = async function dhaqaaleCommand(message) {
    const userId = message.author.id;

    const embed = buildDhaqaaleEmbed();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`help_aqoon_${userId}`)
            .setLabel('🧠 Aqoon')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_help_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
