// =====================================================================
// CIYAARTA DUEL — dhig IQ + guul
// Labadu: −5 IQ dhig | guuleystaha: +10 IQ | barbaro: dib u celin 5 IQ
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { userData, saveData, activeDuels } = require('../store');
const { checkUser, getLevel } = require('../utils/helpers');
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

function refundDuelStakes(p1Id, p2Id) {
    checkUser(p1Id);
    checkUser(p2Id);
    userData[p1Id].iq += DUEL_STAKE_IQ;
    userData[p2Id].iq += DUEL_STAKE_IQ;
    saveData();
}

async function startDuelGame(channel, p1Id, p2Id, count = 0) {
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
    };
    activeDuels.set(channel.id, duelState);

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

async function sendDuelQuestion(channel, currentMsg = null) {
    const state = activeDuels.get(channel.id);
    if (!state) return;

    if (state.currentQ >= state.totalQ) return finishDuel(channel, currentMsg);

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
            `## ${q.question}\n\n` +
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

    let msg;
    try {
        msg = currentMsg
            ? await currentMsg.edit({ embeds: [embed], components: [row] })
            : await channel.send({ embeds: [embed], components: [row] });
    } catch {
        activeDuels.delete(channel.id);
        refundDuelStakes(state.p1, state.p2);
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

        if (reason === 'correct' && cur.correctAnswerer) {
            resultLine = `✅ <@${cur.correctAnswerer}> ayaa si sax ah u jawaabay!\nJawaabta saxda ah waxaa lagu muujiyaa kor.`;
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
                `## ${q.question}\n\n${resultLine}\n\n` +
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

    if (currentMsg) {
        await currentMsg.edit({ embeds: [resultEmbed], components: [] }).catch(() => {});
    } else {
        await channel.send({ embeds: [resultEmbed] });
    }
}

module.exports = { startDuelGame, sendDuelQuestion, finishDuel, refundDuelStakes };
