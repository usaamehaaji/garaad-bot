// =====================================================================
// AMARKA: ?kubays <amount> — Kubays (Slots Machine)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser }          = require('../utils/helpers');

const MIN_BET = 10;
const MAX_BET = 5_000;

const REELS = ['🍒', '🍊', '🍋', '🍇', '🔔', '⭐', '💎'];
const WEIGHTS = [30, 25, 20, 12, 8, 4, 1]; // 💎 ugu yar

function spin() {
    const total = WEIGHTS.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < REELS.length; i++) {
        r -= WEIGHTS[i];
        if (r <= 0) return REELS[i];
    }
    return REELS[0];
}

function getMultiplier(r1, r2, r3) {
    if (r1 === r2 && r2 === r3) {
        if (r1 === '💎') return { mult: 10, label: '💎 JACKPOT! 10×' };
        if (r1 === '⭐') return { mult: 5,  label: '⭐ SUPER! 5×' };
        if (r1 === '🔔') return { mult: 4,  label: '🔔 Weyn! 4×' };
        return { mult: 3, label: '🎉 Saddex isla mid! 3×' };
    }
    if (r1 === r2 || r2 === r3 || r1 === r3) {
        return { mult: 0, label: '↩️ Laba isla mid — Lacag dib' };  // return bet
    }
    return { mult: -1, label: '❌ Wax ma jiro' };
}

module.exports = async function kubaysCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const d    = userData[userId];
    const cash = d.cash || 0;

    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount) || amount < MIN_BET) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🎰 Kubays — Slots Machine')
                .setColor('#9b59b6')
                .setDescription(
                    `**Sida loo isticmaalo:** \`?kubays <lacag>\`\n\n` +
                    `> **Guulaha:**\n` +
                    `> 💎💎💎 — **10×** JACKPOT!\n` +
                    `> ⭐⭐⭐ — **5×** SUPER\n` +
                    `> 🔔🔔🔔 — **4×** Weyn\n` +
                    `> 3 isla mid — **3×**\n` +
                    `> 2 isla mid — **lacag dib** (0 khasaaro)\n` +
                    `> Kala duwan — **khasaaro**\n\n` +
                    `💵 Kaydkaaga: **$${cash.toLocaleString()}**\n` +
                    `📌 Ugu yaraan: **$${MIN_BET}** · Ugu badan: **$${MAX_BET.toLocaleString()}**`
                )
                .setFooter({ text: 'Tusaale: ?kubays 50' })],
        });
    }

    if (amount > cash) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('❌ Lacag Kuma Filan')
                .setColor('#e74c3c')
                .setDescription(`Waxaad rabta **$${amount.toLocaleString()}** laakiin kaydkaagu wuxuu leeyahay **$${cash.toLocaleString()}** kaliya.\n\n\`?manta\` isku day si aad u hesho dakhli!`)],
        });
    }

    const bet = Math.min(amount, MAX_BET);
    const r1 = spin(), r2 = spin(), r3 = spin();
    const { mult, label } = getMultiplier(r1, r2, r3);

    let profit = 0;
    if (mult === -1) {
        profit = -bet;
        d.cash = Math.round((cash - bet) * 100) / 100;
    } else if (mult === 0) {
        profit = 0; // return bet (no change)
    } else {
        profit = bet * (mult - 1);
        d.cash = Math.round((cash + profit) * 100) / 100;
    }
    saveData();

    const isWin     = profit > 0;
    const isReturn  = mult === 0;
    const color     = isWin ? '#f1c40f' : (isReturn ? '#95a5a6' : '#e74c3c');

    const profitLine = isWin
        ? `🟢 **+$${profit.toLocaleString()}** faa'iido`
        : isReturn
            ? `↩️ Lacagta dib ayaad u heshay`
            : `🔴 **-$${bet.toLocaleString()}** khasaaro`;

    const brokeNote = d.cash < 50
        ? `\n\n⚠️ Lacagtu aad u yartay! Isku day \`?shaqo\` ama \`?manta\`.`
        : '';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎰 Kubays — Slots Machine')
        .setDescription(
            `> **Dhigan:** $${bet.toLocaleString()}\n\n` +
            `# ${r1}  ${r2}  ${r3}\n\n` +
            `**${label}**\n` +
            `${profitLine}\n` +
            `💵 Naqdiga: **$${d.cash.toLocaleString()}**` + brokeNote
        )
        .setFooter({ text: '?cashflip coin flip · ?kubays mar kale' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`kubays_again_${userId}_${bet}`)
            .setLabel(`🎰 Mar kale $${bet.toLocaleString()}`)
            .setStyle(isWin ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(d.cash < bet),
        new ButtonBuilder()
            .setCustomId(`close_kubays_${userId}`)
            .setLabel('Ka bax')
            .setStyle(ButtonStyle.Secondary),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
