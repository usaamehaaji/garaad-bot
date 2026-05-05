// =====================================================================
// CIYAARTA DUEL — Garaad Quiz
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { userData, saveData, activeDuels } = require('../store');
const { checkUser, getLevel, addXp }      = require('../utils/helpers');
const { pickQuestionsForGame, markSeenForUsersInGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { markUserPlayed }                  = require('../utils/reminders');
const {
    GLOBAL_WAIT_MS,
    DUEL_MIN_QUESTIONS, DUEL_MAX_QUESTIONS, DUEL_DEFAULT_QUESTIONS, DUEL_WRONG_PENALTY,
} = require('../config');

function deductXp(userId, amount) {
    checkUser(userId);
    userData[userId].xp = Math.max(0, (userData[userId].xp || 0) - Math.max(0, amount || 0));
}

// ─────────────────────────────────────────────────────────────────────
// Bilow Duel — Hadda labadoodaba way dooran karaan tirada (sida solo)
// • count > 0  → toos buu u bilaabmayaa
// • count = 0  → bot wuxuu weydiinayaa labada qof, qofka ugu horreeya ee
//                lambar sax ah qora ayaa go'aaminaya tirada
// ─────────────────────────────────────────────────────────────────────
async function startDuelGame(channel, p1Id, p2Id, count = 0) {
    checkUser(p1Id);
    checkUser(p2Id);

    if (activeDuels.has(channel.id)) return;

    // ⭐ Haddii tirada aan la go'aaminin, weydii labada qof
    if (!count || count < DUEL_MIN_QUESTIONS || count > DUEL_MAX_QUESTIONS) {
        await channel.send(
            `🎯 <@${p1Id}> & <@${p2Id}> — imisa su'aalood ayaad rabtaan?\n` +
            `Mid kasta oo idinka mid ah ha qoro lambar **${DUEL_MIN_QUESTIONS}** ilaa **${DUEL_MAX_QUESTIONS}** ` +
            `(tusaale: \`5\` ama \`10\`).\n` +
            `_(30 ilbiriqsi ayaad heysataan — haddii kale duel waa la joojinayaa)_`
        );

        const filter = m =>
            (m.author.id === p1Id || m.author.id === p2Id) &&
            /^\d+$/.test(m.content.trim());

        const collected = await channel.awaitMessages({ filter, max: 1, time: 30000 });

        if (collected.size === 0) {
            return channel.send(`⏰ Wakhti dhammaaday — duel waa la joojiyay.`);
        }

        const num = parseInt(collected.first().content.trim());
        if (num < DUEL_MIN_QUESTIONS || num > DUEL_MAX_QUESTIONS) {
            return channel.send(
                `⚠️ Tirada waa inay u dhexeyso **${DUEL_MIN_QUESTIONS}** iyo **${DUEL_MAX_QUESTIONS}**. ` +
                `Duel waa la joojiyay.`
            );
        }
        count = num;
    }

    // Mar kale hubi xaalada ka dib sugida
    if (activeDuels.has(channel.id)) return;

    const picked = pickQuestionsForGame(p1Id, 'duel', count);
    if (!picked || picked.length === 0) {
        return channel.send({ embeds: [noQuestionsLeftEmbed('Hostka')] });
    }

    // ⭐ Haddii su'aalo cusub ka yar yihiin tirada la codsaday → ka warbixi
    let actualCount = picked.length;
    if (actualCount < count) {
        await channel.send(
            `📚 Waxaa kaliya hadhay **${actualCount}** su'aalood oo cusub (adigoo codsaday ${count}).\n` +
            `Duel-ku wuxuu socon doonaa **${actualCount}** su'aalood.`
        );
    }

    const duelState = {
        p1: p1Id, p2: p2Id,
        questions: picked,
        totalQ: actualCount,
        scores: { [p1Id]: 0, [p2Id]: 0 },
        currentQ: 0,
        answeredBy: new Set(),
        correctAnswerer: null,
        message: null,
    };
    activeDuels.set(channel.id, duelState);

    // Calaamadee labadooduba inay ciyaareen (reminder system)
    markUserPlayed(p1Id);
    markUserPlayed(p2Id);

    try {
        await channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('⚔️ Dagaalku wuu bilaabmay!')
                .setDescription(
                    `<@${p1Id}> 🆚 <@${p2Id}>\n\n` +
                    `**${count}** su'aalood. Qofka ugu horreeya ee si sax ah u jawaaba ayaa dhibicda helaya!\n` +
                    `Bilaabaya 3 ilbiriqsi gudahood...`
                )
                .setColor('#e67e22')],
        });
    } catch {
        activeDuels.delete(channel.id);
        return;
    }

    setTimeout(() => sendDuelQuestion(channel), 3000);
}

async function sendDuelQuestion(channel, currentMsg = null) {
    const state = activeDuels.get(channel.id);
    if (!state) return;

    if (state.currentQ >= state.totalQ) return finishDuel(channel, currentMsg);

    const qIndex = state.currentQ;
    const q      = state.questions[qIndex];
    markSeenForUsersInGame([state.p1, state.p2], 'duel', q._idx);
    saveData();

    state.answeredBy     = new Set();
    state.correctAnswerer = null;

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ Duel — Su'aal ${qIndex + 1}/${state.totalQ}`)
        .setDescription(
            `## ${q.question}\n\n` +
            `⏱️ ${GLOBAL_WAIT_MS / 1000} ilbiriqsi — qofka ugu horreeya ee sax ayaa dhibic helaya!\n\n` +
            `📊 <@${state.p1}>: **${state.scores[state.p1]}** | <@${state.p2}>: **${state.scores[state.p2]}**`
        )
        .setColor('#e74c3c');

    const buttons = q.options.map((opt, index) =>
        new ButtonBuilder()
            .setCustomId(`duel_q_${qIndex}_${index}_${opt === q.correct ? 't' : 'f'}`)
            .setLabel(opt)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    let msg;
    try {
        msg = currentMsg
            ? await currentMsg.edit({ embeds: [embed], components: [row] })
            : await channel.send({ embeds: [embed], components: [row] });
    } catch {
        activeDuels.delete(channel.id);
        return;
    }
    state.message = msg;

    const filter    = i => i.customId.startsWith(`duel_q_${qIndex}_`) && (i.user.id === state.p1 || i.user.id === state.p2);
    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS });

    collector.on('collect', async interaction => {
        const cur = activeDuels.get(channel.id);
        if (!cur || cur.currentQ !== qIndex) {
            return interaction.reply({ content: 'Su\'aashan way dhamaatay.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        if (cur.answeredBy.has(interaction.user.id)) {
            return interaction.reply({ content: 'Mar hore ayaad isku dayday su\'aashan!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        cur.answeredBy.add(interaction.user.id);

        const isCorrect = interaction.customId.endsWith('_t');
        if (isCorrect) {
            cur.scores[interaction.user.id]++;
            cur.correctAnswerer = interaction.user.id;
            await interaction.reply({ content: `✅ <@${interaction.user.id}> wuu helay dhibic!`, flags: MessageFlags.Ephemeral }).catch(() => {});
            collector.stop('correct');
        } else {
            await interaction.reply({ content: '❌ Khalad! Sug qofka kale ama waqtigu wuu dhamaan.', flags: MessageFlags.Ephemeral }).catch(() => {});
            if (cur.answeredBy.size >= 2) collector.stop('both_wrong');
        }
    });

    collector.on('end', async (_col, reason) => {
        const cur = activeDuels.get(channel.id);
        if (!cur) return;

        let resultLine;
        let penaltyLine = '';

        if (reason === 'correct' && cur.correctAnswerer) {
            // ⭐ Qofka kale (uusan jawaabin saxda) ciqaab gaar ah ka qaadayaa
            const loserOfQ = cur.correctAnswerer === cur.p1 ? cur.p2 : cur.p1;
            deductXp(loserOfQ, DUEL_WRONG_PENALTY);
            penaltyLine = `\n💢 <@${loserOfQ}> −${DUEL_WRONG_PENALTY} XP`;
            resultLine = `✅ <@${cur.correctAnswerer}> ayaa si sax ah u jawaabay!\nJawaabta saxda ah: **${q.correct}**`;
        } else if (reason === 'both_wrong') {
            // ⭐ Labadooduba khalad — XP penalty (IQ lama taabanayo)
            deductXp(cur.p1, DUEL_WRONG_PENALTY);
            deductXp(cur.p2, DUEL_WRONG_PENALTY);
            penaltyLine = `\n💢 Labadiinaba −${DUEL_WRONG_PENALTY} XP`;
            resultLine  = `❌ Labadiinaba waad khaldameen!\nJawaabta saxda ah: **${q.correct}**`;
        } else {
            // ⭐ Wakhti dhammaaday — XP penalty (IQ lama taabanayo)
            deductXp(cur.p1, DUEL_WRONG_PENALTY);
            deductXp(cur.p2, DUEL_WRONG_PENALTY);
            penaltyLine = `\n💢 Labadiinaba −${DUEL_WRONG_PENALTY} XP`;
            resultLine  = `⏰ Waqtigii wuu dhamaaday!\nJawaabta saxda ah: **${q.correct}**`;
        }

        saveData();

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`⚔️ Duel — Su'aal ${qIndex + 1}/${cur.totalQ}`)
            .setDescription(
                `## ${q.question}\n\n${resultLine}${penaltyLine}\n\n` +
                `📊 <@${cur.p1}>: **${cur.scores[cur.p1]}** | <@${cur.p2}>: **${cur.scores[cur.p2]}**`
            )
            .setColor(reason === 'correct' ? '#2ecc71' : '#e74c3c');

        if (cur.message) await cur.message.edit({ embeds: [summaryEmbed], components: [] }).catch(() => {});

        cur.currentQ++;
        setTimeout(() => sendDuelQuestion(channel, cur.message), 2500);
    });
}

async function finishDuel(channel, currentMsg = null) {
    const state = activeDuels.get(channel.id);
    if (!state) return;

    const s1 = state.scores[state.p1];
    const s2 = state.scores[state.p2];
    let resultEmbed;

    if (s1 === s2) {
        checkUser(state.p1);
        checkUser(state.p2);
        userData[state.p1].stats.duelDraws++;
        userData[state.p2].stats.duelDraws++;

        resultEmbed = new EmbedBuilder()
            .setTitle('🤝 Dagaalku wuu iskumid noqday!')
            .setDescription(
                `<@${state.p1}> **${s1}** — **${s2}** <@${state.p2}>\n\nCidna IQ ma luminin ama ma helin.`
            )
            .setColor('#f1c40f');
    } else {
        const winnerId = s1 > s2 ? state.p1 : state.p2;
        const loserId  = s1 > s2 ? state.p2 : state.p1;
        checkUser(winnerId);
        checkUser(loserId);

        // IQ is quiz-only; duel rewards economy XP + small cash transfer
        addXp(winnerId, 25);
        userData[winnerId].cash ??= Number.isFinite(userData[winnerId].usdBalance) ? userData[winnerId].usdBalance : 0;
        userData[loserId].cash  ??= Number.isFinite(userData[loserId].usdBalance) ? userData[loserId].usdBalance : 0;
        const cashTransfer = Math.min(20, userData[loserId].cash || 0);
        userData[loserId].cash  = Math.max(0, (userData[loserId].cash || 0) - cashTransfer);
        userData[winnerId].cash = (userData[winnerId].cash || 0) + cashTransfer;
        userData[winnerId].stats.duelWins++;
        userData[loserId].stats.duelLosses++;

        resultEmbed = new EmbedBuilder()
            .setTitle('🏆 Dagaalku wuu dhamaaday!')
            .setDescription(
                `<@${state.p1}> **${s1}** — **${s2}** <@${state.p2}>\n\n` +
                `🥇 Guulaystay: <@${winnerId}> (+25 XP / +$${cashTransfer} cash)\n` +
                `💀 Lumiyay: <@${loserId}> (−$${cashTransfer} cash)\n\n` +
                `IQ (quiz) lama taabanayo — ` +
                `<@${winnerId}>: **${userData[winnerId].iq}** | <@${loserId}>: **${userData[loserId].iq}**`
            )
            .setColor('#2ecc71');
    }

    saveData();
    activeDuels.delete(channel.id);

    if (currentMsg) {
        await currentMsg.edit({ embeds: [resultEmbed], components: [] }).catch(() => {});
    } else {
        await channel.send({ embeds: [resultEmbed] });
    }
}

module.exports = { startDuelGame, sendDuelQuestion, finishDuel };
