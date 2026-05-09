// =====================================================================
// AMARKA: ?today  —  Dhibco Maalinlaha (IQ + XP + Cash bonus)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser, addXp }   = require('../utils/helpers');
const { REWARDS }            = require('../config');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CASH_BONUS  = 50; // $50 lacag maalinlaha ah
const SOS_BONUS   = 2000; // 2,000 SOS maalinlaha

module.exports = async function todayCommand(message) {
    const userId = message.author.id;
    checkUser(userId);

    const lastDaily   = userData[userId].lastDaily || 0;
    const remaining   = COOLDOWN_MS - (Date.now() - lastDaily);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_today_${userId}`).setLabel('Iska xir').setStyle(ButtonStyle.Danger),
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

    const d = userData[userId];
    d.lastDaily   = Date.now();
    d.iq          = (d.iq || 0) + REWARDS.daily.iq;
    d.cash        = Math.round(((d.cash || 0) + CASH_BONUS) * 100) / 100;
    d.portfolio   = d.portfolio || {};
    d.portfolio.SOS = Math.round((d.portfolio.SOS || 0) + SOS_BONUS);
    addXp(userId, REWARDS.daily.xp);
    saveData();

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎁 Dhibco Maalinlaha — Waxaad Heshay!')
            .setDescription(
                `✅ Maanta waxaad hesheysaa:\n\n` +
                `🧠 **+${REWARDS.daily.iq} IQ**\n` +
                `✨ **+${REWARDS.daily.xp} XP**\n` +
                `💵 **+$${CASH_BONUS} Cash**\n` +
                `🇸🇴 **+${SOS_BONUS.toLocaleString()} SOS**\n\n` +
                `Berri hore u soo noqo!\n_?manta si aad u hesho dakhlig dhaqaale dheeraad ah_`
            )
            .setColor('#2ecc71')
            .setFooter({ text: '24 saacadood kadib waa dib loo cusboonaysiinayaa.' })],
        components: [row],
    });
};
