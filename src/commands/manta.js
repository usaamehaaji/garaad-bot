// =====================================================================
// AMARKA: ?manta  —  Dakhliga Maalinlaha (Economy Daily Reward)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser }          = require('../utils/helpers');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Abaalmarinta maalinlaha
const REWARDS = [
    { weight: 40, cash: 150, sos: 5_000,  gold: 0,       btc: 0,          label: '💵 $150 + 🇸🇴 5,000 SOS' },
    { weight: 30, cash: 200, sos: 10_000, gold: 0,       btc: 0,          label: '💵 $200 + 🇸🇴 10,000 SOS' },
    { weight: 15, cash: 100, sos: 15_000, gold: 0.001,   btc: 0,          label: '💵 $100 + 🇸🇴 15,000 SOS + 🟡 0.001 GOLD' },
    { weight: 10, cash: 300, sos: 20_000, gold: 0,       btc: 0,          label: '💵 $300 + 🇸🇴 20,000 SOS' },
    { weight: 4,  cash: 500, sos: 50_000, gold: 0.005,   btc: 0,          label: '💵 $500 + 🇸🇴 50,000 SOS + 🟡 0.005 GOLD' },
    { weight: 1,  cash: 200, sos: 10_000, gold: 0,       btc: 0.0001,     label: '💵 $200 + 🇸🇴 10,000 SOS + ₿ 0.0001 BTC 🎉 JACKPOT!' },
];

function pickReward() {
    const total = REWARDS.reduce((s, r) => s + r.weight, 0);
    let r = Math.random() * total;
    for (const rw of REWARDS) { r -= rw.weight; if (r <= 0) return rw; }
    return REWARDS[0];
}

module.exports = async function mantaCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    const d = userData[userId];

    const lastManta   = d.lastEconomyDaily || 0;
    const remaining   = COOLDOWN_MS - (Date.now() - lastManta);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_manta_${userId}`).setLabel('Iska xir').setStyle(ButtonStyle.Danger),
    );

    if (remaining > 0) {
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⏳ Weli Waqtigu Sima Dhammaanin')
                .setDescription(`Dakhliga maanta waxaad horeba u qaadatay.\n\nSug **${h} saac ${m} daqiiqo** — ka dib isku day!`)
                .setColor('#e67e22')],
            components: [row],
        });
    }

    const reward = pickReward();

    d.lastEconomyDaily       = Date.now();
    d.cash                   = Math.round(((d.cash || 0) + reward.cash) * 100) / 100;
    d.portfolio              = d.portfolio || {};
    d.portfolio.SOS          = Math.round((d.portfolio.SOS || 0) + reward.sos);
    if (reward.gold > 0)  d.portfolio.GOLD = ((d.portfolio.GOLD || 0) + reward.gold);
    if (reward.btc  > 0)  d.portfolio.BTC  = ((d.portfolio.BTC  || 0) + reward.btc);
    saveData();

    const embed = new EmbedBuilder()
        .setTitle('🎁 Dakhliga Maanta — Waxaad Heshay!')
        .setColor(reward.btc > 0 ? '#f39c12' : '#2ecc71')
        .setDescription(
            `${reward.label}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💵 Naqdiga Hadda: **$${d.cash.toLocaleString()}**\n` +
            `🇸🇴 SOS: **${(d.portfolio.SOS||0).toLocaleString()}**\n\n` +
            `Berri hore u soo noqo si aad mar kale u hesho!`
        )
        .setFooter({ text: '?suuqa — fiiri suuqa | ?trade — bilow ganacsi' });

    return message.reply({ embeds: [embed], components: [row] });
};
