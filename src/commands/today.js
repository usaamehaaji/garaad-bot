const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData }                = require('../store');
const { checkUser }                         = require('../utils/helpers');
const { econData, checkEconUser, saveEcon } = require('../economy/econStore');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DAILY_BTC   = 250;
const TOPGG_URL   = 'https://top.gg/bot/1495341089266073705';

module.exports = async function todayCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    checkEconUser(userId);

    const lastDaily  = userData[userId].lastDaily || 0;
    const remaining  = COOLDOWN_MS - (Date.now() - lastDaily);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setURL(TOPGG_URL).setLabel('🗳️ Vote Garaad Bot').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setCustomId(`close_today_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );

    if (remaining > 0) {
        const hours = Math.floor(remaining / 3600000);
        const mins  = Math.floor((remaining % 3600000) / 60000);
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⏳ Cooldown — Dhibco Maalinlaha')
                .setDescription(`Waxaad sug kartaa **${hours}s ${mins}d** oo dhiman ka dib isku day.`)
                .setColor('#e67e22')],
            components: [row],
        });
    }

    const iqGain = Math.floor(Math.random() * 9) + 5;
    userData[userId].iq       = (userData[userId].iq || 0) + iqGain;
    userData[userId].lastDaily = Date.now();
    econData[userId].btc       = (econData[userId].btc || 0) + DAILY_BTC;
    saveData();
    saveEcon();

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎁 Dhibco Maalinlaha — Waxaad Heshay!')
            .setDescription(
                `✅ Maanta abaalmarinta:\n\n` +
                `🧠 **+${iqGain} IQ**\n` +
                `₿ **+${DAILY_BTC} BTC**\n\n` +
                `Berri hore u soo noqo!`
            )
            .setColor('#2ecc71')
            .setFooter({ text: '24 saacadood kadib waa dib loo cusboonaysiinayaa.' })],
        components: [row],
    });
};
