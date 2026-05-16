const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData }                       = require('../store');
const { checkUser }                                = require('../utils/helpers');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../economy/econStore');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

    const u = userData[userId];
    const d = econData[userId];
    u.lastDaily = Date.now();

    // IQ: 5–12 had iyo jeer
    const iqGain = Math.floor(Math.random() * 8) + 5;
    u.iq = (u.iq || 0) + iqGain;

    // USD: $50–$300 (xad $1,000/maalin)
    const usdRaw = Math.floor(Math.random() * 251) + 50;
    const today = new Date().toISOString().slice(0, 10);
    d.todayEarned ??= { date: '', usd: 0 };
    if (d.todayEarned.date !== today) d.todayEarned = { date: today, usd: 0 };
    const usdLeft   = Math.max(0, 1000 - d.todayEarned.usd);
    const usdActual = Math.min(usdRaw, usdLeft);
    if (usdActual > 0) {
        d.usd += usdActual;
        trackEarning(userId, usdActual);
        d.todayEarned.usd += usdActual;
    }

    saveData();
    saveEcon();

    const usdLine = usdActual > 0
        ? `💵 **+$${usdActual} USD**`
        : `💵 USD — **$1,000 xad maanta gaadhay**`;

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎁 Dhibco Maalinlaha — Waxaad Heshay!')
            .setDescription(
                `✅ Maanta abaalmarinta:\n\n` +
                `🧠 **+${iqGain} IQ**\n` +
                `${usdLine}\n\n` +
                `Berri hore u soo noqo!`
            )
            .setColor('#2ecc71')
            .setFooter({ text: '24 saacadood kadib waa dib loo cusboonaysiinayaa.' })],
        components: [row],
    });
};
