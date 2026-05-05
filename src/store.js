// =====================================================================
// GARAAD BOT - Xogta Wadaagta (Shared State / Store)
// Halkan waxaa ku jira dhammaan xogta la wadaago modiyuulada dhexdooda
// =====================================================================

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'users.json');

// Xogta isticmaalayaasha
let userData = {};

// Ciyaaraha firfircoon
const activeGames = new Map(); // userId -> solo game state
const activeDuels = new Map(); // channelId -> duel state
const activeBets  = new Map(); // userId -> bet state
const activeRush   = new Map(); // userId -> rush state
const activeTrades = new Map(); // userId -> trade session
const activeQuiz   = new Map(); // channelId -> quiz state
const activeRows   = new Map(); // channelId -> row/Connect4 state
const activeTournament = new Map(); // channelId -> tartan state
/** @type {Map<string, { code: string, at: number }>} */
const tournamentRegistry = new Map(); // userId -> diiwaangeli

// Akhri xogta hore
try {
    if (fs.existsSync(DATA_PATH)) {
        userData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
} catch (e) {
    console.error('[Store] Khalad akhrinaynta users.json:', e.message);
    userData = {};
}

function saveData() {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(userData, null, 2));
    } catch (e) {
        console.error('[Store] Khalad keydintiinta users.json:', e.message);
    }
}

// ───── Hubi haddii user-ku ciyaar uu ku jiro ─────
// Wuxuu soo celiyaa magaca ciyaarta haddii uu mashquul yahay, ama null haddii kale
function isUserBusy(userId) {
    if (activeGames.has(userId)) return 'solo';
    if (activeBets.has(userId))  return 'bet';
    if (activeRush.has(userId))  return 'rush';

    for (const state of activeDuels.values()) {
        if (state.p1 === userId || state.p2 === userId) return 'duel';
    }
    for (const state of activeQuiz.values()) {
        if (state.players && state.players.has(userId)) return 'quiz';
    }
    for (const state of activeRows.values()) {
        if (state.players && state.players.includes(userId)) return 'row';
    }
    for (const state of activeTournament.values()) {
        if (state.stage === 'play' && state.survivors && state.survivors.has(userId)) return 'tournament';
    }
    return null;
}

module.exports = {
    userData,
    saveData,
    activeGames,
    activeDuels,
    activeBets,
    activeRush,
    activeTrades,
    activeQuiz,
    activeRows,
    activeTournament,
    tournamentRegistry,
    isUserBusy,
};
