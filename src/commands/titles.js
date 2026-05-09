// =====================================================================
// AMARKA: ?titles
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../store');
const { checkUser } = require('../utils/helpers');
const { TITLES, SHOP_TITLE_KEYS, PREFIX } = require('../config');

function findTitleEntry(key) {
    for (const [cat, titles] of Object.entries(TITLES)) {
        if (titles[key]) return { category: cat, title: titles[key] };
    }
    return null;
}

module.exports = async function titlesCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    const data = userData[userId];

    const embed = new EmbedBuilder()
        .setTitle('🏷️ Darajooyinka Garaad')
        .setDescription(`Ku iibso adigoo isticmaalaya XP: \`${PREFIX}buy [fure]\` — eeg \`${PREFIX}shop\`.`)
        .setColor('#f39c12');

    const owned = data.ownedTitles.map(key => {
        const found = findTitleEntry(key);
        const name = found ? found.title.name : key;
        const active = data.activeTitle === key ? ' *(firfircoon)*' : '';
        return `• ${name}${active}`;
    }).join('\n') || '—';

    embed.addFields({ name: 'Waxaad haysataa', value: owned, inline: false });

    const shopLines = SHOP_TITLE_KEYS.map(key => {
        const found = findTitleEntry(key);
        if (!found || found.title.price <= 0) return null;
        const ownedMark = data.ownedTitles.includes(key) ? ' ✓' : '';
        return `• **${found.title.name}** — ${found.title.price} XP${ownedMark}\n  \`${PREFIX}buy ${key}\``;
    }).filter(Boolean);

    embed.addFields({
        name: 'Dukaanka (XP)',
        value: shopLines.join('\n') || '—',
        inline: false,
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_titles_${userId}`)
            .setLabel('iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
