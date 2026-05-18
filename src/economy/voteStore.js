const path = require('path');
const fs   = require('fs');

const VOTE_PATH = path.join(__dirname, '../../data/votes.json');
let voteData = {};

function loadVotes() {
    if (fs.existsSync(VOTE_PATH)) {
        try { voteData = JSON.parse(fs.readFileSync(VOTE_PATH, 'utf8')); }
        catch { voteData = {}; }
    }
}

function saveVotes() {
    const dir = path.dirname(VOTE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VOTE_PATH, JSON.stringify(voteData, null, 2));
}

loadVotes();

function hasPendingVote(userId) {
    return voteData[userId]?.pending === true;
}

function setPendingVote(userId) {
    voteData[userId] = { pending: true, votedAt: Date.now() };
    saveVotes();
}

function claimVote(userId) {
    if (!voteData[userId]?.pending) return false;
    voteData[userId].pending    = false;
    voteData[userId].lastClaimed = Date.now();
    saveVotes();
    return true;
}

function getLastVote(userId) {
    return voteData[userId]?.votedAt || 0;
}

module.exports = { hasPendingVote, setPendingVote, claimVote, getLastVote };
