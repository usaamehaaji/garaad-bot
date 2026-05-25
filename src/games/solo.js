const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData, activeGames } = require('../store');
const { checkUser, getLevel, stripQuestionNumber } = require('../utils/helpers');
const { markSeenForGame } = require('../utils/questions');
const { markUserPlayed } = require('../utils/reminders');
const {
    GLOBAL_WAIT_MS,
    SOLO_FAST_MS,
    SOLO_MAX_SCORE,
    SOLO_MIN_SCORE,
    SOLO_DEFAULT_QUESTIONS,
    STREAK_BONUS_2,
    STREAK_BONUS_5,
    STREAK_BONUS_10,
} = require('../config');
const { getAnswerOptions } = require('../utils/questionOptions');

function calcTimedScore(timeTakenMs) {
    if (timeTakenMs <= SOLO_FAST_MS) return SOLO_MAX_SCORE;
    const ratio = (timeTakenMs - SOLO_FAST_MS) / (GLOBAL_WAIT_MS - SOLO_FAST_MS);
    return Math.max(SOLO_MIN_SCORE, Math.round(SOLO_MAX_SCORE - (SOLO_MAX_SCORE - SOLO_MIN_SCORE) * ratio));
}

function getStreakBonus(streak) {
    if (streak >= 10) return STREAK_BONUS_10;
    if (streak >= 5)  return STREAK_BONUS_5;
    if (streak >= 2)  return STREAK_BONUS_2;
    return 0;
}

function pointsDisplay(pts, bonus, streak) {
    let line = `🕐 **+${pts}** dhibcood`;
    if (bonus > 0) line += ` + **+${bonus}** streak bonus (${streak}🔥)`;
    return line;
}

function buildLeaderboardEmbed(userId) {
    const allUsers = Object.entries(userData)
        .filter(([, d]) => typeof d.iq === 'number')
        .map(([id, d]) => ({ id, iq: d.iq || 0 }))
        .sort((a, b) => b.iq - a.iq);

    const myIq = userData[userId]?.iq || 0;
    const rank = allUsers.findIndex(u => u.id === userId) + 1;
    const total = allUsers.length;

    const top10 = allUsers.slice(0, 10).map((u, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        const isMe  = u.id === userId ? ' ← **Adiga**' : '';
        return `${medal} <@${u.id}> — **${u.iq} IQ**${isMe}`;
    }).join('\n');

    let rankLine = '';
    if (rank > 10) rankLine = `\n\n📍 **Goobtagaadu waa:** #${rank} / ${total} — **${myIq} IQ**`;

    return new EmbedBuilder()
        .setTitle('🏆 IQ Leaderboard — Tartanka Guud')
        .setDescription(`**10-ka ugu IQ-da sarreeya:**\n\n${top10 || '_Ma jiraan ciyaaryahanno_'}${rankLine}`)
        .setColor('#f39c12')
        .setFooter({ text: '?top — liis buuxa · ?profile — xaaladda kuu gaar ah' });
}

// ── Shared answer processor ───────────────────────────────────────────
async function processAnswer(isCorrect, userId, game, timeTakenMs, embed, msg, messageOrInteraction, qNum) {
    checkUser(userId);
    let resultMsg = '';

    if (isCorrect) {
        const pts    = calcTimedScore(Math.min(timeTakenMs, GLOBAL_WAIT_MS));
        const streak = (game.currentStreak || 0) + 1;
        const bonus  = getStreakBonus(streak);
        const total  = pts + bonus;
        game.currentStreak = streak;
        game.bestStreak    = Math.max(game.bestStreak || 0, streak);
        game.totalPoints   = (game.totalPoints || 0) + total;
        game.correctCount  = (game.correctCount || 0) + 1;
        userData[userId].stats.soloCorrect++;
        resultMsg = `✅ **SAX!** ${pointsDisplay(pts, bonus, streak)}\n⏱️ ${(timeTakenMs / 1000).toFixed(1)}s`;
    } else {
        game.currentStreak = 0;
        userData[userId].stats.soloWrong++;
        userData[userId].iq = Math.max(0, (userData[userId].iq || 0) - 1);
        resultMsg = '❌ **QALAD** — **−1 IQ** · Streak: 0🔥';
    }

    userData[userId].stats.soloPlayed++;
    saveData();

    const updatedEmbed = EmbedBuilder.from(embed).setFields({ name: 'Natiijo', value: resultMsg });
    await msg.edit({ embeds: [updatedEmbed], components: [] }).catch(() => {});
    setTimeout(() => sendQuestion(messageOrInteraction, qNum + 1), 1800);
}

// ── Su'aal dir — always sends new message, reposts when player types ──
async function sendQuestion(messageOrInteraction, qNumber) {
    const isInteraction = !!(messageOrInteraction.isButton && messageOrInteraction.isButton());
    const userId        = isInteraction ? messageOrInteraction.user.id : messageOrInteraction.author.id;
    const game          = activeGames.get(userId);
    const channel       = messageOrInteraction.channel;

    // Clear any previous monitors/timers from last question
    if (game?.chatMonitor)   { game.chatMonitor.stop();          game.chatMonitor   = null; }
    if (game?.activeTimeout) { clearTimeout(game.activeTimeout); game.activeTimeout = null; }

    const total = game ? game.total : SOLO_DEFAULT_QUESTIONS;

    // ── Finish screen ────────────────────────────────────────────────
    if (!game || qNumber > total) {
        activeGames.delete(userId);
        checkUser(userId);
        markUserPlayed(userId);

        const d         = userData[userId];
        const totalPts  = game ? (game.totalPoints  || 0) : 0;
        const streak    = game ? (game.bestStreak   || 0) : 0;
        const correct   = game ? (game.correctCount || 0) : 0;
        const wrong     = total - correct;

        const dayKey = new Date().toISOString().slice(0, 10);
        const dd = userData[userId];
        if (dd.soloIqDayKey !== dayKey) { dd.soloIqDayKey = dayKey; dd.soloIqToday = 0; }
        const soloLeft  = Math.max(0, 30 - (dd.soloIqToday || 0));
        const rawIqGain = Math.floor(correct / 3);
        const iqGain    = Math.min(rawIqGain, soloLeft);
        if (iqGain > 0) {
            userData[userId].iq = (userData[userId].iq || 0) + iqGain;
            dd.soloIqToday = (dd.soloIqToday || 0) + iqGain;
            saveData();
        }
        const dayUsed = dd.soloIqToday || 0;

        const finishEmbed = new EmbedBuilder()
            .setTitle('🏁 Ciyaarta Waa Dhamaaday!')
            .setDescription(
                `### 📊 Natiijadaada — <@${userId}>\n\n` +
                `✅ Sax: **${correct}** | ❌ Qalad: **${wrong}** | Su'aalo: **${total}**\n` +
                `🎯 Dhibco guud: **${totalPts}** pts\n` +
                `🔥 Streak ugu dheer: **${streak}** sax oo isku xigta\n` +
                `🧠 IQ aad heshay: **+${iqGain} IQ** _(${correct} sax ÷ 3)_\n` +
                `📅 Maanta solo IQ: **${dayUsed}/30**\n\n` +
                `🧠 IQ hadda: **${d.iq || 0}** | ⭐ XP: **${d.xp || 0}** | Heer **${getLevel(d.iq || 0)}**`
            )
            .setColor('#2ecc71');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`solo_leaderboard_${userId}`).setLabel('🏆 IQ Leaderboard').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`close_solo_${userId}`).setLabel('Iska xir').setStyle(ButtonStyle.Danger),
        );

        await channel.send({ embeds: [finishEmbed], components: [row] });
        return;
    }

    const q = game.questions[qNumber - 1];
    game.currentQ = qNumber;
    markSeenForGame(userId, 'solo', q._idx);
    saveData();

    const entries = getAnswerOptions(q);
    if (entries.length === 0) {
        activeGames.delete(userId);
        await channel.send('⚠️ Su\'aal aan la fahmin.');
        return;
    }

    const streak     = game.currentStreak || 0;
    const streakLine = streak >= 2 ? `🔥 Streak: **${streak}** — bonus **+${getStreakBonus(streak)}**` : '';
    const isTF       = ['tf', 'truefalse', 'bool'].includes((q.type || '').toLowerCase());
    const scoreHint  = isTF ? `⏱️ 18s — **5 → 40 dhibcood** (Run / Been)` : `⏱️ 18s — **< 5s = 40pts · 18s = 5pts**`;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Su'aal ${qNumber}/${total}`)
        .setDescription(
            `## ${stripQuestionNumber(q.question)}\n\n` +
            `${scoreHint}\n` +
            (streakLine ? `${streakLine}\n` : '') +
            `🏆 Dhibco hadda: **${game.totalPoints || 0}** pts`
        )
        .setColor(streak >= 5 ? '#e67e22' : streak >= 2 ? '#f39c12' : '#0099ff');

    const buttons = entries.map((e, i) =>
        new ButtonBuilder()
            .setCustomId(`q_${qNumber}_${i}_${userId}_${e.isCorrect}`)
            .setLabel(e.label.slice(0, 80))
            .setStyle(ButtonStyle.Primary),
    );
    const row = new ActionRowBuilder().addComponents(buttons);

    // Send as NEW message — mention player so it's clear whose game it is
    let msg = await channel.send({ content: `🎯 <@${userId}>`, embeds: [embed], components: [row] });
    game.activeMsg    = msg;
    game.questionDone = false;
    const startTime   = Date.now();

    // ── Timeout via setTimeout (replaces button collector for timeout detection) ──
    game.activeTimeout = setTimeout(async () => {
        if (game.questionDone) return;
        game.questionDone = true;
        if (game.chatMonitor) { game.chatMonitor.stop(); game.chatMonitor = null; }
        checkUser(userId);
        game.currentStreak = 0;
        userData[userId].stats.soloWrong++;
        userData[userId].iq = Math.max(0, (userData[userId].iq || 0) - 1);
        saveData();
        const timeoutEmbed = EmbedBuilder.from(embed)
            .setFields({ name: 'Natiijo', value: '⏰ Wakhti dhammaaday — **−1 IQ** · Streak: 0' });
        if (game.activeMsg) await game.activeMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        setTimeout(() => sendQuestion(messageOrInteraction, qNumber + 1), 2000);
    }, GLOBAL_WAIT_MS);

    // ── Chat monitor: any non-bot message → repost question at bottom ──
    const chatMonitor = channel.createMessageCollector({
        filter: m => !m.author.bot,
        time:   GLOBAL_WAIT_MS + 2000,
    });
    game.chatMonitor = chatMonitor;

    chatMonitor.on('collect', async m => {
        if (game.questionDone) { chatMonitor.stop(); return; }
        // Any message (anyone) → delete old card and repost at bottom
        const oldMsg = game.activeMsg;
        const newMsg = await channel.send({ content: `🎯 <@${userId}>`, embeds: [embed], components: [row] }).catch(() => null);
        if (newMsg) {
            game.activeMsg = newMsg;
            await oldMsg.delete().catch(() => {});
        }
    });
}

// ── Button answer handler ─────────────────────────────────────────────
async function handleSoloAnswer(interaction) {
    const parts   = interaction.customId.split('_');
    const qNum    = parseInt(parts[1]);
    const ownerId = parts[3];
    const result  = parts[4];

    if (interaction.user.id !== ownerId)
        return interaction.reply({ content: 'Ciyaartaada qoro!', flags: 64 });

    await interaction.deferUpdate();

    checkUser(ownerId);
    const game = activeGames.get(ownerId);
    if (!game || game.questionDone) return; // already answered by text

    if (game.chatMonitor)   { game.chatMonitor.stop();          game.chatMonitor   = null; }
    if (game.activeTimeout) { clearTimeout(game.activeTimeout); game.activeTimeout = null; }
    game.questionDone = true;

    const timeTaken = Date.now() - (interaction.message.createdTimestamp || Date.now());
    const isCorrect = result === 'true';
    const embed     = interaction.message.embeds[0];

    await processAnswer(isCorrect, ownerId, game, timeTaken, embed, interaction.message, interaction, qNum);
}

// ── Leaderboard button handler ────────────────────────────────────────
async function handleSoloLeaderboard(interaction) {
    const ownerId = interaction.customId.replace('solo_leaderboard_', '');
    if (interaction.user.id !== ownerId)
        return interaction.reply({ content: '⚠️ Adiga kuma codsanin.', flags: 64 });
    return interaction.reply({ embeds: [buildLeaderboardEmbed(ownerId)], flags: 64 });
}

module.exports = { sendQuestion, handleSoloAnswer, handleSoloLeaderboard };
