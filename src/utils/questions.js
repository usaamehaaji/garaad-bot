// =====================================================================
// GARAAD BOT - Maareynta Su'aalaha
// • Per-game pools (solo.json, duel.json, rush.json, quiz.json, bet.json)
// • Global text-based dedup per user (su'aal mar la arkay marna laguma soo celin)
// =====================================================================

const fs   = require('fs');
const path = require('path');
const { EmbedBuilder }            = require('discord.js');
const { userData }                = require('../store');
const { checkUser, shuffleArray } = require('./helpers');
const { TWO_WEEKS_MS }            = require('../config');

// ───── Soo akhri su'aalaha game kasta ─────
const GAMES = ['solo', 'duel', 'rush', 'quiz', 'bet', 'tournament'];
const questionsByGame = {};
const fallback        = require('../../data/questions.json');

for (const game of GAMES) {
    try {
        const file = path.join(__dirname, '..', '..', 'data', 'questions', `${game}.json`);
        questionsByGame[game] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.warn(`[Questions] Faylka ${game}.json lama helin — fallback la isticmaalay`);
        questionsByGame[game] = fallback;
    }
}

// ─────────────────────────────────────────────────────────────────────
// PER-GAME SEEN INDEX (la haystaa kuwii hore)
// ─────────────────────────────────────────────────────────────────────
function getSeenForGame(userId, game) {
    checkUser(userId);
    if (!userData[userId].seenByGame[game]) userData[userId].seenByGame[game] = {};
    return userData[userId].seenByGame[game];
}

function cleanExpiredSeenForGame(userId, game) {
    const seen = getSeenForGame(userId, game);
    const now  = Date.now();
    for (const idx of Object.keys(seen)) {
        if (now - seen[idx] >= TWO_WEEKS_MS) delete seen[idx];
    }
}

// ─────────────────────────────────────────────────────────────────────
// ⭐ GLOBAL SEEN BY TEXT (cusub — ka hortaga in su'aal isku mid ah ay
//    kasoo baxdo ciyaar walba)
// ─────────────────────────────────────────────────────────────────────
function getSeenTexts(userId) {
    checkUser(userId);
    if (!userData[userId].seenTexts) userData[userId].seenTexts = {};
    return userData[userId].seenTexts;
}

function cleanExpiredSeenTexts(userId) {
    const seen = getSeenTexts(userId);
    const now  = Date.now();
    for (const txt of Object.keys(seen)) {
        if (now - seen[txt] >= TWO_WEEKS_MS) delete seen[txt];
    }
}

// ─────────────────────────────────────────────────────────────────────
// Dooro su'aalo aan WELIGOOD la arkin (per-game + global text)
// ─────────────────────────────────────────────────────────────────────
function pickQuestionsForGame(userId, game, count) {
    cleanExpiredSeenForGame(userId, game);
    cleanExpiredSeenTexts(userId);

    const pool      = questionsByGame[game] || [];
    const seenIdx   = getSeenForGame(userId, game);
    const seenTxt   = getSeenTexts(userId);
    const unseenIdx = [];

    for (let i = 0; i < pool.length; i++) {
        const q = pool[i];
        if (i in seenIdx)             continue;     // index horay loo arkay (game-kan)
        if (q.question in seenTxt)    continue;     // text horay loo arkay (game KASTA)
        unseenIdx.push(i);
    }

    if (unseenIdx.length === 0) return null;

    return shuffleArray(unseenIdx)
        .slice(0, count)
        .map(i => ({ ...pool[i], _idx: i, _game: game }));
}

// ─────────────────────────────────────────────────────────────────────
// Calaamadee su'aal la arkay (per-game index + global text)
// ─────────────────────────────────────────────────────────────────────
function markSeenForGame(userId, game, idx) {
    if (idx === undefined || idx === null) return;
    const seen = getSeenForGame(userId, game);
    seen[idx]  = Date.now();

    // ⭐ Calaamadee text-ka si ay ciyaarta kale ugu kala mid ahaano
    const pool = questionsByGame[game] || [];
    const q    = pool[idx];
    if (q && q.question) {
        const seenTxt = getSeenTexts(userId);
        seenTxt[q.question] = Date.now();
    }
}

function markSeenForUsersInGame(userIds, game, idx) {
    for (const uid of userIds) markSeenForGame(uid, game, idx);
}

// ───── Embed: su'aalo ma haray ─────
function noQuestionsLeftEmbed(username) {
    return new EmbedBuilder()
        .setTitle("📚 Su'aalihii waa dhammaadeen")
        .setDescription(
            `**${username}**, sualaha aad u baahnayd waad dhameystay.\n\n` +
            `⏳ Sug ilaa la cusboonaysiiyo — su'aalo cusub ayaa kuu furmaya kadib marka muddada laba toddobaad ee hore ka dhammaato.\n\n` +
            `Mahadsanid xamaasada aad muujisay! 👑`
        )
        .setColor('#95a5a6');
}

// ───── BACKWARD COMPAT (legacy API) ─────
const pickUnseenQuestions = (userId, count) => pickQuestionsForGame(userId, 'solo', count);
const pickUnseenForGroup  = (hostId, count) => pickQuestionsForGame(hostId, 'quiz', count);
const markSeen            = (userId, idx)   => markSeenForGame(userId, 'solo', idx);
const markSeenForUsers    = (userIds, idx)  => markSeenForUsersInGame(userIds, 'quiz', idx);

module.exports = {
    pickQuestionsForGame,
    markSeenForGame,
    markSeenForUsersInGame,
    pickUnseenQuestions,
    pickUnseenForGroup,
    markSeen,
    markSeenForUsers,
    noQuestionsLeftEmbed,
};
