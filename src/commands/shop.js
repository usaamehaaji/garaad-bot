// =====================================================================
// AMARKA: ?shop  (kaliya darajooyin — XP)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../store');
const { PREFIX, TITLES, SHOP_TITLE_KEYS } = require('../config');

function findTitleByKey(key) {
    for (const category of Object.values(TITLES)) {
        if (category[key]) return category[key];
    }
    return null;
}

module.exports = async function shopCommand(message) {
    const userId = message.author.id;

    const lines = SHOP_TITLE_KEYS.map(key => {
        const t = findTitleByKey(key);
        if (!t || t.price <= 0) return null;
        return `**${t.name}** — **${t.price} XP**\n${t.desc}\n→ \`${PREFIX}buy ${key}\``;
    }).filter(Boolean);

    const embed = new EmbedBuilder()
        .setTitle('🛒 Dukaanka Garaad — Darajooyin (XP)')
        .setDescription(
            `XP-gaaga: **${userData[userId].xp} XP**\n\n` +
            `Si aad u iibsato, isticmaal \`${PREFIX}buy [magaca fure]\` (tusaale \`${PREFIX}buy aqoonyahan\`).\n\n` +
            lines.join('\n\n')
        )
        .setColor('#16a085');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_shop_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
