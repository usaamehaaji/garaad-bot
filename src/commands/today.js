const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData }              = require('../store');
const { checkUser }                       = require('../utils/helpers');
const { econData, checkEconUser, saveEcon } = require('../economy/econStore');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BTC_ICON  = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';
const DAILY_BTC = 250;

module.exports = async function todayCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    checkEconUser(userId);

    const lastDaily = userData[userId].lastDaily || 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastDaily);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_today_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    if (remaining > 0) {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const mins  = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⏳ Cooldown — Dhibco Maalinlaha')
                .setDescription(`Waxaad sug kartaa **${hours} saac iyo ${mins} daqiiqo** oo dhiman ka dib isku day.`)
                .setColor('#e67e22')],
            components: [row],
        });
    }

    const d = econData[userId];
    userData[userId].lastDaily = Date.now();

    const iqGain = Math.floor(Math.random() * 9) + 5;
    userData[userId].iq = (userData[userId].iq || 0) + iqGain;

    d.btc = (d.btc || 0) + DAILY_BTC;

    saveData();
    saveEcon();

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎁 Dhibco Maalinlaha — Waxaad Heshay!')
            .setThumbnail(BTC_ICON)
            .setDescription(
                `✅ Maanta abaalmarinta:\n\n` +
                `🧠 **+${iqGain} IQ**\n` +
                `₿ **+${DAILY_BTC} BTC**\n\n` +
                `Berri hore u soo noqo!`
            )
            .setColor('#2ecc71')
            .setFooter({ text: '24 saacadood kadib waa dib loo cusboonaysiinayaa.', iconURL: BTC_ICON })],
        components: [row],
    });
};
