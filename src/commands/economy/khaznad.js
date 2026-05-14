const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTreasury } = require('../../economy/econStore');

function priceTag(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
    return `$${Math.round(n).toLocaleString()}`;
}

module.exports = async function khaznadCmd(message) {
    const t       = getTreasury();
    const bal     = t.balance || 0;
    const totalIn = t.totalIn || 0;
    const spent   = totalIn - bal;

    const userId = message.author.id;
    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_khaznad_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🏛️ Khaznadda Garaad — Treasury')
            .setColor('#8e44ad')
            .setDescription(
                `**💰 Hadda:**\n` +
                `🏦 Khaznad: **${priceTag(bal)} USD**\n\n` +
                `**📊 Tirakoobka:**\n` +
                `📥 Wadarta soo gashay: **${priceTag(totalIn)} USD**\n` +
                `📤 Wadarta la qaybiyay: **${priceTag(spent)} USD**\n\n` +
                `**📌 Lacagta xaga kale:** Title iibsiga iyo Cashflip qasaaraha\n` +
                `**📌 Lacagta la siiyaa:** Admin ayaa qaybiyaa dadka`
            )
            .setFooter({ text: 'Garaad Economy • Keedsane Bank Treasury' }),
    ], components: [closeRow] });
};
