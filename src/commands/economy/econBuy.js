const { EmbedBuilder } = require('discord.js');
const { fmt } = require('../../../utils/helpers');
const { econData, checkEconUser, saveEcon, addToTreasury } = require('../../economy/econStore');
const { SHOP_ITEMS } = require('./econShop');

// Returns null if item not in economy shop (caller falls through to quiz buy)
module.exports = async function econBuyCmd(message, args) {
    const item = (args[0] || '').toLowerCase();
    if (!SHOP_ITEMS[item]) return null;

    const userId   = message.author.id;
    checkEconUser(userId);
    const d        = econData[userId];
    const shopItem = SHOP_ITEMS[item];
    const currency = shopItem.currency;

    if (shopItem.type === 'title') {
        if (d.econTitles.includes(item)) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setDescription(`⚠️ **${shopItem.label}** mar hore ayaad haysataa!\nIsticmaal \`?etitle ${item}\` si aad u muujiso.`)
                    .setColor('#e67e22'),
            ]});
        }
        if (d[currency] < shopItem.price) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setDescription(`⚠️ **$${fmt(shopItem.price)} USD** ayaad u baahan tahay.\nHaysataa: **$${fmt(d[currency])}**`)
                    .setColor('#e74c3c'),
            ]});
        }
        d[currency] -= shopItem.price;
        d.econTitles.push(item);
        if (!d.activeEconTitle) d.activeEconTitle = item;
        addToTreasury(shopItem.price);
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle(`🏷️ Xirfad La Iibsaday — ${shopItem.label}`)
                .setColor('#2ecc71')
                .setDescription(
                    `✅ **${shopItem.label}** heshay!\n` +
                    `💵 USD hadhay: **$${fmt(d[currency])}**\n\n` +
                    `Isticmaal **\`?etitle ${item}\`** si aad u muujiso.`
                )
                .setFooter({ text: 'Garaad Economy' }),
        ]});
    }

    if (d[currency] < shopItem.price) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ **$${fmt(shopItem.price)} USD** ayaad u baahan tahay.\nHaysataa: **$${fmt(d[currency])}**`)
                .setColor('#e74c3c'),
        ]});
    }

    d[currency]       -= shopItem.price;
    d.inventory[item] += 1;
    saveEcon();

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle(`🛒 Waxaa la Iibsaday — ${shopItem.label}`)
            .setColor('#2ecc71')
            .setDescription(
                `✅ **${shopItem.label}** heshay!\n` +
                `💵 USD hadhay: **$${fmt(d[currency])}**\n` +
                `Kaydka: **${d.inventory[item]}x ${shopItem.label}**`
            )
            .setFooter({ text: 'Garaad Economy' }),
    ]});
};
