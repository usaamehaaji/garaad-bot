// =====================================================================
// GARAAD BOT - Shaqooyinka Gargaarka (Helper Functions)
// =====================================================================

const { userData, saveData } = require('../store');
const { LEVEL_STEP, TITLES }         = require('../config');

// ───── Taariikhda maalinta ─────
function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ───── U diyaari isticmaale cusub haddii aanu jirin ─────
function checkUser(userId) {
    if (!userData[userId]) {
        userData[userId] = {
            // QUIZ SYSTEM (IQ) — kaliya quiz rewards
            iq: 0,

            // ECONOMY SYSTEM — XP + cash + portfolio
            xp: 0,
            cash: 500, // lacagta la isticmaalo trade + give
            portfolio: { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 },
            basis: { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 }, // avg purchase price per unit
            realizedPnl: 0,
            tradeHistory: [],
            shieldActiveUntil: 0, // haddii active: khasaaraha sell-ka waa la yareeyaa

            lastDaily: 0,
            shields: 0, // legacy field (ha jabin users hore)
            doubleXpUntil: 0, title: null, stars: 0,
            seenQuestions: {},                     // (legacy)
            seenByGame: { solo: {}, duel: {}, rush: {}, quiz: {}, bet: {}, tournament: {} },
            lastPlayed:    0,                      // ⭐ Reminder: waqtigii ugu dambeeyay ee uu ciyaaray
            lastReminderSent: 0,                   // ⭐ Reminder: waqtigii DM ugu dambeeyay
            hostQuota: { date: todayKey(), count: 0 },
            ownedTitles: ['beginner'],             // Titles owned by user
            activeTitle: 'beginner',               // Currently active title key
            customTitle: null,                     // Custom title if bought
            inventory: { shield: 0, double: 0, hint: 0, retry: 0 },
            pendingQuizPoints: 0,
            seenSoloIntro: false,
            // Legacy trade fields (old system): ha tirtirin si aan users hore u lumin
            usdBalance: 500,
            sosBalance: 100000,
            tradePortfolio: { BTC: 0, EUR: 0 },
            tradeBasis: { BTC: 0, EUR: 0 },
            tradeRealized: 0,
            password: null,
            hiddenUntil: 0,
            stats: {
                soloPlayed: 0, soloCorrect: 0, soloWrong: 0,
                duelWins: 0, duelLosses: 0, duelDraws: 0,
                betsWon: 0, betsLost: 0,
                rushBest: 0,
                quizWins: 0, quizPlayed: 0,
                blitzPlayed: 0, blitzWins: 0, blitzTopScore: 0,
                bugsReported: 0,
            },
        };
    } else {
        // Buuxi meelaha maqan (isticmaalayaasha hore)
        const d = userData[userId];
        d.iq               ??= 0;
        d.xp               ??= 0;
        // Economy fields (new)
        // Migrate: haddii cash maqan → ka soo qaado usdBalance (legacy) ama default 500
        if (d.cash === undefined || d.cash === null) {
            d.cash = Number.isFinite(d.usdBalance) ? d.usdBalance : 500;
        }
        d.portfolio        ??= { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 };
        d.basis            ??= { BTC: 0, EUR: 0, GOLD: 0, MAT: 0 };
        d.realizedPnl      ??= 0;
        d.tradeHistory     ??= d.tradeHistory ?? [];
        d.shieldActiveUntil ??= 0;

        // Backfill portfolio from legacy tradePortfolio haddii cusub uu eber yahay
        d.tradePortfolio   ??= { BTC: 0, EUR: 0 };
        if ((d.portfolio.BTC || 0) === 0 && (d.tradePortfolio.BTC || 0) > 0) d.portfolio.BTC = d.tradePortfolio.BTC;
        if ((d.portfolio.EUR || 0) === 0 && (d.tradePortfolio.EUR || 0) > 0) d.portfolio.EUR = d.tradePortfolio.EUR;
        // Backfill basis from legacy tradeBasis
        d.tradeBasis       ??= { BTC: 0, EUR: 0 };
        if ((d.basis.BTC || 0) === 0 && (d.tradeBasis.BTC || 0) > 0) d.basis.BTC = d.tradeBasis.BTC;
        if ((d.basis.EUR || 0) === 0 && (d.tradeBasis.EUR || 0) > 0) d.basis.EUR = d.tradeBasis.EUR;
        // Backfill realized PnL from legacy tradeRealized
        d.tradeRealized    ??= 0;
        if ((d.realizedPnl || 0) === 0 && (d.tradeRealized || 0) !== 0) d.realizedPnl = d.tradeRealized;

        d.lastDaily        ??= 0;
        d.shields          ??= 0;
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
        // Legacy fields
        d.usdBalance       ??= d.cash ?? 500;
        d.sosBalance       ??= 100000;
        d.password         ??= null;
        d.hiddenUntil      ??= 0;
        d.stats            ??= {};
        const s = d.stats;
        s.soloPlayed    ??= 0;
        s.soloCorrect   ??= 0;
        s.soloWrong     ??= 0;
        s.duelWins      ??= 0;
        s.duelLosses    ??= 0;
        s.duelDraws     ??= 0;
        s.betsWon       ??= 0;
        s.betsLost      ??= 0;
        s.rushBest      ??= 0;
        s.quizWins      ??= 0;
        s.quizPlayed    ??= 0;
        s.blitzPlayed   ??= 0;
        s.blitzWins     ??= 0;
        s.blitzTopScore ??= 0;
        s.bugsReported  ??= 0;
    }
}

// ───── Heer (Level) ─────
function getLevel(iq) {
    return Math.floor((iq || 0) / LEVEL_STEP);
}

// ───── XP ku dar (Double XP la xisaabiyaa) ─────
function addXp(userId, amount) {
    checkUser(userId);
    const mult = userData[userId].doubleXpUntil > Date.now() ? 2 : 1;
    userData[userId].xp += amount * mult;
}

// ───── Kala dardar array ─────
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ───── Hel title-ka la muujinayo ─────
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

module.exports = { todayKey, checkUser, getLevel, addXp, shuffleArray, getDisplayTitle, saveData };
