// =====================================================================
// CIYAARTA DUEL — dhig IQ + guul
// Labadu: −5 IQ dhig | guuleystaha: +10 IQ | barbaro: dib u celin 5 IQ
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { userData, saveData, activeDuels } = require('../store');

const { checkUser, getLevel, stripQuestionNumber } = require('../utils/helpers');
const { pickQuestionsForGame, markSeenForUsersInGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { markUserPlayed } = require('../utils/reminders');
const {
    GLOBAL_WAIT_MS,
    DUEL_MIN_QUESTIONS,
    DUEL_MAX_QUESTIONS,
    DUEL_STAKE_IQ,
    DUEL_WIN_IQ,
} = require('../config');
const { getAnswerOptions } = require('../utils/questionOptions');
const { saveDuelState, loadAllDuelStates, deleteDuelState } = require('../utils/gamePersist');

function persistDuel(channelId, state) {
    saveDuelState(channelId, state).catch(() => {});
}

function refundDuelStakes(p1Id, p2Id) {
    checkUser(p1Id);
    checkUser(p2Id);
    userData[p1Id].iq += DUEL_STAKE_IQ;
    userData[p2Id].iq += DUEL_STAKE_IQ;
    saveData();
}

async function startDuelGame(channel, p1Id, p2Id, count = 0, originMsg = null) {
    checkUser(p1Id);
    checkUser(p2Id);

    if (activeDuels.has(channel.id)) return;

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

    if (activeDuels.has(channel.id)) return;

    if (userData[p1Id].iq < DUEL_STAKE_IQ || userData[p2Id].iq < DUEL_STAKE_IQ) {
        return channel.send(
            `⚠️ Duel wuxuu u baahan yahay **${DUEL_STAKE_IQ} IQ** dhig ah labadaba.\n` +
            `<@${p1Id}> **${userData[p1Id].iq} IQ** | <@${p2Id}> **${userData[p2Id].iq} IQ**`
        );
    }

    const picked = pickQuestionsForGame(p1Id, 'duel', count);
    if (!picked || picked.length === 0) {
        return channel.send({ embeds: [noQuestionsLeftEmbed('Hostka')] });
    }

    let actualCount = picked.length;
    if (actualCount < count) {
        await channel.send(
            `📚 Waxaa kaliya hadhay **${actualCount}** su'aalood oo cusub (adigoo codsaday ${count}).\n` +
            `Duel-ku wuxuu socon doonaa **${actualCount}** su'aalood.`
        );
    }

    userData[p1Id].iq -= DUEL_STAKE_IQ;
    userData[p2Id].iq -= DUEL_STAKE_IQ;
    saveData();

    const duelState = {
        p1: p1Id,
        p2: p2Id,
        questions: picked,
        totalQ: actualCount,
        scores: { [p1Id]: 0, [p2Id]: 0 },
        currentQ: 0,
        answeredBy: new Set(),
        correctAnswerer: null,
        message: null,
        stakesTaken: true,
        originMsg,
    };
    activeDuels.set(channel.id, duelState);
    // Save immediately to protect stakes — if bot restarts before finish, we can restore
    persistDuel(channel.id, duelState);

    markUserPlayed(p1Id);
    markUserPlayed(p2Id);

    try {
        await channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('⚔️ Dagaalku wuu bilaabmay!')
                .setDescription(
                    `<@${p1Id}> 🆚 <@${p2Id}>\n\n` +
                    `**Dhig:** labaduba **−${DUEL_STAKE_IQ} IQ** (wadarta **${DUEL_STAKE_IQ * 2} IQ**).\n` +
                    `**Guul:** guuleystaha wuxuu helayaa **+${DUEL_WIN_IQ} IQ**.\n` +
                    `**Barbaro:** labaduba waxay helayaan **+${DUEL_STAKE_IQ} IQ** (dib u celinta dhigga).\n\n` +
                    `**${actualCount}** su'aalood — qofka ugu horreeya ee si sax ah u jawaaba ayaa dhibicda helaya!\n` +
                    `Bilaabaya 3 ilbiriqsi gudahood...`
                )
                .setColor('#e67e22')],
        });
    } catch {
        activeDuels.delete(channel.id);
        refundDuelStakes(p1Id, p2Id);
        return;
    }

    setTimeout(() => sendDuelQuestion(channel), 3000);
}

async function sendDuelQuestion(channel) {
    const state = activeDuels.get(channel.id);
    if (!state) return;

    if (state.currentQ >= state.totalQ) return finishDuel(channel);
    // Persist current question index so restart can resume here
    persistDuel(channel.id, state);

    const qIndex = state.currentQ;
    const q      = state.questions[qIndex];
    markSeenForUsersInGame([state.p1, state.p2], 'duel', q._idx);
    saveData();

    state.answeredBy      = new Set();
    state.correctAnswerer = null;

    const entries = getAnswerOptions(q);
    if (entries.length === 0) {
        activeDuels.delete(channel.id);
        refundDuelStakes(state.p1, state.p2);
        return channel.send('⚠️ Su\'aal aan la fahmin — dhigga waa la soo celiyay.');
    }

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ Duel — Su'aal ${qIndex + 1}/${state.totalQ}`)
        .setDescription(
            `## ${stripQuestionNumber(q.question)}\n\n` +
            `⏱️ ${GLOBAL_WAIT_MS / 1000} ilbiriqsi — qofka ugu horreeya ee sax ayaa dhibic helaya!\n\n` +
            `📊 <@${state.p1}>: **${state.scores[state.p1]}** | <@${state.p2}>: **${state.scores[state.p2]}**`
        )
        .setColor('#e74c3c');

    const buttons = entries.map((e, index) =>
        new ButtonBuilder()
            .setCustomId(`duel_q_${qIndex}_${index}_${e.isCorrect ? 't' : 'f'}`)
            .setLabel(e.label.slice(0, 80))
            .setStyle(ButtonStyle.Primary),
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const rOpt = state.originMsg ? { reply: { messageReference: state.originMsg.id, failIfNotExists: false } } : {};
    let msg;
    try {
        msg = await channel.send({ embeds: [embed], components: [row], ...rOpt });
    } catch {
        activeDuels.delete(channel.id);
        refundDuelStakes(state.p1, state.p2);
        return;
    }
    state.message = msg;

    let questionDone = false;

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
        if (questionDone) return;
        questionDone = true;

        const cur = activeDuels.get(channel.id);
        if (!cur) return;

        let resultLine;
        if (reason === 'correct' && cur.correctAnswerer) {
            resultLine = `✅ <@${cur.correctAnswerer}> ayaa si sax ah u jawaabay!\nJawaabta saxda ah waxaa lagu muujiyaa hoose.`;
        } else if (reason === 'both_wrong') {
            resultLine = `❌ Labadiinaba waad khaldameen!`;
        } else {
            resultLine = `⏰ Waqtigii wuu dhamaaday!`;
        }

        const correctLabel = entries.find(e => e.isCorrect)?.label || String(q.correct);
        resultLine += `\nJawaabta saxda ah: **${correctLabel}**`;

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`⚔️ Duel — Su'aal ${qIndex + 1}/${cur.totalQ}`)
            .setDescription(
                `## ${stripQuestionNumber(q.question)}\n\n${resultLine}\n\n` +
                `📊 <@${cur.p1}>: **${cur.scores[cur.p1]}** | <@${cur.p2}>: **${cur.scores[cur.p2]}**`
            )
            .setColor(reason === 'correct' ? '#2ecc71' : '#e74c3c');

        if (cur.message) await cur.message.delete().catch(() => {});
        const sOpt = cur.originMsg ? { reply: { messageReference: cur.originMsg.id, failIfNotExists: false } } : {};
        await channel.send({ embeds: [summaryEmbed], ...sOpt }).catch(() => {});

        cur.currentQ++;
        setTimeout(() => sendDuelQuestion(channel), 2500);
    });
}

async function finishDuel(channel) {
    const state = activeDuels.get(channel.id);
    if (!state) return;
    deleteDuelState(channel.id).catch(() => {});

    const s1 = state.scores[state.p1];
    const s2 = state.scores[state.p2];
    let resultEmbed;

    if (s1 === s2) {
        checkUser(state.p1);
        checkUser(state.p2);
        userData[state.p1].stats.duelDraws++;
        userData[state.p2].stats.duelDraws++;
        if (state.stakesTaken) {
            userData[state.p1].iq += DUEL_STAKE_IQ;
            userData[state.p2].iq += DUEL_STAKE_IQ;
        }

        resultEmbed = new EmbedBuilder()
            .setTitle('🤝 Dagaalku wuu iskumid noqday!')
            .setDescription(
                `<@${state.p1}> **${s1}** — **${s2}** <@${state.p2}>\n\n` +
                `Dhigga **${DUEL_STAKE_IQ} IQ** waa la soo celiyay labadaba.`
            )
            .setColor('#f1c40f');
    } else {
        const winnerId = s1 > s2 ? state.p1 : state.p2;
        const loserId  = s1 > s2 ? state.p2 : state.p1;
        checkUser(winnerId);
        checkUser(loserId);

        userData[winnerId].iq += DUEL_WIN_IQ;
        userData[winnerId].stats.duelWins++;
        userData[loserId].stats.duelLosses++;

        resultEmbed = new EmbedBuilder()
            .setTitle('🏆 Dagaalku wuu dhamaaday!')
            .setDescription(
                `<@${state.p1}> **${s1}** — **${s2}** <@${state.p2}>\n\n` +
                `🥇 Guulaystay: <@${winnerId}> (**+${DUEL_WIN_IQ} IQ**)\n` +
                `💀 Lumiyay: <@${loserId}> (wuxuu lumay dhigii **${DUEL_STAKE_IQ} IQ**)\n\n` +
                `IQ hadda: <@${winnerId}> **${userData[winnerId].iq}** | <@${loserId}> **${userData[loserId].iq}** ` +
                `(Level ${getLevel(userData[winnerId].iq)} / ${getLevel(userData[loserId].iq)})`
            )
            .setColor('#2ecc71');
    }

    saveData();
    activeDuels.delete(channel.id);

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_duel_${state.p1}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    const fOpt = state.originMsg ? { reply: { messageReference: state.originMsg.id, failIfNotExists: false } } : {};
    await channel.send({ embeds: [resultEmbed], components: [closeRow], ...fOpt });
}

// ── Startup restore: reload all saved duels and resend current question ──
async function restoreDuelGames(client) {
    const docs = await loadAllDuelStates().catch(() => []);
    if (!docs.length) return;

    let restored = 0;
    for (const doc of docs) {
        // Refund stakes for stale duels (>6h) and skip
        if (Date.now() - doc.savedAt > 6 * 60 * 60 * 1000) {
            if (doc.stakesTaken && doc.p1 && doc.p2) {
                checkUser(doc.p1);
                checkUser(doc.p2);
                userData[doc.p1].iq = (userData[doc.p1].iq || 0) + DUEL_STAKE_IQ;
                userData[doc.p2].iq = (userData[doc.p2].iq || 0) + DUEL_STAKE_IQ;
                saveData();
                console.log(`[Duel Restore] Auto-refunded stakes for stale duel in channel ${doc.channelId}`);
            }
            deleteDuelState(doc.channelId).catch(() => {});
            continue;
        }
        if (activeDuels.has(doc.channelId)) continue;
        if (!doc.channelId || !doc.questions?.length) {
            deleteDuelState(doc.channelId).catch(() => {});
            continue;
        }

        const channel = await client.channels.fetch(doc.channelId).catch(() => null);
        if (!channel) {
            deleteDuelState(doc.channelId).catch(() => {});
            continue;
        }

        const state = {
            p1:             doc.p1,
            p2:             doc.p2,
            questions:      doc.questions   || [],
            totalQ:         doc.totalQ      || 0,
            scores:         doc.scores      || {},
            currentQ:       doc.currentQ    || 0,
            answeredBy:     new Set(),
            correctAnswerer: null,
            message:        null,
            stakesTaken:    doc.stakesTaken || false,
            originMsg:      null,
        };
        activeDuels.set(doc.channelId, state);

        await sendDuelQuestion(channel).catch(e => {
            console.error(`[Duel Restore] Failed for channel ${doc.channelId}:`, e.message);
            activeDuels.delete(doc.channelId);
        });
        restored++;
        console.log(`[Duel] ✅ Restored duel in channel ${doc.channelId} at Q${doc.currentQ}`);
    }
    if (restored > 0) console.log(`[Duel] ✅ ${restored} duel(s) restored from database`);
}

module.exports = { startDuelGame, sendDuelQuestion, finishDuel, refundDuelStakes, restoreDuelGames };
