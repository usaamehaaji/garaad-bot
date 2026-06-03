const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };

function buildUsageEmbed() {
    return new EmbedBuilder()
        .setDescription(
            `**Usage:** ` +
            `\`?give @user 300\` • \`?give @user gold 300\` • \`?give 300\` (reply to a user's message)\n` +
            `BTC transfers must use wallets only: \`?btc send 200\``
        )
        .setColor('#e74c3c');
}

async function resolveReplyTarget(message) {
    if (!message.reference?.messageId) return null;

    const refChannel = message.reference.channelId
        ? await message.client.channels.fetch(message.reference.channelId).catch(() => null)
        : message.channel;

    if (!refChannel || !refChannel.isTextBased()) return null;

    const refMsg = await refChannel.messages.fetch(message.reference.messageId).catch(() => null);
    if (!refMsg || !refMsg.author || refMsg.author.bot) return null;
    return refMsg.author;
}

module.exports = async function giveCmd(message, args) {
    const userId = message.author.id;
    const mentionTarget = message.mentions.users.first();
    const replyTarget   = mentionTarget ? null : await resolveReplyTarget(message);
    const target        = mentionTarget || replyTarget;

    if (!target) {
        return message.reply({ embeds: [buildUsageEmbed()] });
    }

    if (target.id === userId)
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ You cannot send money to yourself.').setColor('#e74c3c')] });

    if (target.bot)
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ You cannot send money to a bot.').setColor('#e74c3c')] });

    let asset = 'btc';
    let amount = NaN;

    if (mentionTarget) {
        const token = (args[1] || '').toLowerCase();
        if (!token) return message.reply({ embeds: [buildUsageEmbed()] });

        if (token === 'btc') {
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription('⚠️ BTC transfers are not allowed with `?give`. Use `?btc send <amount>` instead.')
                .setColor('#e74c3c')] });
        }

        if (token === 'gold') {
            asset = 'gold';
            amount = parseInt(args[2], 10);
        } else if (!isNaN(parseInt(token, 10))) {
            amount = parseInt(token, 10);
        } else {
            return message.reply({ embeds: [buildUsageEmbed()] });
        }
    } else {
        const token = (args[0] || '').toLowerCase();
        if (!token) return message.reply({ embeds: [buildUsageEmbed()] });

        if (token === 'btc') {
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription('⚠️ BTC transfers are not allowed with `?give`. Use `?btc send <amount>` instead.')
                .setColor('#e74c3c')] });
        }

        if (token === 'gold') {
            asset = 'gold';
            amount = parseInt(args[1], 10);
        } else if (!isNaN(parseInt(token, 10))) {
            amount = parseInt(token, 10);
        } else {
            return message.reply({ embeds: [buildUsageEmbed()] });
        }
    }

    if (!Number.isInteger(amount) || amount <= 0)
        return message.reply({ embeds: [buildUsageEmbed()] });

    checkEconUser(userId);
    checkEconUser(target.id);

    const sender = econData[userId];
    const receiver = econData[target.id];

    if ((sender[asset] || 0) < amount)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ You don't have enough **${fmt(amount)} ${ASSET_LABELS[asset]}** to send.`)
            .setColor('#e74c3c')] });

    sender[asset] = (sender[asset] || 0) - amount;
    receiver[asset] = (receiver[asset] || 0) + amount;
    saveEcon();

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Transfer Sent!')
        .setColor('#2ecc71')
        .setDescription(`**${message.author.username}** → **${target.username}**`)
        .addFields(
            { name: '💰 Amount',        value: `**${fmt(amount)} ${ASSET_LABELS[asset]}**`, inline: true },
            { name: '📊 Your Balance',  value: `**${fmt(sender[asset])} ${ASSET_LABELS[asset]}**`, inline: true },
            { name: '📊 Their Balance', value: `**${fmt(receiver[asset])} ${ASSET_LABELS[asset]}**`, inline: true },
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
