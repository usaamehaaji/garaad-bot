const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');
const { ECON_TITLES } = require('./econShop');

function resolveLabel(d, key) {
    if (key === 'custom') return d.customEconTitle ? `${d.customEconTitle} ✍️` : 'Custom ✍️';
    return ECON_TITLES[key]?.label || key;
}

module.exports = async function econTitleCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    // ?etitle <key> — set active title
    if (args[0]) {
        const key = args[0].toLowerCase();
        if (!d.econTitles.includes(key)) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setDescription(`⚠️ **${resolveLabel(d, key)}** ma haysatid.\nIibso marka hore: \`?shop\``)
                    .setColor('#e74c3c'),
            ]});
        }
        d.activeEconTitle = key;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🏷️ Xirfadda Waa La Beddelay')
                .setColor('#2ecc71')
                .setDescription(`✅ Hadda waxaad tahay: **${resolveLabel(d, key)}**`)
                .setFooter({ text: 'Garaad Economy' }),
        ]});
    }

    // ?etitle — show owned titles
    if (d.econTitles.length === 0) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🏷️ Xirfad Titles')
                .setColor('#9b59b6')
                .setDescription('Weli xirfad kuma iibsan.\n\nEeg **`?shop`** si aad u aragto liiska.')
                .setFooter({ text: 'Garaad Economy' }),
        ]});
    }

    const ownedLines = d.econTitles.map(key => {
        const active = d.activeEconTitle === key ? ' ✅ *(firfircoon)*' : '';
        return `• ${resolveLabel(d, key)}${active}`;
    }).join('\n');

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🏷️ Xirfadahaaga')
            .setColor('#9b59b6')
            .setDescription(ownedLines + '\n\n`?etitle <key>` si aad u beddesho.')
            .setFooter({ text: 'Garaad Economy' }),
    ]});
};
