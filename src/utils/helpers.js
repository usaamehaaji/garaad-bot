// =====================================================================
// GARAAD BOT - Shaqooyinka Gargaarka (Helper Functions)
// =====================================================================

const { userData, saveData } = require('../store');
const { LEVEL_STEP, TITLES } = require('../config');

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function checkUser(userId) {
    if (!userData[userId]) {
        userData[userId] = {
            iq: 0,
            xp: 0,
            lastDaily: 0,
            doubleXpUntil: 0,
            title: null,
            stars: 0,
            seenQuestions: {},
            seenByGame: { solo: {}, duel: {}, rush: {}, quiz: {}, bet: {}, tournament: {} },
            lastPlayed: 0,
            lastReminderSent: 0,
            hostQuota: { date: todayKey(), count: 0 },
            ownedTitles: ['beginner'],
            activeTitle: 'beginner',
            customTitle: null,
            inventory: { shield: 0, double: 0, hint: 0, retry: 0 },
            pendingQuizPoints: 0,
            seenSoloIntro: false,
            bank: { balance: 0, transactions: [] },
            stats: {
                soloPlayed: 0, soloCorrect: 0, soloWrong: 0,
                duelWins: 0, duelLosses: 0, duelDraws: 0,
                rushBest: 0,
                quizWins: 0, quizPlayed: 0,
                bugsReported: 0,
            },
        };
    } else {
        const d = userData[userId];
        d.iq               ??= 0;
        d.xp               ??= 0;
        d.lastDaily        ??= 0;
        d.doubleXpUntil    ??= 0;
        d.title            ??= null;
        d.stars            ??= 0;
        d.seenQuestions    ??= {};
        d.seenByGame       ??= { solo: {}, duel: {}, rush: {}, quiz: {}, bet: {}, tournament: {} };
        d.seenByGame.solo  ??= {};
        d.seenByGame.duel  ??= {};
        d.seenByGame.rush  ??= {};
        d.seenByGame.quiz  ??= {};
        d.seenByGame.bet   ??= {};
        d.seenByGame.tournament ??= {};
        d.lastPlayed       ??= 0;
        d.lastReminderSent ??= 0;
        d.hostQuota        ??= { date: todayKey(), count: 0 };
        d.ownedTitles      ??= ['beginner'];
        if (d.ownedTitles.length === 0) d.ownedTitles = ['beginner'];
        d.activeTitle      ??= 'beginner';
        if (!d.activeTitle) d.activeTitle = 'beginner';
        d.customTitle      ??= null;
        d.inventory        ??= { shield: 0, double: 0, hint: 0, retry: 0 };
        d.pendingQuizPoints ??= 0;
        d.seenSoloIntro    ??= false;
        d.bank             ??= { balance: 0, transactions: [] };
        d.bank.balance     ??= 0;
        d.bank.transactions ??= [];
        d.stats            ??= {};
        const s = d.stats;
        s.soloPlayed    ??= 0;
        s.soloCorrect   ??= 0;
        s.soloWrong     ??= 0;
        s.duelWins      ??= 0;
        s.duelLosses    ??= 0;
        s.duelDraws     ??= 0;
        s.rushBest      ??= 0;
        s.quizWins      ??= 0;
        s.quizPlayed    ??= 0;
        s.bugsReported  ??= 0;
    }
}

function getLevel(iq) {
    return Math.floor((iq || 0) / LEVEL_STEP);
}

function addXp(userId, amount) {
    checkUser(userId);
    const mult = userData[userId].doubleXpUntil > Date.now() ? 2 : 1;
    userData[userId].xp += amount * mult;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getDisplayTitle(userId) {
    checkUser(userId);
    const data = userData[userId];
    if (data.customTitle) return data.customTitle;
    if (data.activeTitle) {
        for (const category in TITLES) {
            if (TITLES[category][data.activeTitle]) {
                return TITLES[category][data.activeTitle].name;
            }
        }
    }
    return null;
}

function fmt(n) {
    n = Math.round(n);
    if (n >= 1_000_000) {
        const s = (n / 1_000_000).toFixed(1);
        return (s.endsWith('.0') ? s.slice(0, -2) : s) + 'm';
    }
    if (n >= 1_000) {
        const s = (n / 1_000).toFixed(1);
        return (s.endsWith('.0') ? s.slice(0, -2) : s) + 'k';
    }
    return String(n);
}

// Lambarka horeba ka tir (tusaale: "85. Su'aal" → "Su'aal")
function stripQuestionNumber(text) {
    return String(text).replace(/^\d+\.\s*/, '');
}

module.exports = { todayKey, checkUser, getLevel, addXp, shuffleArray, getDisplayTitle, saveData, fmt, stripQuestionNumber };
