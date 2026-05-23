const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };

module.exports = async function giveCmd(message, args) {
    const userId  = message.author.id;
    const target  = message.mentions.users.first();

    if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('**Isticmaal:** `?give @user btc 200`').setColor('#e74c3c')] });
    }

    if (target.id === userId) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ Adiga naftu lacag uma dirin kartid.').setColor('#e74c3c')] });
    }

    if (target.bot) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ Bot-ka lacag uma dirin kartid.').setColor('#e74c3c')] });
    }

    const asset  = (args[1] || '').toLowerCase();
    const amount = parseInt(args[2], 10);

    // ── Player mode: btc/gold peer-to-peer ──
    if (!['btc', 'gold'].includes(asset) || isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Isticmaal:** `?give @user btc 200` ama `?give @user gold 300`')
            .setColor('#e74c3c')] });
    }

    checkEconUser(userId);
    checkEconUser(target.id);
    const d  = econData[userId];
    const dt = econData[target.id];

    if ((d[asset] || 0) < amount) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ Ma haysid **${fmt(amount)} ${ASSET_LABELS[asset]}** si aad u dirtid.`)
            .setColor('#e74c3c')] });
    }

    d[asset]  = (d[asset]  || 0) - amount;
    dt[asset] = (dt[asset] || 0) + amount;
    saveEcon();

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Lacag La Diray!')
        .setColor('#2ecc71')
        .setDescription(
            `✅ **${fmt(amount)} ${ASSET_LABELS[asset]}** waxaad u diray\n\n` +
            `Hadhaagaaga: **${fmt(d[asset])} ${ASSET_LABELS[asset]}**`
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
