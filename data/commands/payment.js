// =====================================================================
// AMARKA: ?payment — Show payment methods from .env
// =====================================================================

const { EmbedBuilder } = require('discord.js');

const EVC_NUMBER  = process.env.EVC_NUMBER   || '610917813';
const WAAFI_NUMBER = process.env.WAAFI_NUMBER || '5291823405989205';
const SALAAM_BANK  = process.env.SALAAM_BANK  || '38492323';

module.exports = async function paymentCmd(message) {
    const embed = new EmbedBuilder()
        .setTitle('💳 Payment Methods')
        .setColor('#27ae60')
        .addFields(
            {
                name: '📱 EVC Plus / Hormuud',
                value: `\`\`\`${EVC_NUMBER}\`\`\``,
                inline: false,
            },
            {
                name: '🏦 Waafi Pay / Premier Bank',
                value: `\`\`\`${WAAFI_NUMBER}\`\`\``,
                inline: false,
            },
            {
                name: '🏛️ Salaam Bank',
                value: `\`\`\`${SALAAM_BANK}\`\`\``,
                inline: false,
            },
        )
        .setFooter({ text: 'Send payment screenshot after transfer.' })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
};
