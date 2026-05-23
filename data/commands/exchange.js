const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { exchangeQuizPoints } = require('../../src/utils/quizPoints');
const { PREFIX } = require('../../src/config');

module.exports = async function exchangeCommand(message) {
    const userId = message.author.id;

    const { ok, text } = exchangeQuizPoints(userId, 'iq');
    const embed = new EmbedBuilder()
        .setTitle(ok ? '🧠 Dhibcaha IQ-ga ku badal' : '🧠 Badal')
        .setDescription(text)
        .setColor(ok ? '#2ecc71' : '#e67e22');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_exchange_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
