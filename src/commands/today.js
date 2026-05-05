// =====================================================================
// AMARKA: ?today  (dhibco maalinlaha ah)
// =====================================================================

const { userData, saveData } = require('../store');
const { checkUser, addXp }   = require('../utils/helpers');
const { REWARDS }            = require('../config');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 saacadood

module.exports = async function todayCommand(message) {
    const userId    = message.author.id;
    checkUser(userId);

    const lastDaily     = userData[userId].lastDaily || 0;
    const timeRemaining = COOLDOWN_MS - (Date.now() - lastDaily);

    if (timeRemaining > 0) {
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const mins  = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`⏳ **Cooldown!** ${hours} saac iyo ${mins} daqiiqo kadib isku day.`);
    }

    // IQ is quiz-only. Daily rewards go to economy (XP + cash).
    userData[userId].cash = Number.isFinite(userData[userId].cash)
        ? userData[userId].cash
        : (Number.isFinite(userData[userId].usdBalance) ? userData[userId].usdBalance : 0);
    userData[userId].lastDaily   = Date.now();
    addXp(userId, REWARDS.daily.xp);
    // small cash bonus if configured, else derive from xp
    const cashBonus = Number.isFinite(REWARDS?.daily?.cash) ? REWARDS.daily.cash : Math.floor((REWARDS.daily.xp || 0) / 2);
    userData[userId].cash += cashBonus;
    saveData();

    return message.reply(`🎁 Waxaad heshay **+${REWARDS.daily.xp} XP** iyo **+$${cashBonus} cash**. Mahadsanid!`);
};
