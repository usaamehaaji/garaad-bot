const { EmbedBuilder } = require('discord.js');
const { userData } = require('../store');
const { checkUser } = require('../utils/helpers');
const { getMarketState } = require('../games/marketManager');

function formatCurrency(value) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPortfolioValue(user, market) {
    const cash = Number.isFinite(user.cash) ? user.cash : (Number.isFinite(user.usdBalance) ? user.usdBalance : 0);
    const p = user.portfolio || {};
    return cash
        + (p.BTC || 0) * market.btcPrice
        + (p.EUR || 0) * market.eurPrice
        + (p.GOLD || 0) * market.goldPrice
        + (p.MAT || 0) * market.matPrice;
}

module.exports = async function jeebCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);

    const market = getMarketState();
    const lower = args[0] ? args[0].toLowerCase() : '';
    if (lower === 'top') {
        const leaderboard = Object.entries(userData)
            .map(([id, data]) => ({
                id,
                total: getPortfolioValue(data, market),
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const description = leaderboard.length
            ? leaderboard
                  .map((entry, index) => `${index + 1}. <@${entry.id}> — $${formatCurrency(entry.total)}`)
                  .join('\n')
            : 'Wali ma jirto tartan ku filan.';

        const embed = new EmbedBuilder()
            .setTitle('🏆 Jeebkaaga - Hantida Suuqa')
            .setDescription(description)
            .setColor('#2ecc71')
            .setFooter({ text: 'Qiimaha hantida waxaa lagu xisaabiyaa USD iyo SOS / Crypto hadda.' });

        return message.reply({ embeds: [embed] });
    }

    const mention = message.mentions.users.first();
    const target = mention || message.author;
    const targetId = target.id;

    if (!userData[targetId]) {
        checkUser(targetId);
    }

    const user = userData[targetId];
    const portfolioUsd = getPortfolioValue(user, market);
    const hidden = user.hiddenUntil && user.hiddenUntil > Date.now();
    const shieldActive = (user.shieldActiveUntil || 0) > Date.now();
    const shieldText = shieldActive
        ? `Active (${Math.ceil((user.shieldActiveUntil - Date.now()) / (60 * 1000))} min)`
        : '—';
    const cash = Number.isFinite(user.cash) ? user.cash : (Number.isFinite(user.usdBalance) ? user.usdBalance : 0);
    const p = user.portfolio || {};

    const embed = new EmbedBuilder()
        .setTitle(`💼 Jeebka — ${target.username}`)
        .setColor('#2980b9')
        .addFields(
            { name: 'Cash', value: `$${formatCurrency(cash)}`, inline: true },
            { name: 'XP', value: `${(user.xp || 0).toLocaleString()} XP`, inline: true },
            { name: 'Shield', value: shieldText, inline: true },
            { name: 'Crypto / Forex', value: `BTC: **${(p.BTC || 0).toFixed(3)}**\nEUR: **${(p.EUR || 0).toFixed(0)}**`, inline: true },
            { name: 'Gold / Materials', value: `GOLD: **${(p.GOLD || 0).toFixed(2)} oz**\nMAT: **${(p.MAT || 0).toFixed(0)}**`, inline: true },
            { name: 'Total Portfolio (USD)', value: `$${formatCurrency(portfolioUsd)}`, inline: true },
            { name: 'IQ (Quiz)', value: `${(user.iq || 0).toLocaleString()} IQ`, inline: true },
            { name: 'Sirta', value: user.password ? 'Haa' : 'Maya', inline: true },
            { name: 'Dhumasho Hawlgawa', value: hidden ? 'Haa (qarsoon)' : 'Maya', inline: true },
        );

    return message.reply({ embeds: [embed] });
};
