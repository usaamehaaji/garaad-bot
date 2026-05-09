// =====================================================================
// CIYAARTA RUSH MODE — Garaad Quiz
// • Hadda waxaa la dooran karaa tirada su'aalaha (sida solo/duel)
// • Marka aad khaldid → ciyaartu way dhamaaneysaa (IQ lama taabanayo)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData, activeRush } = require('../store');
const { addXp, checkUser }               = require('../utils/helpers');
const { pickQuestionsForGame, markSeenForGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { markUserPlayed }                 = require('../utils/reminders');
const { RUSH_TIME_MS, RUSH_WRONG_PENALTY } = require('../config');

async function sendRushQuestion(messageOrInteraction, userId, currentMsg = null) {
    const state = activeRush.get(userId);
    if (!state) return;

    // ⭐ Hubi haddii ciyaartu xadkii gaartay (totalQ)
    if (state.currentQ >= state.totalQ) {
        return endRush(currentMsg, userId, null, '🏆 Waad ku guulaysatay! Dhammaan su\'aalaha waad jawaabtay!', true);
    }

    // Soo qaado su'aalo dheeri ah haddii lagu jiro batch dhammaaday
    if (state.questions.length === 0) {
        const remaining = state.totalQ - state.currentQ;
        const more = pickQuestionsForGame(userId, 'rush', Math.min(remaining, 50));
        if (!more) {
            activeRush.delete(userId);
            const doneEmbed = noQuestionsLeftEmbed(`Score: ${state.score}/${state.totalQ}`);
            if (currentMsg) return currentMsg.edit({ embeds: [doneEmbed], components: [] }).catch(() => {});
            return messageOrInteraction.reply({ embeds: [doneEmbed] });
        }
        state.questions = more;
    }

    const q = state.questions.shift();
    state.currentQ++;
    markSeenForGame(userId, 'rush', q._idx);
    saveData();

    const embed = new EmbedBuilder()
        .setTitle(`⚡ Rush — Su'aal ${state.currentQ}/${state.totalQ} | Score: ${state.score}`)
        .setDescription(`## ${q.question}\n\n⏱️ **${RUSH_TIME_MS / 1000} ilbiriqsi oo kaliya!**`)
        .setColor('#e91e63');

    const buttons = q.options.map((opt, index) =>
        new ButtonBuilder()
            .setCustomId(`rush_${index}_${userId}_${opt === q.correct ? 't' : 'f'}`)
            .setLabel(opt)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    let msg;
    if (currentMsg) {
        msg = await currentMsg.edit({ embeds: [embed], components: [row] }).catch(() => null);
    } else {
        msg = await messageOrInteraction.reply({ embeds: [embed], components: [row], fetchReply: true }).catch(() => null);
    }
    if (!msg) { activeRush.delete(userId); return; }

    const filter    = i => i.user.id === userId && i.customId.startsWith('rush_');
    const collector = msg.createMessageComponentCollector({ filter, time: RUSH_TIME_MS, max: 1 });

    collector.on('end', async collected => {
        const curState = activeRush.get(userId);
        if (!curState) return;

        if (collected.size === 0) {
            // ⭐ Wakhti dhammaaday — IQ lama taabanayo, economy XP penalty yar
            checkUser(userId);
            userData[userId].xp = Math.max(0, (userData[userId].xp || 0) - RUSH_WRONG_PENALTY);
            saveData();
            return endRush(msg, userId, q.correct, `⏰ Wakhti dhammaaday! −${RUSH_WRONG_PENALTY} XP`);
        }

        const interaction = collected.first();
        const isCorrect   = interaction.customId.endsWith('_t');

        if (!isCorrect) {
            // ⭐ Khalad — IQ lama taabanayo, economy XP penalty yar
            checkUser(userId);
            userData[userId].xp = Math.max(0, (userData[userId].xp || 0) - RUSH_WRONG_PENALTY);
            saveData();
            return endRush(msg, userId, q.correct, `❌ Khalad! −${RUSH_WRONG_PENALTY} XP`);
        }

        curState.score++;
        addXp(userId, 2);
        saveData();

        setTimeout(() => sendRushQuestion(messageOrInteraction, userId, msg), 600);
    });
}

async function endRush(msg, userId, correctAnswer, reason, finishedAll = false) {
    const state = activeRush.get(userId);
    if (!state) return;

    const finalScore = state.score;
    const totalQ     = state.totalQ;
    checkUser(userId);
    const prevBest   = userData[userId].stats.rushBest || 0;
    const newRecord  = finalScore > prevBest;

    if (newRecord) userData[userId].stats.rushBest = finalScore;
    activeRush.delete(userId);
    markUserPlayed(userId);
    saveData();

    const correctLine = correctAnswer ? `Jawaabta saxda: **${correctAnswer}**\n` : '';
    const embed = new EmbedBuilder()
        .setTitle('⚡ Rush Mode — Dhamaaday')
        .setDescription(
            `${reason}\n${correctLine}\n` +
            `🏁 Score: **${finalScore}/${totalQ}** su'aalood\n` +
            `🏆 Record-kaaga: **${userData[userId].stats.rushBest}**` +
            (newRecord ? '\n\n🎉 **RECORD CUSUB!** Barakallah!' : '')
        )
        .setColor(newRecord || finishedAll ? '#2ecc71' : '#e74c3c');

    if (msg) {
        await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
    }
}

module.exports = { sendRushQuestion, endRush };
