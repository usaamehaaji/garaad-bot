// =====================================================================
// AMARKA: ?bet [xaddi]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData, activeBets, isUserBusy } = require('../store');
const { pickQuestionsForGame, markSeenForGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { markUserPlayed } = require('../utils/reminders');
const { PREFIX, GLOBAL_WAIT_MS } = require('../config');
const { checkUser } = require('../utils/helpers');

module.exports = async function betCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);

    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
        return message.reply(`Isticmaal sidan: \`${PREFIX}bet 10\``);
    }
    userData[userId].cash ??= Number.isFinite(userData[userId].usdBalance) ? userData[userId].usdBalance : 0;
    if (amount > (userData[userId].cash || 0)) {
        return message.reply(`⚠️ Cash-kaagu ma filna! Waxaad haysataa kaliya **$${(userData[userId].cash || 0).toFixed(2)}**.`);
    }

    const picked = pickQuestionsForGame(userId, 'bet', 1);
    if (!picked) {
        return message.reply({ embeds: [noQuestionsLeftEmbed(message.author.username)] });
    }

    const q = picked[0];
    markSeenForGame(userId, 'bet', q._idx);
    markUserPlayed(userId);
    saveData();

    activeBets.set(userId, { amount, correct: q.correct });

    const embed = new EmbedBuilder()
        .setTitle(`💰 Khamaar — $${amount} cash`)
        .setDescription(
            `## ${q.question}\n\n` +
            `⏱️ ${GLOBAL_WAIT_MS / 1000} ilbiriqsi — su'aal aad u adag!\n` +
            `**Sax:** +$${Math.floor(amount * 0.5)} cash | **Qalad:** −$${amount} cash`
        )
        .setColor('#f39c12');

    const buttons = q.options.map((opt, index) =>
        new ButtonBuilder()
            .setCustomId(`bet_${index}_${userId}_${opt === q.correct ? 't' : 'f'}_${amount}`)
            .setLabel(opt)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await message.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter    = i => i.user.id === userId && i.customId.startsWith('bet_');
    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS, max: 1 });

    collector.on('end', collected => {
        if (collected.size === 0 && activeBets.has(userId)) {
            const bet = activeBets.get(userId);
            userData[userId].cash = Math.max(0, (userData[userId].cash || 0) - bet.amount);
            userData[userId].stats.betsLost++;
            activeBets.delete(userId);
            saveData();

            const timeoutEmbed = EmbedBuilder.from(embed).setFields({
                name: 'Natiijo',
                value: `⏰ Wakhti dhammaaday! −$${bet.amount} cash\nJawaabta saxda: **${bet.correct}**`,
            });
            msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
};
