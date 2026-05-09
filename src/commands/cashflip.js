// =====================================================================
// AMARKA: ?cashflip <amount> — Lacagta Rog (Coin Flip)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser }          = require('../utils/helpers');

const MIN_BET = 10;
const MAX_BET = 10_000;

const SIDES = [
    { emoji: '🦅', name: 'Gees' },
    { emoji: '🌊', name: 'Gadaal' },
];

module.exports = async function cashflipCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const d = userData[userId];
    const cash = d.cash || 0;

    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount) || amount < MIN_BET) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🪙 Lacagta Rog — Cashflip')
                .setColor('#f39c12')
                .setDescription(
                    `**Sida loo isticmaalo:** \`?cashflip <lacag>\`\n\n` +
                    `> 🪙 Lacagta waa la tuuraa — **Gees** ama **Gadaal**\n` +
                    `> 🟢 **Guul** → Laba jeer ayaad heshaa (2×)\n` +
                    `> 🔴 **Khasaaro** → Dhigashadaadu waa la qaadaa\n\n` +
                    `💵 Kaydkaaga: **$${cash.toLocaleString()}**\n` +
                    `📌 Ugu yaraan: **$${MIN_BET}** · Ugu badan: **$${MAX_BET.toLocaleString()}**`
                )
                .setFooter({ text: 'Tusaale: ?cashflip 100' })],
        });
    }

    if (amount > cash) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('❌ Lacag Kuma Filan')
                .setColor('#e74c3c')
                .setDescription(`Waxaad rabta **$${amount.toLocaleString()}** laakiin kaydkaagu wuxuu leeyahay **$${cash.toLocaleString()}** kaliya.\n\n?manta isku day si aad u hesho dakhli!`)],
        });
    }

    const bet    = Math.min(amount, MAX_BET);
    const win    = Math.random() < 0.5;
    const result = SIDES[win ? 0 : 1];
    const other  = SIDES[win ? 1 : 0];

    if (win) {
        d.cash = Math.round((cash + bet) * 100) / 100;
    } else {
        d.cash = Math.round((cash - bet) * 100) / 100;
    }
    saveData();

    const brokeNote = d.cash < 50
        ? `\n\n⚠️ Lacagtu aad u yartay! Isku day \`?shaqo\` ama \`?manta\` si aad u hesho dakhli.`
        : '';

    const embed = new EmbedBuilder()
        .setColor(win ? '#2ecc71' : '#e74c3c')
        .setTitle(win ? '🪙 GUUL! Lacagta Rog' : '🪙 KHASAARO! Lacagta Rog')
        .setDescription(
            `> **Dhigan:** $${bet.toLocaleString()}\n\n` +
            `**${other.emoji} ${other.name}** · · · **${result.emoji} ${result.name}**\n\n` +
            (win
                ? `🟢 **${result.emoji} ${result.name}** ayaa soo baxday!\n💵 **+$${bet.toLocaleString()}** → Naqdiga: **$${d.cash.toLocaleString()}**`
                : `🔴 **${result.emoji} ${result.name}** ayaa soo baxday!\n💸 **-$${bet.toLocaleString()}** → Naqdiga: **$${d.cash.toLocaleString()}**`
            ) + brokeNote
        )
        .setFooter({ text: '?cashflip mar kale isku day · ?kubays slots' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`cashflip_again_${userId}_${bet}`)
            .setLabel(`🔄 Mar kale $${bet.toLocaleString()}`)
            .setStyle(win ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(d.cash < bet),
        new ButtonBuilder()
            .setCustomId(`close_cashflip_${userId}`)
            .setLabel('Ka bax')
            .setStyle(ButtonStyle.Secondary),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
