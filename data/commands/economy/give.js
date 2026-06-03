const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };

module.exports = async function giveCmd(message, args) {
    const userId = message.author.id;
    let target = message.mentions.users.first();

    if (!target && message.reference?.messageId) {
        const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (refMsg && refMsg.author && !refMsg.author.bot) {
            target = refMsg.author;
        }
    }

    if (!target) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Usage:** `?give @user btc 200` · `?give @user gold 300` · `?give @user 300`
`Or reply to a user message with: `?give 300` or `?give gold 300`')
            .setColor('#e74c3c')] });
    }

    if (target.id === userId)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't send to yourself.").setColor('#e74c3c')] });
    if (target.bot)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't send to a bot.").setColor('#e74c3c')] });

    let asset  = 'btc';
    let amount = NaN;

    if (message.mentions.users.first()) {
        asset  = (args[1] || '').toLowerCase();
        amount = parseInt(args[2], 10);

        if ((args.length === 2 || !args[2]) && !isNaN(parseInt(args[1], 10))) {
            asset  = 'btc';
            amount = parseInt(args[1], 10);
        }
    } else {
        asset  = (args[0] || '').toLowerCase();
        amount = parseInt(args[1], 10);

        if ((args.length === 1 || !args[1]) && !isNaN(parseInt(args[0], 10))) {
            asset  = 'btc';
            amount = parseInt(args[0], 10);
        }
    }

    if (!['btc', 'gold'].includes(asset) || isNaN(amount) || amount <= 0)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Usage:** `?give @user btc 200` · `?give @user gold 300` · `?give @user 300`
`Or reply to a user message with: `?give 300` or `?give gold 300`')
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
