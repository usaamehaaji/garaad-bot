const { EmbedBuilder } = require('discord.js');
const { fmt } = require('../../../utils/helpers');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../../economy/econStore');

const DAILY_AMOUNT = 500;
const ONE_DAY_MS   = 24 * 60 * 60 * 1000;

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
                .setTitle('💰 Manta')
                .setDescription(`⏳ Weli waqtiga kuma dhaafin.\n\n**${hours}s ${mins}d** ka dib dib u tijaabi.`)
                .setColor('#e74c3c'),
        ]});
    }

    d.usd      += DAILY_AMOUNT;
    d.lastDaily = Date.now();
    trackEarning(userId, DAILY_AMOUNT);
    saveEcon();

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('💰 Manta — Lacagta Maanta')
            .setDescription(`✅ **$${DAILY_AMOUNT} USD** heshay!\n\n💵 USD-kaaga: **$${fmt(d.usd)}**`)
            .setColor('#2ecc71')
            .setFooter({ text: 'Berri dib u kaalay • Garaad Economy' }),
    ]});
};
