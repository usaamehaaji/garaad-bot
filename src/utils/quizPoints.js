// =====================================================================
// Dhibcaha tartanka quiz → XP ama IQ (badal)
// =====================================================================

const { userData, saveData } = require('../store');
const { checkUser, addXp } = require('./helpers');
const { QUIZ_POINTS_TO_XP, QUIZ_POINTS_TO_IQ } = require('../config');

function exchangeQuizPoints(userId, mode) {
    checkUser(userId);
    const pts = userData[userId].pendingQuizPoints || 0;
    if (pts <= 0) {
        return { ok: false, text: 'Ma haysatid **dhibco tartan** oo la badali karo. Ka qayb gal `?quiz` marka hore.' };
    }

    userData[userId].pendingQuizPoints = 0;

    if (mode === 'xp') {
        const gain = pts * QUIZ_POINTS_TO_XP;
        addXp(userId, gain);
        saveData();
        return {
            ok: true,
            text: `✅ **${pts}** dhibcood → **+${gain} XP** (1 dhibic = ${QUIZ_POINTS_TO_XP} XP).`,
        };
    }

    const iqGain = pts * QUIZ_POINTS_TO_IQ;
    userData[userId].iq += iqGain;
    saveData();
    return {
        ok: true,
        text: `✅ **${pts}** dhibcood → **+${iqGain} IQ** (1 dhibic = ${QUIZ_POINTS_TO_IQ} IQ).`,
    };
}

module.exports = { exchangeQuizPoints };
