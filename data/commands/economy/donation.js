const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury, addToTreasury } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

function buildDonationEmbed() {
    const t = getTreasury();
    return new EmbedBuilder()
        .setTitle('🏛️ GARAAD BANK — Donation Center')
        .setColor('#8e44ad')
        .addFields(
            { name: '🏛️ Treasury Balance', value: `**₿ ${fmt(t.balance || 0)}**`, inline: true },
            { name: '📋 Options',           value: '💝 Donate or 🎁 Share to all', inline: true },
        )
        .setDescription(
            `**💝 Donate** — Adiga BTC-kaaga khaznad u gudbi\n` +
            `**🎁 Share to All** — Khaznadda lacag ka qaad, dadka oo dhan si siman u qeybi _(admin kaliya)_`
        )
        .setFooter({ text: 'Garaad Bank • Donation Center' });
}

function donationRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_don_donate_${userId}`)
            .setLabel('💝 Donate')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`eco_don_share_${userId}`)
            .setLabel('🎁 Share to All')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_donation_${userId}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function donationCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    return message.reply({
        embeds:     [buildDonationEmbed()],
        components: [donationRow(userId)],
    });
};

module.exports.buildDonationEmbed = buildDonationEmbed;
module.exports.donationRow        = donationRow;
