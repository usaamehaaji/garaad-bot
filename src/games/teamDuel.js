// =====================================================================
// GARAAD BOT — Team Duel (1v1 / 2v2 / 3v3)
// Host: ?tduel 2v2 usd 10000  |  Kick: ?tremove @user
// Stakes deducted on join, refunded on leave/kick/cancel
// =====================================================================

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { userData, saveData } = require('../store');

const BTC_ICON = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';
const { econData, saveEcon, checkEconUser } = require('../economy/econStore');
const { checkUser, stripQuestionNumber } = require('../utils/helpers');
const {
    pickQuestionsForGame,
    markSeenForUsersInGame,
    noQuestionsLeftEmbed,
} = require('../utils/questions');
const { getAnswerOptions } = require('../utils/questionOptions');
const { GLOBAL_WAIT_MS, SOLO_FAST_MS, SOLO_MAX_SCORE, SOLO_MIN_SCORE } = require('../config');

// channelId → state
const activeTeamDuels = new Map();

function calcTimedScore(timeTakenMs) {
    if (timeTakenMs <= SOLO_FAST_MS) return SOLO_MAX_SCORE;
    const ratio = (timeTakenMs - SOLO_FAST_MS) / (GLOBAL_WAIT_MS - SOLO_FAST_MS);
    return Math.max(SOLO_MIN_SCORE, Math.round(SOLO_MAX_SCORE - (SOLO_MAX_SCORE - SOLO_MIN_SCORE) * ratio));
}

const TDUEL_Q_DEFAULT = 10;
const TDUEL_Q_MIN     = 3;
const TDUEL_Q_MAX     = 25;

// ── Helpers ───────────────────────────────────────────────────────────

function allJoined(state) {
    return [...state.teams[1], ...state.teams[2]];
}

function totalNeeded(state) {
    return state.maxPerTeam * 2;
}

function teamOf(state, userId) {
    if (state.teams[1].includes(userId)) return 1;
    if (state.teams[2].includes(userId)) return 2;
    return null;
}

function hasEnough(state, userId) {
    if (state.stakeType === 'iq') {
        checkUser(userId);
        return userData[userId].iq >= state.stakeAmount;
    }
    checkEconUser(userId);
    return econData[userId].usd >= state.stakeAmount;
}

function deductStake(state, userId) {
    if (state.stakeType === 'iq') { checkUser(userId); userData[userId].iq -= state.stakeAmount; }
    else { checkEconUser(userId); econData[userId].usd -= state.stakeAmount; }
}

function refundStake(state, userId) {
    if (state.stakeType === 'iq') { checkUser(userId); userData[userId].iq += state.stakeAmount; }
    else { checkEconUser(userId); econData[userId].usd += state.stakeAmount; }
}

function persistStakes(state) {
    if (state.stakeType === 'iq') saveData(); else saveEcon();
}

// ── Embed / Row builders ──────────────────────────────────────────────

function buildLobbyEmbed(state) {
    const t1 = state.teams[1].map(id => `<@${id}>`).join(', ') || '—';
    const t2 = state.teams[2].map(id => `<@${id}>`).join(', ') || '—';
    const joined   = allJoined(state).length;
    const needed   = totalNeeded(state);
    const stakeStr = `${state.stakeAmount.toLocaleString()} ${state.stakeType.toUpperCase()}`;
    const totalStr = `${fmt((state.stakeAmount * needed))} ${state.stakeType.toUpperCase()}`;

    return new EmbedBuilder()
        .setTitle(`⚔️ Team Duel — ${state.mode.toUpperCase()}`)
        .setColor('#e67e22')
        .setDescription(
            `**Host:** <@${state.hostId}>\n` +
            `**Dhig qof kasta:** ${stakeStr}\n` +
            `**Wadarta:** ${totalStr}\n` +
            `**Su'aalood:** ${state.totalQ}\n\n` +
            `🔵 **Team 1** (${state.teams[1].length}/${state.maxPerTeam})\n${t1}\n\n` +
            `🔴 **Team 2** (${state.teams[2].length}/${state.maxPerTeam})\n${t2}\n\n` +
            `👥 ${joined}/${needed} qof ayaa ku biiray\n\n` +
            `_Dhigga waa la jaraa markad "✅ Ku biir" gujiso._`
        );
}

function lobbyRow(channelId, hostId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tduel_join_${channelId}`)
            .setLabel('✅ Ku biir')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`tduel_leave_${channelId}`)
            .setLabel('🚪 Ka bax')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`tduel_start_${hostId}_${channelId}`)
            .setLabel('▶️ Bilow')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`tduel_cancel_${hostId}_${channelId}`)
            .setLabel('❌ Jooji')
            .setStyle(ButtonStyle.Danger),
    );
}

// ── Commands ──────────────────────────────────────────────────────────

async function cmdTeamDuel(message, args) {
    if (!message.guild) {
        return message.reply('⛔ `?deul` server channel kaliya ayaa loogu shaqeeyaa — DM kuma shaqeyso.');
    }

    const channelId = message.channel.id;
    const hostId    = message.author.id;

    if (activeTeamDuels.has(channelId)) {
        return message.reply('⚠️ Channel-kan team duel ayaa socda. Sug ama host-ku ha joojiyaa.');
    }

    const modeArg   = (args[0] || '2v2').toLowerCase();
    const typeArg   = (args[1] || 'iq').toLowerCase();
    const amountArg = parseInt(args[2] || '5');
    const countArg  = args[3] ? parseInt(args[3]) : TDUEL_Q_DEFAULT;

    const modeMap = { '1v1': 1, '2v2': 2, '3v3': 3 };
    if (!modeMap[modeArg]) {
        return message.reply(
            '⚠️ Nidaamka waa: `1v1`, `2v2`, ama `3v3`\n' +
            'Tusaale: `?tduel 2v2 usd 10000` ama `?tduel 1v1 iq 50`',
        );
    }
    if (!['iq', 'usd'].includes(typeArg)) {
        return message.reply('⚠️ Nooca dhigga waa `iq` ama `usd`.\nTusaale: `?tduel 2v2 usd 10000`');
    }
    if (isNaN(amountArg) || amountArg <= 0) {
        return message.reply('⚠️ Dhigga qiimihiisu waa inuu ka sarreeyo 0.\nTusaale: `?deul 2v2 usd 10000`');
    }
    if (isNaN(countArg) || countArg < TDUEL_Q_MIN || countArg > TDUEL_Q_MAX) {
        return message.reply(`⚠️ Tirada su'aalaha waa inay u dhexeyso **${TDUEL_Q_MIN}** iyo **${TDUEL_Q_MAX}**.\nTusaale: \`?deul 2v2 usd 10000 10\``);
    }

    const state = {
        hostId,
        mode: modeArg,
        maxPerTeam: modeMap[modeArg],
        stakeType: typeArg,
        stakeAmount: amountArg,
        teams: { 1: [], 2: [] },
        scores: {},
        phase: 'lobby',
        questions: [],
        currentQ: 0,
        totalQ: countArg,
        channelId,
        lobbyMsg: null,
    };

    activeTeamDuels.set(channelId, state);

    const msg = await message.reply({
        embeds:     [buildLobbyEmbed(state)],
        components: [lobbyRow(channelId, hostId)],
    });
    state.lobbyMsg = msg;
}

async function cmdTeamRemove(message, args) {
    const channelId = message.channel.id;
    const state     = activeTeamDuels.get(channelId);

    if (!state || state.phase !== 'lobby') {
        return message.reply('⚠️ Lobby ma jirto channel-kan.');
    }
    if (message.author.id !== state.hostId) {
        return message.reply('⛔ Host kaliya ayaa qof ka saari kara.');
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ `?tremove @user` isticmaal.');
    if (target.id === state.hostId) return message.reply('⚠️ Host isaga ma saari karo.');

    const team = teamOf(state, target.id);
    if (team === null) return message.reply(`⚠️ <@${target.id}> lobby kuma jirto.`);

    state.teams[team].splice(state.teams[team].indexOf(target.id), 1);
    refundStake(state, target.id);
    persistStakes(state);

    await state.lobbyMsg.edit({
        embeds:     [buildLobbyEmbed(state)],
        components: [lobbyRow(state.channelId, state.hostId)],
    }).catch(() => {});

    return message.reply(`✅ <@${target.id}> lobby ayaa laga saaray — dhigga waa la soo celiyay.`);
}

// ── Button handlers ───────────────────────────────────────────────────

async function handleJoin(interaction, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state || state.phase !== 'lobby') {
        return interaction.reply({ content: '⚠️ Lobby ma jirto.', flags: MessageFlags.Ephemeral });
    }

    const userId = interaction.user.id;
    if (teamOf(state, userId) !== null) {
        return interaction.reply({ content: '✅ Horey ayaad u ku biirtay!', flags: MessageFlags.Ephemeral });
    }

    // Slots full?
    if (state.teams[1].length >= state.maxPerTeam && state.teams[2].length >= state.maxPerTeam) {
        return interaction.reply({ content: '⚠️ Lobby waa buuxday!', flags: MessageFlags.Ephemeral });
    }

    // Check stake
    if (!hasEnough(state, userId)) {
        const have = state.stakeType === 'iq'
            ? `${userData[userId].iq} IQ`
            : `$${econData[userId].usd.toLocaleString()}`;
        const need = state.stakeType === 'iq'
            ? `${state.stakeAmount} IQ`
            : `$${state.stakeAmount.toLocaleString()}`;
        return interaction.reply({
            content: `⚠️ ${state.stakeType.toUpperCase()} kugu filna ma lihid.\nHaysataa: **${have}** — Dhig: **${need}**`,
            flags: MessageFlags.Ephemeral,
        });
    }

    // Assign team
    if (state.teams[1].length < state.maxPerTeam) {
        state.teams[1].push(userId);
    } else {
        state.teams[2].push(userId);
    }

    // Deduct stake immediately on join
    deductStake(state, userId);
    persistStakes(state);

    return interaction.update({
        embeds:     [buildLobbyEmbed(state)],
        components: [lobbyRow(channelId, state.hostId)],
    });
}

async function handleLeave(interaction, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state || state.phase !== 'lobby') {
        return interaction.reply({ content: '⚠️ Lobby ma jirto.', flags: MessageFlags.Ephemeral });
    }

    const userId = interaction.user.id;
    if (userId === state.hostId) {
        return interaction.reply({
            content: '⚠️ Host "❌ Jooji" badhanka ku joog lobby-ga si loo xiro.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const team = teamOf(state, userId);
    if (team === null) {
        return interaction.reply({ content: '⚠️ Lobby kuma jirtid.', flags: MessageFlags.Ephemeral });
    }

    state.teams[team].splice(state.teams[team].indexOf(userId), 1);
    refundStake(state, userId);
    persistStakes(state);

    return interaction.update({
        embeds:     [buildLobbyEmbed(state)],
        components: [lobbyRow(channelId, state.hostId)],
    });
}

async function handleStart(interaction, hostId, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state || state.phase !== 'lobby') {
        return interaction.reply({ content: '⚠️ Lobby ma jirto.', flags: MessageFlags.Ephemeral });
    }
    if (interaction.user.id !== hostId) {
        return interaction.reply({ content: '⛔ Host kaliya ayaa bilaabi kara.', flags: MessageFlags.Ephemeral });
    }

    const t1 = state.teams[1].length;
    const t2 = state.teams[2].length;

    if (t1 === 0 || t2 === 0) {
        return interaction.reply({
            content: '⚠️ Labada koob mid walba waa inuu leeyahay ugu yaraan 1 ciyaaryahan.',
            flags: MessageFlags.Ephemeral,
        });
    }
    if (t1 !== t2) {
        return interaction.reply({
            content: `⚠️ Koobabku waa inay isla tirsanyihiin. Team 1: ${t1} | Team 2: ${t2}`,
            flags: MessageFlags.Ephemeral,
        });
    }

    // Pick questions (stakes already deducted on join)
    const questions = pickQuestionsForGame(state.hostId, 'duel', state.totalQ);
    if (!questions || questions.length === 0) {
        // Refund all and cancel
        for (const uid of allJoined(state)) { refundStake(state, uid); }
        persistStakes(state);
        activeTeamDuels.delete(channelId);
        return interaction.update({
            embeds: [new EmbedBuilder()
                .setTitle('⚠️ Team Duel — Su\'aalaha la heyn waayay')
                .setDescription('Dhigga waa la soo celiyay.')
                .setColor('#e74c3c')],
            components: [],
        });
    }

    state.questions = questions;
    state.totalQ    = questions.length;
    state.phase     = 'playing';

    for (const uid of allJoined(state)) state.scores[uid] = 0;

    const players = allJoined(state);
    const totalPrize = state.stakeAmount * players.length;

    const startEmbed = new EmbedBuilder()
        .setTitle(`⚔️ Team Duel — ${state.mode.toUpperCase()} — Bilaabmay!`)
        .setColor('#e67e22')
        .setDescription(
            `🔵 **Team 1:** ${state.teams[1].map(id => `<@${id}>`).join(', ')}\n` +
            `🔴 **Team 2:** ${state.teams[2].map(id => `<@${id}>`).join(', ')}\n\n` +
            `**Wadarta:** ${totalPrize.toLocaleString()} ${state.stakeType.toUpperCase()}\n` +
            `**${state.totalQ}** su'aalood — qof kasta si gooni ah ayuu jawaabaa!\n\n` +
            `Bilaabaya 3 ilbiriqsi gudahood...`,
        );

    await interaction.update({ embeds: [startEmbed], components: [] });
    setTimeout(() => sendTeamDuelQuestion(interaction.channel, channelId), 3000);
}

async function handleCancel(interaction, hostId, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state) {
        return interaction.reply({ content: '⚠️ Lobby ma jirto.', flags: MessageFlags.Ephemeral });
    }
    if (interaction.user.id !== hostId) {
        return interaction.reply({ content: '⛔ Host kaliya ayaa joojin kara.', flags: MessageFlags.Ephemeral });
    }

    // Refund all who joined
    for (const uid of allJoined(state)) { refundStake(state, uid); }
    persistStakes(state);
    activeTeamDuels.delete(channelId);

    return interaction.update({
        embeds: [new EmbedBuilder()
            .setTitle('❌ Team Duel waa la joojiyay')
            .setDescription('Dhigga waa la soo celiyay dadka ku biiray.')
            .setColor('#e74c3c')],
        components: [],
    });
}

// ── Game loop ─────────────────────────────────────────────────────────

async function sendTeamDuelQuestion(channel, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state || state.phase !== 'playing') return;

    if (state.currentQ >= state.totalQ) return finishTeamDuel(channel, channelId);

    const qIndex  = state.currentQ;
    const q       = state.questions[qIndex];
    const players = allJoined(state);

    markSeenForUsersInGame(players, 'duel', q._idx);
    saveData();

    const entries = getAnswerOptions(q);
    if (entries.length === 0) {
        for (const uid of players) { refundStake(state, uid); }
        persistStakes(state);
        activeTeamDuels.delete(channelId);
        return channel.send('⚠️ Su\'aal khaldan — dhigga waa la soo celiyay.');
    }

    const t1Score = state.teams[1].reduce((s, id) => s + (state.scores[id] || 0), 0);
    const t2Score = state.teams[2].reduce((s, id) => s + (state.scores[id] || 0), 0);

    const qEmbed = new EmbedBuilder()
        .setTitle(`⚔️ Team Duel — Su'aal ${qIndex + 1}/${state.totalQ}`)
        .setThumbnail(BTC_ICON)
        .setColor('#9b59b6')
        .setDescription(
            `## ${stripQuestionNumber(q.question)}\n\n` +
            `⏱️ ${GLOBAL_WAIT_MS / 1000} ilbiriqsi\n\n` +
            `🔵 Team 1: **${t1Score}** | 🔴 Team 2: **${t2Score}**`,
        );

    const buttons = entries.map((e, i) =>
        new ButtonBuilder()
            .setCustomId(`tduel_ans_${channelId}_${qIndex}_${i}_${e.isCorrect ? 't' : 'f'}`)
            .setLabel(e.label.slice(0, 80))
            .setStyle(ButtonStyle.Primary),
    );

    let msg;
    try {
        msg = await channel.send({ embeds: [qEmbed], components: [new ActionRowBuilder().addComponents(buttons)] });
    } catch {
        for (const uid of players) { refundStake(state, uid); }
        persistStakes(state);
        activeTeamDuels.delete(channelId);
        return;
    }
    state.currentMsg = msg;

    const answeredThisQ  = new Set();
    const questionStartMs = Date.now();

    const filter = i =>
        i.customId.startsWith(`tduel_ans_${channelId}_${qIndex}_`) &&
        players.includes(i.user.id);

    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS });

    collector.on('collect', async interaction => {
        if (answeredThisQ.has(interaction.user.id)) {
            return interaction.reply({ content: '↩️ Su\'aashan mar hore ayaad jawaabday!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        answeredThisQ.add(interaction.user.id);

        const isCorrect = interaction.customId.endsWith('_t');
        if (isCorrect) {
            const pts  = calcTimedScore(Date.now() - questionStartMs);
            const secs = ((Date.now() - questionStartMs) / 1000).toFixed(1);
            state.scores[interaction.user.id] = (state.scores[interaction.user.id] || 0) + pts;
            await interaction.reply({ content: `✅ Saxsanaan! +${pts} dhibcood · ⏱️ ${secs}s`, flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Khalad! 0 dhibcood', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        if (answeredThisQ.size >= players.length) collector.stop('all_answered');
    });

    collector.on('end', async () => {
        const cur = activeTeamDuels.get(channelId);
        if (!cur || cur.phase !== 'playing') return;

        const correctLabel = entries.find(e => e.isCorrect)?.label || String(q.correct);
        const newT1 = cur.teams[1].reduce((s, id) => s + (cur.scores[id] || 0), 0);
        const newT2 = cur.teams[2].reduce((s, id) => s + (cur.scores[id] || 0), 0);

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`⚔️ Team Duel — Su'aal ${qIndex + 1}/${cur.totalQ}`)
            .setThumbnail(BTC_ICON)
            .setColor('#2ecc71')
            .setDescription(
                `## ${stripQuestionNumber(q.question)}\n\n` +
                `✅ **${correctLabel}**\n\n` +
                `🔵 Team 1: **${newT1}** | 🔴 Team 2: **${newT2}**`,
            );

        await msg.edit({ embeds: [summaryEmbed], components: [] }).catch(() => {});

        cur.currentQ++;
        setTimeout(() => sendTeamDuelQuestion(channel, channelId), 2500);
    });
}

async function finishTeamDuel(channel, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state) return;

    const t1Score = state.teams[1].reduce((s, id) => s + (state.scores[id] || 0), 0);
    const t2Score = state.teams[2].reduce((s, id) => s + (state.scores[id] || 0), 0);
    const players    = allJoined(state);
    const totalPrize = state.stakeAmount * players.length;

    let resultEmbed;

    // IQ bonus from correct answers for all participants
    const iqBonuses = {};
    for (const uid of players) {
        const iq = Math.floor((state.scores[uid] || 0) / 90);
        if (iq > 0) { checkUser(uid); userData[uid].iq = (userData[uid].iq || 0) + iq; iqBonuses[uid] = iq; }
    }
    if (Object.keys(iqBonuses).length > 0) saveData();

    const bonusLine = Object.keys(iqBonuses).length > 0
        ? `\n\n🧠 **IQ Bonus (suaalaha):** ${players.map(id => iqBonuses[id] ? `<@${id}> +${iqBonuses[id]}` : null).filter(Boolean).join(' · ')}`
        : '';

    if (t1Score === t2Score) {
        for (const uid of players) { refundStake(state, uid); }

        resultEmbed = new EmbedBuilder()
            .setTitle('🤝 Team Duel — Iskumid!')
            .setThumbnail(BTC_ICON)
            .setColor('#f1c40f')
            .setDescription(
                `🔵 Team 1: **${t1Score}** dhibic\n` +
                `🔴 Team 2: **${t2Score}** dhibic\n\n` +
                `Waa iskumid! Dhigga waa la soo celiyay.${bonusLine}`,
            );
    } else {
        const winTeam    = t1Score > t2Score ? 1 : 2;
        const loseTeam   = winTeam === 1 ? 2 : 1;
        const winIds     = state.teams[winTeam];
        const loseIds    = state.teams[loseTeam];
        const perWinner  = Math.floor(totalPrize / winIds.length);

        for (const uid of winIds) {
            if (state.stakeType === 'iq') { checkUser(uid); userData[uid].iq += perWinner; }
            else { checkEconUser(uid); econData[uid].usd += perWinner; }
        }

        const winColor = winTeam === 1 ? '🔵' : '🔴';
        resultEmbed = new EmbedBuilder()
            .setTitle('🏆 Team Duel — Dhamaatay!')
            .setThumbnail(BTC_ICON)
            .setColor('#2ecc71')
            .setDescription(
                `${winColor} **Team ${winTeam}:** **${Math.max(t1Score, t2Score)}** dhibic 🏆\n` +
                `${winTeam === 1 ? '🔴' : '🔵'} **Team ${loseTeam}:** **${Math.min(t1Score, t2Score)}** dhibic\n\n` +
                `🥇 **Guulayste:** ${winIds.map(id => `<@${id}>`).join(', ')}\n` +
                `   Qof kasta: **+${perWinner.toLocaleString()} ${state.stakeType.toUpperCase()}**\n\n` +
                `💀 **Lumiyay:** ${loseIds.map(id => `<@${id}>`).join(', ')}\n` +
                `   Qof kasta: −${state.stakeAmount.toLocaleString()} ${state.stakeType.toUpperCase()}${bonusLine}`,
            );
    }

    persistStakes(state);
    activeTeamDuels.delete(channelId);

    await channel.send({ embeds: [resultEmbed] });
}

// ── Non-participant answer guard ──────────────────────────────────────

async function handleNonParticipantAnswer(interaction, channelId) {
    const state = activeTeamDuels.get(channelId);
    if (!state || state.phase !== 'playing') {
        return interaction.reply({ content: '⚠️ Ciyaar ma socdo.', flags: MessageFlags.Ephemeral });
    }
    const userId = interaction.user.id;
    if (!allJoined(state).includes(userId)) {
        return interaction.reply({ content: '⛔ Game kuma jirtid — kama jawaabi kartid.', flags: MessageFlags.Ephemeral });
    }
}

module.exports = {
    activeTeamDuels,
    cmdTeamDuel,
    cmdTeamRemove,
    handleJoin,
    handleLeave,
    handleStart,
    handleCancel,
    handleNonParticipantAnswer,
};
