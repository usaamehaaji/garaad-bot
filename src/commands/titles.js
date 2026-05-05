// =====================================================================
// AMARKA: ?titles
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { userData } = require('../store');
const { checkUser } = require('../utils/helpers');
const { TITLES } = require('../config');

module.exports = async function titlesCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    const data = userData[userId];

    const embed = new EmbedBuilder()
        .setTitle('🏷️ Titles-ka Garaad')
        .setDescription('Titles-ka aad haysato iyo kuwa aad iibsan karto.')
        .setColor('#f39c12');

    // Owned titles
    const owned = data.ownedTitles.map(key => {
        let name = '';
        for (const category in TITLES) {
            if (TITLES[category][key]) {
                name = TITLES[category][key].name;
                break;
            }
        }
        const active = data.activeTitle === key ? ' (Active)' : '';
        return `• ${name}${active}`;
    }).join('\n') || 'None';

    embed.addFields({ name: '📋 Titles Owned', value: owned, inline: false });

    // Available titles by category
    for (const [category, titles] of Object.entries(TITLES)) {
        const categoryTitles = Object.entries(titles)
            .filter(([key]) => !data.ownedTitles.includes(key))
            .map(([key, title]) => `• ${title.name} - ${title.price} XP`)
            .join('\n') || 'All owned';

        embed.addFields({ name: `${category.charAt(0).toUpperCase() + category.slice(1)} Titles`, value: categoryTitles, inline: true });
    }

    return message.reply({ embeds: [embed] });
};