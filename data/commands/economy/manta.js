const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../../economy/econStore');

const DAILY_AMOUNT = 500;
const ONE_DAY_MS   = 24 * 60 * 60 * 1000;
const BTC_ICON     = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';

module.exports = async function mantaCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    const elapsed = Date.now() - d.lastDaily;

    if (elapsed < ONE_DAY_MS) {
        const rem   = ONE_DAY_MS - elapsed;
        const hours = Math.floor(rem / 3600000);
        const mins  = Math.floor((rem % 3600000) / 60000);
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('💰 Daily Reward — On Cooldown')
                .setDescription(`You already claimed today's reward.\n\n**${hours}h ${mins}m** until next claim.`)
                .setColor('#e74c3c'),
        ]});
    }

    d.btc       = (d.btc || 0) + DAILY_AMOUNT;
    d.lastDaily = Date.now();
    trackEarning(userId, DAILY_AMOUNT);
    saveEcon();

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('💰 Daily Reward — Claimed!')
            .setThumbnail(BTC_ICON)
            .setDescription(`✅ **+${DAILY_AMOUNT} BTC** added to your wallet!\n\n₿ Balance: **${d.btc.toLocaleString()} BTC**`)
            .setColor('#2ecc71')
            .setFooter({ text: 'Come back tomorrow • Garaad Economy', iconURL: BTC_ICON }),
    ]});
};
