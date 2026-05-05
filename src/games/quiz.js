// =====================================================================
// CIYAARTA QUIZ KOOX — Garaad Quiz
// • ?quiz → bot wuxuu weydiinayaa hostka tirada su'aalaha (3-25)
// • Lobby: dadku way ku biiri karaan (ugu yaraan 3, ma xadidna kor)
// • Hostka kaliya ayaa bilaabi kara (ka dib marka 3 qof la gaaro)
// • Hostku haddi uu ka baxo → host cusub waxaa noqonaya qofka xiga
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { userData, saveData, activeQuiz, activeTournament, isUserBusy } = require('../store');
const { checkUser, addXp }              = require('../utils/helpers');
const { canHostQuiz, bumpHostQuiz }     = require('../utils/hostQuota');
const { pickQuestionsForGame, markSeenForUsersInGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { markUserPlayed }                = require('../utils/reminders');
const {
    PREFIX,
    QUIZ_MIN_PLAYERS, QUIZ_MAX_PLAYERS,
    QUIZ_MIN_QUESTIONS, QUIZ_MAX_QUESTIONS, QUIZ_QUESTION_COUNT,
    QUIZ_LOBBY_MS, GLOBAL_WAIT_MS, HOST_DAILY_LIMIT,
} = require('../config');

// ─────────────────────────────────────────────────────────────────────
// Bilow Lobby — interactive sida solo (weydii hostka tirada su'aalaha)
// ─────────────────────────────────────────────────────────────────────
async function startQuizLobby(message, args) {
    const userId    = message.author.id;
    const channelId = message.channel.id;

    if (activeQuiz.has(channelId)) {
        return message.reply('⚠️ Channel-kan mar hore ayaa quiz koox uu ka socda. Sug ilaa uu dhamaado.');
    }
    if (activeTournament.has(channelId)) {
        return message.reply('⚠️ Channel-kan tartan ayaa ka socda. Sug ilaa uu dhamaado.');
    }
    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }
    if (!canHostQuiz(userId)) {
        return message.reply(`⚠️ Maalintan waad gaartay xadka **${HOST_DAILY_LIMIT}** ciyaar oo martigeli karto. Sug berri.`);
    }

    // ⭐ Hel tirada su'aalaha (toos ama interactive)
    let questionCount = 0;
    if (args[0] !== undefined) {
        questionCount = parseInt(args[0]);
        if (isNaN(questionCount) || questionCount < QUIZ_MIN_QUESTIONS || questionCount > QUIZ_MAX_QUESTIONS) {
            return message.reply(
                `⚠️ Tirada su'aalaha waa inay u dhexeyso **${QUIZ_MIN_QUESTIONS}** iyo **${QUIZ_MAX_QUESTIONS}**.\n` +
                `Tusaale: \`${PREFIX}quiz 10\``
            );
        }
    } else {
        await message.reply(
            `📊 **${message.author.username}**, imisa su'aalood ayaad rabtaa Quiz koox?\n` +
            `Qor lambar **${QUIZ_MIN_QUESTIONS}** ilaa **${QUIZ_MAX_QUESTIONS}** (tusaale: \`10\` ama \`20\`).\n` +
            `_(30 ilbiriqsi ayaad heysataa)_`
        );

        const filter    = m => m.author.id === userId && /^\d+$/.test(m.content.trim());
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });

        if (collected.size === 0) {
            return message.channel.send(`⏰ <@${userId}>, wakhti dhammaaday — \`${PREFIX}quiz\` mar kale isku day.`);
        }
        questionCount = parseInt(collected.first().content.trim());
        if (questionCount < QUIZ_MIN_QUESTIONS || questionCount > QUIZ_MAX_QUESTIONS) {
            return collected.first().reply(
                `⚠️ Tirada waa inay u dhexeyso **${QUIZ_MIN_QUESTIONS}** iyo **${QUIZ_MAX_QUESTIONS}**.\n` +
                `\`${PREFIX}quiz\` mar kale isku day.`
            );
        }
    }

    // Hubi inay jiraan su'aalo cusub
    const available = pickQuestionsForGame(userId, 'quiz', questionCount);
    if (!available || available.length === 0) {
        return message.reply({ embeds: [noQuestionsLeftEmbed(message.author.username)] });
    }
    // ⭐ Haddii su'aalo cusub ka yar yihiin tirada la codsaday → ka warbixi
    if (available.length < questionCount) {
        await message.reply(
            `📚 **${message.author.username}**, waxaa kuu hadhay **${available.length}** su'aalood cusub kaliya (adigoo codsaday ${questionCount}).\n` +
            `Quiz-ku wuxuu noqonayaa **${available.length}** su'aalood.`
        );
        questionCount = available.length;
    }

    const state = {
        hostId: userId,
        channelId,
        questionCount,                              // ⭐ tirada su'aalaha la doortay
        players: new Set([userId]),
        scores: { [userId]: 0 },
        started: false,
        questions: null,
        currentQ: 0,
        message: null,
        lobbyTimer: null,
    };
    activeQuiz.set(channelId, state);

    const lobbyMsg = await message.channel.send({
        embeds: [buildLobbyEmbed(state)],
        components: [buildLobbyButtons(state)],
    });
    state.message = lobbyMsg;

    state.lobbyTimer = setTimeout(async () => {
        const cur = activeQuiz.get(channelId);
        if (!cur || cur.started) return;
        activeQuiz.delete(channelId);
        await lobbyMsg.edit({
            embeds: [new EmbedBuilder()
                .setTitle('⌛ Lobby waqti dhammaaday')
                .setDescription('Quiz lobby ayaa joojiyay — waqtigii ayaa dhammaaday inta lagu sugayo ciyaartoyda.')
                .setColor('#7f8c8d')],
            components: [],
        }).catch(() => {});
    }, QUIZ_LOBBY_MS);
}

// ─────────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────────

function buildLobbyEmbed(state) {
    const playersText = [...state.players].map((id, i) => `${i + 1}. <@${id}>`).join('\n') || '—';
    return new EmbedBuilder()
        .setTitle('👥 Quiz Koox — Lobby')
        .setDescription(
            `**Host:** <@${state.hostId}>\n` +
            `**Su'aalo:** ${state.questionCount}\n` +
            `**Ciyaartoy:** ${state.players.size} _(ugu yaraan ${QUIZ_MIN_PLAYERS} si la bilaabo)_\n\n` +
            `Riix **Ku biir** si aad u gasho.\n` +
            `Marka **${QUIZ_MIN_PLAYERS}** la gaaro, **hostku kaliya** ayaa riixi kara **Bilaw**.\n\n` +
            `**Ciyaartoyda:**\n${playersText}\n\n` +
            `⏳ Lobby wuxuu joogsan doonaa 3 daqiiqo haddii aan la bilaabin.`
        )
        .setColor('#3498db');
}

function buildLobbyButtons(state) {
    const canStart = state.players.size >= QUIZ_MIN_PLAYERS;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`quiz_join_${state.channelId}`).setLabel('Ku biir ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`quiz_leave_${state.channelId}`).setLabel('Ka bax').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`quiz_start_${state.channelId}`).setLabel('Bilaw 🚀').setStyle(ButtonStyle.Primary).setDisabled(!canStart),
    );
}

async function refreshLobby(state) {
    if (!state.message) return;
    await state.message.edit({ embeds: [buildLobbyEmbed(state)], components: [buildLobbyButtons(state)] }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────
// Ciyaarta
// ─────────────────────────────────────────────────────────────────────

async function beginQuizGame(state) {
    if (state.started) return;
    state.started = true;
    if (state.lobbyTimer) clearTimeout(state.lobbyTimer);

    bumpHostQuiz(state.hostId);
    saveData();

    let totalQ = state.questionCount || QUIZ_QUESTION_COUNT;
    const picked = pickQuestionsForGame(state.hostId, 'quiz', totalQ);
    if (!picked || picked.length === 0) {
        activeQuiz.delete(state.channelId);
        if (state.message) {
            await state.message.edit({ embeds: [noQuestionsLeftEmbed('Hostka')], components: [] }).catch(() => {});
        }
        return;
    }
    // ⭐ Cap totalQ haddii su'aalo cusub ka yar yihiin
    if (picked.length < totalQ) {
        totalQ = picked.length;
        state.questionCount = totalQ;
    }
    state.questions = picked;
    state.currentQ  = 0;

    for (const pid of state.players) markUserPlayed(pid);

    const channel = state.message?.channel;
    if (!channel) { activeQuiz.delete(state.channelId); return; }

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('🚀 Quiz Koox — Wuu Bilaabmay!')
            .setDescription(
                `**Hostka:** <@${state.hostId}>\n` +
                `**Ciyaartoy:** ${state.players.size}\n` +
                `**Su'aalo:** ${totalQ}\n` +
                `**Wakhti:** ${GLOBAL_WAIT_MS / 1000} ilbiriqsi mid kasta\n\n` +
                `Qofka ugu horeeya ee si sax ah u jawaaba ayaa dhibcaha helaya!`
            )
            .setColor('#9b59b6')],
    });

    setTimeout(() => sendQuizQuestion(state), 3000);
}

async function sendQuizQuestion(state) {
    if (!activeQuiz.has(state.channelId)) return;
    const totalQ = state.questionCount || QUIZ_QUESTION_COUNT;
    if (state.currentQ >= totalQ) return finishQuiz(state);

    const channel = state.message?.channel;
    if (!channel) { activeQuiz.delete(state.channelId); return; }

    const q         = state.questions[state.currentQ];
    const playerIds = [...state.players];
    markSeenForUsersInGame(playerIds, 'quiz', q._idx);
    saveData();

    const answeredBy  = new Set();
    let firstCorrect  = null;

    const embed = new EmbedBuilder()
        .setTitle(`👥 Quiz Koox — Su'aal ${state.currentQ + 1}/${totalQ}`)
        .setDescription(
            `## ${q.question}\n\n` +
            `⏱️ ${GLOBAL_WAIT_MS / 1000} ilbiriqsi — qofka ugu horeeya ee si sax ah u jawaaba ayaa dhibic helaya!\n` +
            `Ciyaartoy: **${state.players.size}**`
        )
        .setColor('#9b59b6');

    const buttons = q.options.map((opt, index) =>
        new ButtonBuilder()
            .setCustomId(`quiz_a_${state.channelId}_${state.currentQ}_${index}_${opt === q.correct ? 't' : 'f'}`)
            .setLabel(opt)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (!msg) { activeQuiz.delete(state.channelId); return; }

    const filter    = i => i.customId.startsWith(`quiz_a_${state.channelId}_${state.currentQ}_`) && state.players.has(i.user.id);
    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS });

    collector.on('collect', async interaction => {
        if (answeredBy.has(interaction.user.id)) {
            return interaction.reply({ content: 'Mar hore ayaad jawaab bixisay!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        answeredBy.add(interaction.user.id);
        const isCorrect = interaction.customId.endsWith('_t');

        if (isCorrect && firstCorrect === null) {
            firstCorrect = interaction.user.id;
            state.scores[interaction.user.id] = (state.scores[interaction.user.id] || 0) + 1;
            await interaction.reply({ content: '✅ Sax! Adigaa ugu horeeyay!', flags: MessageFlags.Ephemeral }).catch(() => {});
            collector.stop('correct');
        } else if (isCorrect) {
            await interaction.reply({ content: '✅ Sax — laakiin qof horay ayaa kuu sii dhaafay.', flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Khalad.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    });

    collector.on('end', async () => {
        const resultLine = firstCorrect
            ? `✅ <@${firstCorrect}> ayaa ugu horeeyay!\nJawaabta saxda ah: **${q.correct}**`
            : `⏰/❌ Cidna si sax ah uma jawaabin.\nJawaabta saxda ah: **${q.correct}**`;

        const scoreboard = Object.entries(state.scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, sc], i) => `${i + 1}. <@${id}> — **${sc}**`)
            .join('\n');

        const sumEmbed = new EmbedBuilder()
            .setTitle(`👥 Quiz Koox — Su'aal ${state.currentQ + 1}/${totalQ}`)
            .setDescription(
                `## ${q.question}\n\n${resultLine}\n\n📊 **Sare-saraha hadda:**\n${scoreboard}`
            )
            .setColor(firstCorrect ? '#2ecc71' : '#e74c3c');

        await msg.edit({ embeds: [sumEmbed], components: [] }).catch(() => {});

        state.currentQ++;
        setTimeout(() => sendQuizQuestion(state), 2500);
    });
}

async function finishQuiz(state) {
    activeQuiz.delete(state.channelId);
    const channel = state.message?.channel;
    if (!channel) return;

    const sorted      = Object.entries(state.scores).sort(([, a], [, b]) => b - a);
    const playerCount = state.players.size;
    const giveStar    = playerCount >= 6;
    const rewardLines = [];

    sorted.forEach(([id, sc], i) => {
        checkUser(id);
        userData[id].stats.quizPlayed++;
        if (i === 0 && sc > 0) {
            userData[id].iq += 5; addXp(id, 30); userData[id].stats.quizWins++;
            if (giveStar) userData[id].stars++;
            rewardLines.push(`🥇 <@${id}> — ${sc} dhibcood (+5 IQ / +30 XP${giveStar ? ' / ⭐' : ''})`);
        } else if (i === 1 && sc > 0) {
            userData[id].iq += 3; addXp(id, 20);
            rewardLines.push(`🥈 <@${id}> — ${sc} dhibcood (+3 IQ / +20 XP)`);
        } else if (i === 2 && sc > 0) {
            userData[id].iq += 1; addXp(id, 10);
            rewardLines.push(`🥉 <@${id}> — ${sc} dhibcood (+1 IQ / +10 XP)`);
        } else {
            addXp(id, 3);
            rewardLines.push(`▫️ <@${id}> — ${sc} dhibcood (+3 XP)`);
        }
    });
    saveData();

    const embed = new EmbedBuilder()
        .setTitle('🏁 Quiz Koox — Dhamaaday')
        .setDescription(
            `**Hostka:** <@${state.hostId}>\n` +
            `**Ciyaartoy:** ${playerCount}\n\n` +
            `**Abaalmarinta:**\n${rewardLines.join('\n')}` +
            (giveStar ? `\n\n⭐ Sababtoo ah ${playerCount} qof ayaa kasoo qaybgalay, hogaamiyaha wuxuu helay **Star Award**!` : '')
        )
        .setColor('#f1c40f');

    await channel.send({ embeds: [embed] });
}

module.exports = { startQuizLobby, refreshLobby, beginQuizGame, buildLobbyButtons, buildLobbyEmbed };
