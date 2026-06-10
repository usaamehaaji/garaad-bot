const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };

function buildUsageEmbed() {
    return new EmbedBuilder()
        .setDescription(
            `⚠️ **Qaabka saxda ah:**\n` +
            `Qof message-kiisa **reply** ka samee, kadibna qor:\n` +
            `\`?give 300\` ama \`?give gold 300\``
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

    // Kaliya reply ayaa la ogol yahay — mention ma shaqeyso
    const replyTarget = await resolveReplyTarget(message);

    if (!replyTarget) {
        return message.reply({ embeds: [buildUsageEmbed()] });
    }

    if (replyTarget.id === userId)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('⚠️ Adiga nafta lacag uguma diri kartid.')
            .setColor('#e74c3c')] });

    if (replyTarget.bot)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('⚠️ Bot-ka lacag uguma diri kartid.')
            .setColor('#e74c3c')] });

    // Parse asset iyo amount — ?give 300 ama ?give gold 300
    let asset = 'btc';
    let amount = NaN;

    const token = (args[0] || '').toLowerCase();
    if (!token) return message.reply({ embeds: [buildUsageEmbed()] });

    if (token === 'btc') {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('⚠️ BTC si toos ah looma diri karo. Isticmaal `?btc send <amount>`.')
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

    if (!Number.isInteger(amount) || amount <= 0)
        return message.reply({ embeds: [buildUsageEmbed()] });

    checkEconUser(userId);
    checkEconUser(replyTarget.id);

    const sender   = econData[userId];
    const receiver = econData[replyTarget.id];

    if ((sender[asset] || 0) < amount)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ **${fmt(amount)} ${ASSET_LABELS[asset]}** kugu filna ma lihid.`)
            .setColor('#e74c3c')] });

    sender[asset]   = (sender[asset]   || 0) - amount;
    receiver[asset] = (receiver[asset] || 0) + amount;
    saveEcon();

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Lacagta Waa La Diray!')
        .setColor('#2ecc71')
        .setDescription(`**${message.author.username}** → **${replyTarget.username}**`)
        .addFields(
            { name: '💰 Lacagta',        value: `**${fmt(amount)} ${ASSET_LABELS[asset]}**`,     inline: true },
            { name: '👛 Wallet-kaaga',   value: `**${fmt(sender[asset])} ${ASSET_LABELS[asset]}**`,   inline: true },
            { name: '👛 Wallet-kooda',   value: `**${fmt(receiver[asset])} ${ASSET_LABELS[asset]}**`,  inline: true },
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
