// =====================================================================
// CIYAARTA SOLO — Garaad Quiz
// Dhibco: ku xidhan xawliga (5s = max 40, 18s = min 5)
// Streak: jawaabo sax oo isku xigta → bonus dhibcood
// Dhammaadka: IQ leaderboard + goobta aad ku jirtid
// =====================================================================

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

// ── Xisaabi dhibcaha ku xidhan xawliga ──────────────────────────────
// < 5s   → max 40 dhibcood
// 18s    → min 5 dhibcood
// dhexda → linear
function calcTimedScore(timeTakenMs) {
    if (timeTakenMs <= SOLO_FAST_MS) return SOLO_MAX_SCORE;
    const ratio = (timeTakenMs - SOLO_FAST_MS) / (GLOBAL_WAIT_MS - SOLO_FAST_MS);
    return Math.max(SOLO_MIN_SCORE, Math.round(SOLO_MAX_SCORE - (SOLO_MAX_SCORE - SOLO_MIN_SCORE) * ratio));
}

// ── Streak bonus ─────────────────────────────────────────────────────
function getStreakBonus(streak) {
    if (streak >= 10) return STREAK_BONUS_10;
    if (streak >= 5)  return STREAK_BONUS_5;
    if (streak >= 2)  return STREAK_BONUS_2;
    return 0;
}

// ── IQ Leaderboard (ka dib game) ─────────────────────────────────────
function buildLeaderboardEmbed(userId, totalPoints, questionsCount) {
    const allUsers = Object.entries(userData)
        .filter(([, d]) => typeof d.iq === 'number')
        .map(([id, d]) => ({ id, iq: d.iq || 0 }))
        .sort((a, b) => b.iq - a.iq);

    const myIq  = userData[userId]?.iq || 0;
    const rank  = allUsers.findIndex(u => u.id === userId) + 1;
    const total = allUsers.length;

    const top10 = allUsers.slice(0, 10).map((u, i) => {
        const medal  = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        const isMe   = u.id === userId ? ' ← **Adiga**' : '';
        return `${medal} <@${u.id}> — **${u.iq} IQ**${isMe}`;
    }).join('\n');

    // Haddii user-ku top 10 ku jiro, ka muuji goobtiisa
    let rankLine = '';
    if (rank > 10) {
        rankLine = `\n\n📍 **Goobtagaadu waa:** #${rank} / ${total} — **${myIq} IQ**`;
    }

    return new EmbedBuilder()
        .setTitle('🏆 IQ Leaderboard — Tartanka Guud')
        .setDescription(
            `**10-ka ugu IQ-da sarreeya:**\n\n${top10 || '_Ma jiraan ciyaaryahanno_'}${rankLine}`
        )
        .setColor('#f39c12')
        .setFooter({ text: `?top — liis buuxa · ?profile — xaaladda kuu gaar ah` });
}

// ── Dhibcaha yabooh muuji ─────────────────────────────────────────────
function pointsDisplay(pts, bonus, streak) {
    let line = `🕐 **+${pts}** dhibcood`;
    if (bonus > 0) {
        line += ` + **+${bonus}** streak bonus (${streak}🔥)`;
    }
    return line;
}

// ── Su'aal dir ────────────────────────────────────────────────────────
async function sendQuestion(messageOrInteraction, qNumber, currentMsg = null) {
    const isInteraction = !!(messageOrInteraction.isButton && messageOrInteraction.isButton());
    const userId        = isInteraction ? messageOrInteraction.user.id : messageOrInteraction.author.id;
    const game          = activeGames.get(userId);
    const total         = game ? game.total : SOLO_DEFAULT_QUESTIONS;

    if (!game || qNumber > total) {
        const originMsg = game?.originMsg ?? null;
        activeGames.delete(userId);
        checkUser(userId);
        markUserPlayed(userId);

        const d          = userData[userId];
        const totalPts   = game ? (game.totalPoints || 0) : 0;
        const streak     = game ? (game.bestStreak  || 0) : 0;
        const correct    = game ? (game.correctCount || 0) : 0;
        const wrong      = total - correct;
        // 3 sax = 1 IQ, xad 30 IQ maalintiiba solo
        const dayKey = new Date().toISOString().slice(0, 10);
        const dd = userData[userId];
        if (dd.soloIqDayKey !== dayKey) { dd.soloIqDayKey = dayKey; dd.soloIqToday = 0; }
        const soloLeft   = Math.max(0, 30 - (dd.soloIqToday || 0));
        const rawIqGain  = Math.floor(correct / 3);
        const iqGain     = Math.min(rawIqGain, soloLeft);
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
                `🧠 IQ aad heshay game kan waa: **+${iqGain} IQ** _(${correct} sax ÷ 3)_\n` +
                `📅 Maanta solo IQ: **${dayUsed}/30**\n\n` +
                `🧠 IQ hadda: **${d.iq || 0}** | ⭐ XP: **${d.xp || 0}** | Heer **${getLevel(d.iq || 0)}**`
            )
            .setColor('#2ecc71');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`solo_leaderboard_${userId}`)
                .setLabel('🏆 IQ Leaderboard')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`close_solo_${userId}`)
                .setLabel('Iska xir')
                .setStyle(ButtonStyle.Danger),
        );

        if (currentMsg) await currentMsg.delete().catch(() => {});
        const fc = messageOrInteraction.channel;
        const finishReply = originMsg ? { reply: { messageReference: originMsg.id, failIfNotExists: false } } : {};
        if (fc) {
            await fc.send({ embeds: [finishEmbed], components: [row], ...finishReply });
        } else {
            await messageOrInteraction.reply({ embeds: [finishEmbed], components: [row] });
        }

        return;
    }

    const q = game.questions[qNumber - 1];
    game.currentQ = qNumber;

    markSeenForGame(userId, 'solo', q._idx);
    saveData();

    const entries = getAnswerOptions(q);
    if (entries.length === 0) {
        activeGames.delete(userId);
        return messageOrInteraction.reply?.({ content: '⚠️ Su\'aal aan la fahmin (faylka su\'aalahooda).' });
    }

    // Streak iyo score muuji
    const streak     = game.currentStreak || 0;
    const streakLine = streak >= 2 ? `🔥 Streak: **${streak}** — bonus **+${getStreakBonus(streak)}**` : '';

    const isTF = (q.type || '').toLowerCase() === 'tf' ||
                 (q.type || '').toLowerCase() === 'truefalse' ||
                 (q.type || '').toLowerCase() === 'bool';

    const scoreHint = isTF
        ? `⏱️ 18s — **5 → 40 dhibcood** (Run / Been)`
        : `⏱️ 18s — **< 5s = 40pts · 18s = 5pts**`;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Su'aal ${qNumber}/${total}`)
        .setDescription(
            `## ${stripQuestionNumber(q.question)}\n\n` +
            `${scoreHint}\n` +
            (streakLine ? `${streakLine}\n` : '') +
            `🏆 Dhibco hadda: **${game.totalPoints || 0}** pts`
        )
        .setColor(streak >= 5 ? '#e67e22' : streak >= 2 ? '#f39c12' : '#0099ff');

    const buttons = entries.map((e, index) =>
        new ButtonBuilder()
            .setCustomId(`q_${qNumber}_${index}_${userId}_${e.isCorrect}`)
            .setLabel(e.label.slice(0, 80))
            .setStyle(ButtonStyle.Primary),
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const channel  = messageOrInteraction.channel;
    const replyOpt = game?.originMsg ? { reply: { messageReference: game.originMsg.id, failIfNotExists: false } } : {};

    let activeMsg;
    if (currentMsg) {
        activeMsg = await currentMsg.edit({ embeds: [embed], components: [row] });
    } else {
        activeMsg = await messageOrInteraction.reply({ embeds: [embed], components: [row], fetchReply: true });
    }

    const filter = i => i.user.id === userId;
    const collector = activeMsg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS, max: 1 });

    collector.on('end', (collected) => {
        if (collected.size !== 0) return;
        checkUser(userId);
        if (!activeGames.has(userId)) return;
        game.currentStreak = 0;
        userData[userId].stats.soloWrong++;
        userData[userId].iq = Math.max(0, (userData[userId].iq || 0) - 1);
        saveData();
        const timeoutEmbed = EmbedBuilder.from(embed)
            .setFields({ name: 'Natiijo', value: '⏰ Wakhti dhammaaday — **−1 IQ** · Streak: 0' });
        activeMsg.delete().catch(() => {});
        channel.send({ embeds: [timeoutEmbed], ...replyOpt })
            .then(nm => setTimeout(() => sendQuestion(messageOrInteraction, qNumber + 1, nm), 2000))
            .catch(() => setTimeout(() => sendQuestion(messageOrInteraction, qNumber + 1, null), 2000));
    });
}

// ── Jawaabta handle ─────────────────────────────────────────────────
async function handleSoloAnswer(interaction) {
    const parts   = interaction.customId.split('_');
    const qNum    = parseInt(parts[1]);
    const ownerId = parts[3];
    const result  = parts[4];

    if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: 'Ciyaartaada qoro!', flags: 64 });
    }

    await interaction.deferUpdate();

    checkUser(ownerId);
    const game     = activeGames.get(ownerId);
    const timeTaken = Date.now() - (interaction.message.createdTimestamp || Date.now());
    let   msg       = '';

    if (result === 'true') {
        // ── Sax ──
        const pts      = calcTimedScore(Math.min(timeTaken, GLOBAL_WAIT_MS));
        const streak   = (game ? (game.currentStreak || 0) : 0) + 1;
        const bonus    = getStreakBonus(streak);
        const totalPts = pts + bonus;

        if (game) {
            game.currentStreak = streak;
            game.bestStreak    = Math.max(game.bestStreak || 0, streak);
            game.totalPoints   = (game.totalPoints || 0) + totalPts;
            game.correctCount  = (game.correctCount || 0) + 1;
        }

        userData[ownerId].stats.soloCorrect++;
        msg = `✅ **SAX!** ${pointsDisplay(pts, bonus, streak)}\n⏱️ ${(timeTaken/1000).toFixed(1)}s`;
    } else {
        // ── Qalad ──
        if (game) {
            game.currentStreak = 0;
        }
        userData[ownerId].stats.soloWrong++;
        userData[ownerId].iq = Math.max(0, (userData[ownerId].iq || 0) - 1);
        msg = '❌ **QALAD** — **−1 IQ** · Streak: 0🔥';
    }

    userData[ownerId].stats.soloPlayed++;
    saveData();

    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields({ name: 'Natiijo', value: msg });

    const channel   = interaction.channel;
    const originMsg = activeGames.get(ownerId)?.originMsg;
    const replyOpt  = originMsg ? { reply: { messageReference: originMsg.id, failIfNotExists: false } } : {};
    await interaction.message.delete().catch(() => {});
    const resultMsg = await channel.send({ embeds: [updatedEmbed], ...replyOpt }).catch(() => null);

    setTimeout(() => sendQuestion(interaction, qNum + 1, resultMsg), 1800);
}

// ── Leaderboard button handler ────────────────────────────────────────
async function handleSoloLeaderboard(interaction) {
    const ownerId = interaction.customId.replace('solo_leaderboard_', '');
    if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: '⚠️ Adiga kuma codsanin.', flags: 64 });
    }
    const lbEmbed = buildLeaderboardEmbed(ownerId, 0, 0);
    return interaction.reply({ embeds: [lbEmbed], flags: 64 });
}

module.exports = { sendQuestion, handleSoloAnswer, handleSoloLeaderboard };
