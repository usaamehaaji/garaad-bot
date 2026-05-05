// =====================================================================
// AMARKA: ?top
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { userData }     = require('../store');
const { getLevel }     = require('../utils/helpers');

module.exports = async function topCommand(message) {
    const sorted = Object.entries(userData)
        .sort(([, a], [, b]) => (b.iq || 0) - (a.iq || 0))
        .slice(0, 10)
        .map(([id, data], i) => {
            const titleTag = data.title ? `[${data.title}] ` : '';
            const lvl      = getLevel(data.iq || 0);
            return `**${i + 1}.** ${titleTag}<@${id}> — ${data.iq || 0} IQ | L${lvl} | ⭐${data.stars || 0}`;
        })
        .join('\n');

    const embed = new EmbedBuilder()
        .setTitle('🏆 Hogaanka Garaad Quiz')
        .setDescription(sorted || 'Wali cidna dhibco ma leh!')
        .setColor('#FFBF00');

    return message.reply({ embeds: [embed] });
};
