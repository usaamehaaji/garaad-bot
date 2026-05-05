// =====================================================================
// AMARKA: ?trade / ?forex / ?crypto
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { buildTradeEmbed, executeTrade } = require('../games/trade');
const { userData } = require('../store');
const { checkUser } = require('../utils/helpers');

function parseTradeArgs(args) {
    // ?trade buy BTC 0.02
    const action = (args[0] || '').toLowerCase();
    const asset = (args[1] || '').toUpperCase();
    const amountRaw = args[2];
    const amount = amountRaw !== undefined ? Number(amountRaw) : undefined;
    if (!['buy', 'sell'].includes(action)) return null;
    if (!['BTC', 'EUR', 'GOLD', 'MAT'].includes(asset)) return null;
    if (amountRaw !== undefined && (!Number.isFinite(amount) || amount <= 0)) return null;
    return { action, asset, amount };
}

module.exports = async function tradeCommand(message, args = []) {
    const userId = message.author.id;
    checkUser(userId);

    const user = userData[userId];
    if (!user.password) {
        const embed = new EmbedBuilder()
            .setTitle('🔒 ?trade — Password Required')
            .setDescription('Fadlan samee password 4-lambar ah adoo isticmaalaya `?password 1234` ka hor intaadan bilaabin trade.')
            .setColor('#e74c3c');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`trade_password_${userId}`)
                .setLabel('Samee Password')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`trade_close_${userId}`)
                .setLabel('Xidh')
                .setStyle(ButtonStyle.Danger),
        );

        return message.reply({ embeds: [embed], components: [row] });
    }

    // Text-based trade (optional)
    const parsed = parseTradeArgs(args);
    if (parsed) {
        const result = executeTrade(userId, parsed.asset, parsed.action, parsed.amount);
        const embed = buildTradeEmbed(userId);
        if (!result.success) return message.reply({ content: result.message, embeds: [embed] });
        return message.reply({ content: result.message, embeds: [embed] });
    }

    const embed = buildTradeEmbed(userId);

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`trade_buy_BTC_${userId}`)
            .setLabel('Iibso BTC')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`trade_sell_BTC_${userId}`)
            .setLabel('Iibi BTC')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`trade_buy_EUR_${userId}`)
            .setLabel('Iibso EUR')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`trade_sell_EUR_${userId}`)
            .setLabel('Iibi EUR')
            .setStyle(ButtonStyle.Danger),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`trade_buy_GOLD_${userId}`)
            .setLabel('Iibso GOLD')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`trade_sell_GOLD_${userId}`)
            .setLabel('Iibi GOLD')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`trade_buy_MAT_${userId}`)
            .setLabel('Iibso MAT')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`trade_sell_MAT_${userId}`)
            .setLabel('Iibi MAT')
            .setStyle(ButtonStyle.Danger),
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`trade_wallet_${userId}`)
            .setLabel('Jeebkaaga')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`trade_refresh_${userId}`)
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`trade_close_${userId}`)
            .setLabel('Xidh')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row1, row2, row3] });
};
