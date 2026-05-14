const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData }                       = require('../store');
const { checkUser, addXp }                         = require('../utils/helpers');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../economy/econStore');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold', diamond: '💎 Diamond', ring: '💍 Ring' };

function pickReward() {
    const roll = Math.random();
    if (roll < 0.30) {
        return { type: 'iq',  amount: Math.floor(Math.random() * 6) + 5 };   // 5–10 IQ
    } else if (roll < 0.55) {
        return { type: 'xp',  amount: Math.floor(Math.random() * 151) + 50 }; // 50–200 XP
    } else if (roll < 0.80) {
        return { type: 'usd', amount: Math.floor(Math.random() * 201) + 50 }; // $50–$250
    } else {
        const assets = Object.keys(ASSET_LABELS);
        return { type: 'asset', asset: assets[Math.floor(Math.random() * assets.length)], amount: 1 };
    }
}

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

    const reward = pickReward();
    const u = userData[userId];
    const d = econData[userId];
    u.lastDaily = Date.now();

    let rewardLine = '';
    if (reward.type === 'iq') {
        u.iq = (u.iq || 0) + reward.amount;
        rewardLine = `🧠 **+${reward.amount} IQ**`;
    } else if (reward.type === 'xp') {
        addXp(userId, reward.amount);
        rewardLine = `✨ **+${reward.amount} XP**`;
    } else if (reward.type === 'usd') {
        d.usd += reward.amount;
        trackEarning(userId, reward.amount);
        rewardLine = `💵 **+$${reward.amount} USD**`;
    } else {
        d[reward.asset] += reward.amount;
        rewardLine = `${ASSET_LABELS[reward.asset]} **+${reward.amount} ${reward.asset.toUpperCase()}**`;
    }

    saveData();
    saveEcon();

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎁 Dhibco Maalinlaha — Waxaad Heshay!')
            .setDescription(
                `✅ Maanta nasiibkaagu waa:\n\n` +
                `${rewardLine}\n\n` +
                `Berri hore u soo noqo!`
            )
            .setColor('#2ecc71')
            .setFooter({ text: '24 saacadood kadib waa dib loo cusboonaysiinayaa.' })],
        components: [row],
    });
};
