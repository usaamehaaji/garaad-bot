const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };

module.exports = async function giveCmd(message, args) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target)
        return message.reply({ embeds: [new EmbedBuilder().setDescription('**Usage:** `?give @user btc 200` or `?give @user gold 300`').setColor('#e74c3c')] });
    if (target.id === userId)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't send to yourself.").setColor('#e74c3c')] });
    if (target.bot)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't send to a bot.").setColor('#e74c3c')] });

    let asset  = (args[1] || '').toLowerCase();
    let amount = parseInt(args[2], 10);

    if ((args.length === 2 || !args[2]) && !isNaN(parseInt(args[1], 10))) {
        asset  = 'btc';
        amount = parseInt(args[1], 10);
    }

    if (!['btc', 'gold'].includes(asset) || isNaN(amount) || amount <= 0)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Usage:** `?give @user btc 200` · `?give @user gold 300` · `?give @user 300`')
            .setColor('#e74c3c')] });

    // ── BTC / Gold ──
    checkEconUser(userId);
    checkEconUser(target.id);
    const d  = econData[userId];
    const dt = econData[target.id];

    if ((d[asset] || 0) < amount)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ You don't have **${fmt(amount)} ${ASSET_LABELS[asset]}** to send.`)
            .setColor('#e74c3c')] });

    d[asset]  = (d[asset]  || 0) - amount;
    dt[asset] = (dt[asset] || 0) + amount;
    saveEcon();

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Transfer Sent!')
        .setColor('#2ecc71')
        .setDescription(`**${message.author.username}** → **${target.username}**`)
        .addFields(
            { name: '💰 Amount',           value: `**${fmt(amount)} ${ASSET_LABELS[asset]}**`,   inline: true },
            { name: '📊 Your Balance',     value: `**${fmt(d[asset])} ${ASSET_LABELS[asset]}**`, inline: true },
            { name: '📊 Their Balance',    value: `**${fmt(dt[asset])} ${ASSET_LABELS[asset]}**`,inline: true },
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
