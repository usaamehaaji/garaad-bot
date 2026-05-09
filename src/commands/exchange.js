// =====================================================================
// AMARKA: ?exchange xp  |  ?exchange iq
// Dhibcaha laga helay ?quiz badal
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { exchangeQuizPoints } = require('../utils/quizPoints');
const { PREFIX } = require('../config');

module.exports = async function exchangeCommand(message, args) {
    const userId = message.author.id;
    const mode = (args[0] || '').toLowerCase();

    if (mode !== 'xp' && mode !== 'iq') {
        return message.reply(
            `⚠️ Isticmaal: \`${PREFIX}exchange xp\` ama \`${PREFIX}exchange iq\`\n` +
            `(Dhibcaha tartanka waxaad ka heshaa marka \`${PREFIX}quiz\` uu dhamaado.)`
        );
    }

    const { ok, text } = exchangeQuizPoints(userId, mode);
    const embed = new EmbedBuilder()
        .setTitle(ok ? '💱 Badalka dhibcaha tartanka' : '💱 Badalka')
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
