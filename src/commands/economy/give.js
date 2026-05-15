const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser } = require('../../economy/econStore');

const ASSET_LABELS = { usd: '💵 USD', btc: 'BTC', gold: '🥇 Gold' };

function assetRow(targetId, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_gv_usd_${targetId}_${userId}`) .setLabel('💵 USD')     .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_gv_btc_${targetId}_${userId}`) .setLabel('BTC')        .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_gv_gold_${targetId}_${userId}`).setLabel('🥇 Gold')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_give_${userId}`)             .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_give_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function giveCmd(message) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('**Lacag u dir:** `?give @user`\nMarka ku qoro @user, asset baad dooranaysaa.')
                .setColor('#e74c3c'),
        ]});
    }

    if (target.id === userId) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription('⚠️ Adiga naftu lacag uma dirin kartid.').setColor('#e74c3c'),
        ]});
    }

    checkEconUser(userId);
    const d = econData[userId];

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle(`💸 Lacag u dir — ${target.username}`)
            .setColor('#3498db')
            .setDescription(
                `**Asset dooro** aad u diri:\n\n` +
                `💵 USD: **$${d.usd.toLocaleString()}**\n` +
                `BTC: **${d.btc}**\n` +
                `🥇 Gold: **${d.gold}**`
            )
            .setFooter({ text: 'Garaad Economy' }),
    ], components: [assetRow(target.id, userId)] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
module.exports.closeRow     = closeRow;
