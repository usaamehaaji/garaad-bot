// =====================================================================
// CIYAARTA BLITZ — ?blitz [N]
// • Lobby → Ku biir → Bilaw
// • Su'aal kasta: kii ugu horeeyaa ee si sax ah u jawaaba ayaa dhibco helaya
//   Dhibco = ku xidhan xawliga (max 40 — min 5)
// • Dhammaadka: badhanka toos ah oo XP ama IQ ku badasho dhibcahaaga
// =====================================================================

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags,
} = require('discord.js');
const { userData, saveData, activeBlitz, isUserBusy } = require('../store');
const { checkUser }                                   = require('../utils/helpers');
const { pickQuestionsForGame, markSeenForUsersInGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { markUserPlayed }   = require('../utils/reminders');
const { getAnswerOptions } = require('../utils/questionOptions');
const { PREFIX, QUIZ_POINTS_TO_XP, QUIZ_POINTS_TO_IQ } = require('../config');

const BLITZ_QTIME_MS    = 15000;
const BLITZ_LOBBY_MS    = 2 * 60 * 1000;
const BLITZ_MIN_PLAYERS = 2;
const BLITZ_MAX_PLAYERS = 50;
const BLITZ_MIN_Q       = 3;
const BLITZ_MAX_Q       = 20;
const BLITZ_DEFAULT_Q   = 10;

function calcScore(timeMsAnswered) {
    return Math.max(5, Math.round(40 * (1 - timeMsAnswered / BLITZ_QTIME_MS)));
}

// ─────────────────────────────────────────────────────────────────────
// Lobby
// ─────────────────────────────────────────────────────────────────────
async function startBlitzLobby(message, args) {
    const userId    = message.author.id;
    const channelId = message.channel.id;

    if (activeBlitz.has(channelId)) {
        return message.reply('⚠️ Channel-kan Blitz ayaa mar hore ka socda. Sug ilaa uu dhamaado.');
    }
    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }

    let questionCount = BLITZ_DEFAULT_Q;
    if (args[0] !== undefined) {
        const n = parseInt(args[0], 10);
        if (isNaN(n) || n < BLITZ_MIN_Q || n > BLITZ_MAX_Q) {
            return message.reply(
                `⚠️ Tirada su'aalaha waa inay u dhexeyso **${BLITZ_MIN_Q}** iyo **${BLITZ_MAX_Q}**.\n` +
                `Tusaale: \`${PREFIX}blitz 10\``
            );
        }
        questionCount = n;
    }

    const available = pickQuestionsForGame(userId, 'quiz', questionCount);
    if (!available || available.length === 0) {
        return message.reply({ embeds: [noQuestionsLeftEmbed(message.author.username)] });
    }
    if (available.length < questionCount) {
        questionCount = available.length;
        await message.reply(`📚 Su'aalo cusub: **${questionCount}** kaliya ayaa kuu hadhay — Blitz wuxuu noqonayaa ${questionCount} su'aalood.`);
    }

    const state = {
        hostId: userId,
        channelId,
        questionCount,
        players: new Set([userId]),
        scores:  { [userId]: 0 },
        started: false,
        questions: null,
        currentQ:  0,
        lobbyMsg:  null,
        lobbyTimer: null,
    };
    activeBlitz.set(channelId, state);

    const lobbyMsg = await message.channel.send({
        embeds:     [buildLobbyEmbed(state)],
        components: [buildLobbyRow(state)],
    });
    state.lobbyMsg = lobbyMsg;

    state.lobbyTimer = setTimeout(async () => {
        const cur = activeBlitz.get(channelId);
        if (!cur || cur.started) return;
        activeBlitz.delete(channelId);
        await lobbyMsg.edit({
            embeds: [new EmbedBuilder()
                .setTitle('⌛ Blitz Lobby waqti dhammaaday')
                .setDescription('Wakhtigii lobby-ga ayaa dhammaaday — ciyaar cusub bilaaw.')
                .setColor('#7f8c8d')],
            components: [],
        }).catch(() => {});
    }, BLITZ_LOBBY_MS);
}

function buildLobbyEmbed(state) {
    const list = [...state.players].map((id, i) => `${i + 1}. <@${id}>`).join('\n') || '—';
    return new EmbedBuilder()
        .setTitle('⚡ Blitz Quiz — Lobby')
        .setDescription(
            `**Host:** <@${state.hostId}>\n` +
            `**Su'aalo:** ${state.questionCount}\n` +
            `**Wakhti / su'aal:** ${BLITZ_QTIME_MS / 1000} ilbiriqsi\n` +
            `**Ciyaartoy:** ${state.players.size} _(ugu yaraan ${BLITZ_MIN_PLAYERS})_\n\n` +
            `⚡ Kii **ugu horeeyaa** ee sax u jawaaba ayaa dhibco helaya\n` +
            `Max **40** dhibcood — kii ugu dhakhsaha badnaa!\n\n` +
            `**Ciyaartoyda:**\n${list}`
        )
        .setColor('#f39c12');
}

function buildLobbyRow(state) {
    const canStart = state.players.size >= BLITZ_MIN_PLAYERS;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blitz_join_${state.channelId}`)
            .setLabel('Ku biir ⚡')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`blitz_leave_${state.channelId}`)
            .setLabel('Ka bax')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`blitz_start_${state.channelId}`)
            .setLabel('Bilaw 🚀')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!canStart),
    );
}

async function refreshLobby(state) {
    if (!state.lobbyMsg) return;
    await state.lobbyMsg.edit({
        embeds:     [buildLobbyEmbed(state)],
        components: [buildLobbyRow(state)],
    }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────
// Ciyaarta
// ─────────────────────────────────────────────────────────────────────
async function beginBlitzGame(state) {
    if (state.started) return;
    state.started = true;
    if (state.lobbyTimer) clearTimeout(state.lobbyTimer);

    const picked = pickQuestionsForGame(state.hostId, 'quiz', state.questionCount);
    if (!picked || picked.length === 0) {
        activeBlitz.delete(state.channelId);
        if (state.lobbyMsg) {
            await state.lobbyMsg.edit({
                embeds:     [noQuestionsLeftEmbed('Hostka')],
                components: [],
            }).catch(() => {});
        }
        return;
    }

    if (picked.length < state.questionCount) state.questionCount = picked.length;
    state.questions = picked;
    state.currentQ  = 0;

    for (const pid of state.players) {
        checkUser(pid);
        markUserPlayed(pid);
    }
    saveData();

    const channel = state.lobbyMsg?.channel;
    if (!channel) { activeBlitz.delete(state.channelId); return; }

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('⚡ Blitz Quiz — Wuu Bilaabmay!')
            .setDescription(
                `**Ciyaartoy:** ${state.players.size}\n` +
                `**Su'aalo:** ${state.questionCount}\n` +
                `**Wakhti / su'aal:** ${BLITZ_QTIME_MS / 1000}s\n\n` +
                `⚡ Kii **ugu horeeyaa** ee si sax ah u jawaaba ayaa dhibco helaya!\n` +
                `Max **40** dhibcood — kii ugu dhakhsaha badnaa!\n\n` +
                `_Diyaarso…_`
            )
            .setColor('#f39c12')],
    });

    setTimeout(() => sendBlitzQuestion(state), 3000);
}

async function sendBlitzQuestion(state) {
    if (!activeBlitz.has(state.channelId)) return;
    if (state.currentQ >= state.questionCount) return finishBlitz(state);

    const channel = state.lobbyMsg?.channel;
    if (!channel) { activeBlitz.delete(state.channelId); return; }

    const q         = state.questions[state.currentQ];
    const playerIds = [...state.players];
    markSeenForUsersInGame(playerIds, 'quiz', q._idx);
    saveData();

    const qEntries = getAnswerOptions(q);
    if (qEntries.length === 0) {
        state.currentQ++;
        setTimeout(() => sendBlitzQuestion(state), 400);
        return;
    }

    const correctLabel = qEntries.find(e => e.isCorrect)?.label ?? String(q.correct);
    const totalQ       = state.questionCount;
    const answeredBy   = new Set();
    let   winner       = null;
    const startTime    = Date.now();

    const embed = new EmbedBuilder()
        .setTitle(`⚡ Blitz — Su'aal ${state.currentQ + 1}/${totalQ}`)
        .setDescription(
            `## ${q.question}\n\n` +
            `⏱️ **${BLITZ_QTIME_MS / 1000} ilbiriqsi** — kii ugu horeeyaa ee sax u jawaaba: max **40** dhibcood!\n` +
            `Ciyaartoy: **${state.players.size}**`
        )
        .setColor('#e67e22');

    const buttons = qEntries.map((e, i) =>
        new ButtonBuilder()
            .setCustomId(`blitz_a_${state.channelId}_${state.currentQ}_${i}_${e.isCorrect ? 't' : 'f'}`)
            .setLabel(e.label.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (!msg) { activeBlitz.delete(state.channelId); return; }

    const prefix    = `blitz_a_${state.channelId}_${state.currentQ}_`;
    const filter    = i => i.customId.startsWith(prefix) && state.players.has(i.user.id);
    const collector = msg.createMessageComponentCollector({ filter, time: BLITZ_QTIME_MS });

    collector.on('collect', async interaction => {
        const uid = interaction.user.id;
        if (answeredBy.has(uid)) {
            return interaction.reply({
                content: 'Mar hore ayaad jawaab bixisay!',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }
        answeredBy.add(uid);

        const isCorrect = interaction.customId.endsWith('_t');
        const timeTaken = Date.now() - startTime;

        if (isCorrect && winner === null) {
            const pts = calcScore(timeTaken);
            winner = { uid, timeMs: timeTaken, pts };
            state.scores[uid] = (state.scores[uid] || 0) + pts;
            await interaction.reply({
                content: `✅ **SAX! Adigaa ugu horeeyay!** ⚡ **+${pts}** dhibcood (${(timeTaken / 1000).toFixed(1)}s)`,
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
            collector.stop('winner');
        } else if (isCorrect) {
            await interaction.reply({
                content: '✅ Sax — laakiin qof horay ayaa kuu sii dhaafay.',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Khalad.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    });

    collector.on('end', async () => {
        const resultLine = winner
            ? `⚡ <@${winner.uid}> ayaa ugu horeeyay! _(${(winner.timeMs / 1000).toFixed(1)}s)_ → **+${winner.pts}** dhibcood\nJawaabta saxda ah: **${correctLabel}**`
            : `⏰ Wakhtigii dhammaaday — cidna si sax ah uma jawaabin.\nJawaabta saxda ah: **${correctLabel}**`;

        const board = Object.entries(state.scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, sc], i) => {
                const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                return `${medal} <@${id}> — **${sc}**`;
            })
            .join('\n');

        const sumEmbed = new EmbedBuilder()
            .setTitle(`⚡ Blitz — Su'aal ${state.currentQ + 1}/${totalQ}`)
            .setDescription(
                `## ${q.question}\n\n${resultLine}\n\n` +
                `📊 **Dhibcaha hadda:**\n${board}`
            )
            .setColor(winner ? '#2ecc71' : '#e74c3c');

        await msg.edit({ embeds: [sumEmbed], components: [] }).catch(() => {});

        state.currentQ++;
        setTimeout(() => sendBlitzQuestion(state), 2500);
    });
}

// ─────────────────────────────────────────────────────────────────────
// Natiijada kama dambeysta
// ─────────────────────────────────────────────────────────────────────
async function finishBlitz(state) {
    activeBlitz.delete(state.channelId);
    const channel = state.lobbyMsg?.channel;
    if (!channel) return;

    const sorted = Object.entries(state.scores).sort(([, a], [, b]) => b - a);

    const rewardLines = [];
    sorted.forEach(([id, sc], i) => {
        checkUser(id);
        if (sc > 0) {
            userData[id].pendingQuizPoints = (userData[id].pendingQuizPoints || 0) + sc;
        }
        // ── Tirakoob blitz (all-time) ──
        const s = userData[id].stats;
        s.blitzPlayed    = (s.blitzPlayed    || 0) + 1;
        if (i === 0 && sc > 0) s.blitzWins = (s.blitzWins || 0) + 1;
        if (sc > (s.blitzTopScore || 0)) s.blitzTopScore = sc;

        const medal = ['🥇', '🥈', '🥉'][i] || '▫️';
        rewardLines.push(`${medal} <@${id}> — **${sc}** dhibcood`);
    });
    saveData();

    const embed = new EmbedBuilder()
        .setTitle('⚡ Blitz Quiz — Dhamaaday!')
        .setDescription(
            `**🏆 Natiijada:**\n${rewardLines.join('\n')}\n\n` +
            `**Dhibcahaaga u badal XP ama IQ** _(1 dhibic = **${QUIZ_POINTS_TO_XP} XP** ama **${QUIZ_POINTS_TO_IQ} IQ**)_\n` +
            `Riix badhanka si aad isla markiiba u badasho:`
        )
        .setColor('#f1c40f');

    const exchRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('blitz_pts_xp')
            .setLabel(`Badal XP (+${QUIZ_POINTS_TO_XP}x)`)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('blitz_pts_iq')
            .setLabel(`Badal IQ (+${QUIZ_POINTS_TO_IQ}x)`)
            .setStyle(ButtonStyle.Primary),
    );

    await channel.send({ embeds: [embed], components: [exchRow] });
}

module.exports = { startBlitzLobby, beginBlitzGame, refreshLobby };

// ─────────────────────────────────────────────────────────────────────
// Admin stop — jooji blitz hadda socda
// ─────────────────────────────────────────────────────────────────────
async function stopBlitz(message) {
    const { isAdmin } = require('../utils/admin');
    const channelId   = message.channel.id;
    const state       = activeBlitz.get(channelId);

    if (!state) {
        return message.reply('⚠️ Channel-kan Blitz ma socdo.');
    }
    const isHost  = message.author.id === state.hostId;
    const adminOk = isAdmin(message.author.id);

    if (!isHost && !adminOk) {
        return message.reply('⛔ Kaliya **admin** ama **hostka** ayaa joojin kara.');
    }

    if (state.lobbyTimer) clearTimeout(state.lobbyTimer);
    activeBlitz.delete(channelId);

    if (state.lobbyMsg) {
        await state.lobbyMsg.edit({
            embeds: [new EmbedBuilder()
                .setTitle('🛑 Blitz waa la joojiyay')
                .setDescription(`<@${message.author.id}> ayaa joojiyay ciyaarta.`)
                .setColor('#e74c3c')],
            components: [],
        }).catch(() => {});
    }

    return message.reply('🛑 Blitz waa la joojiyay. Channel-ka ayaa la xoroobay.');
}

module.exports = { startBlitzLobby, beginBlitzGame, refreshLobby, stopBlitz };
