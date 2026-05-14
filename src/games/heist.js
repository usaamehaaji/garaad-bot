const { userData, saveData } = require('../store');

const activeHeists = new Map();

function getHiddenUntil(user) {
    return user.hiddenUntil && user.hiddenUntil > Date.now();
}

function createHeist(robberId, victimId) {
    const robber = userData[robberId];
    const victim = userData[victimId];
    if (!victim || !victim.password) {
        return { error: 'Ciyaartaan lama bilaabi karo. Ujeedada ma laha password.' };
    }
    if (victim.hiddenUntil && victim.hiddenUntil > Date.now()) {
        return { error: 'Calaamaddu waa qarsoon tahay. Ma xadin kartid qofkan hadda.' };
    }
    if (robberId === victimId) {
        return { error: 'Ma xadin kartid naftaada.' };
    }

    const password = victim.password.toString();
    if (!/^[0-9]{4}$/.test(password)) {
        return { error: 'Ujeedada ma laha password sax ah.' };
    }

    const victimCash = Number.isFinite(victim.cash)
        ? victim.cash
        : Number.isFinite(victim.usdBalance)
            ? victim.usdBalance
            : 0;
    if (victimCash <= 0) {
        return { error: 'Ujeedada ma hayso cash ama hanti. Waxba ma xadi kartid.' };
    }

    const revealIndex = Math.floor(Math.random() * 4);
    const revealedDigit = password[revealIndex];
    const pattern = ['?', '?', '?', '?'];
    pattern[revealIndex] = revealedDigit;
    const key = `${robberId}:${victimId}`;

    const state = {
        victimId,
        robberId,
        revealIndex,
        revealedDigit,
        attemptsLeft: 3,
        pattern: pattern.join(''),
        createdAt: Date.now(),
    };

    activeHeists.set(robberId, state);
    return state;
}

function guessHeist(robberId, guessCode) {
    const state = activeHeists.get(robberId);
    if (!state) {
        return { error: 'Ma jiro xatooyo socda. Bilow `?xatooyo @user` marka hore.' };
    }

    const victim = userData[state.victimId];
    const robber = userData[robberId];
    if (!victim) {
        activeHeists.delete(robberId);
        return { error: 'Ujeedada lama helin. Xatooyadu waa la joojiyay.' };
    }
    if (victim.hiddenUntil && victim.hiddenUntil > Date.now()) {
        activeHeists.delete(robberId);
        return { error: 'Ujeedada hadda waa qarsoon, xatooyo ma suuroobi karto.' };
    }

    if (!/^[0-9]{4}$/.test(guessCode)) {
        return { error: 'Fadlan geli 4-lambar oo sax ah si aad u qiyaasto.' };
    }

    if (guessCode[state.revealIndex] !== state.revealedDigit) {
        state.attemptsLeft -= 1;
        if (state.attemptsLeft <= 0) {
            robber.cash ??= Number.isFinite(robber.usdBalance) ? robber.usdBalance : 0;
            robber.cash = Math.max(0, (robber.cash || 0) - 100);
            saveData();
            activeHeists.delete(robberId);
            return { failure: true, attemptsLeft: 0, penalty: { cash: 100 }, message: 'Qiyaastaada waa khalad xad dhaaf ah. $100 cash ayaa lagaa jaray.' };
        }
        return { failure: true, attemptsLeft: state.attemptsLeft, message: `Lambarka la soo bandhigay waa khalad ama ma lahan meel sax ah. Waxaa kugu harsan ${state.attemptsLeft} isku day.` };
    }

    if (guessCode !== victim.password) {
        state.attemptsLeft -= 1;
        if (state.attemptsLeft <= 0) {
            robber.cash ??= Number.isFinite(robber.usdBalance) ? robber.usdBalance : 0;
            robber.cash = Math.max(0, (robber.cash || 0) - 100);
            saveData();
            activeHeists.delete(robberId);
            return { failure: true, attemptsLeft: 0, penalty: { cash: 100 }, message: 'Qiyaastaada waa khalad. Waxaa lagaa jaray $100 cash.' };
        }
        return { failure: true, attemptsLeft: state.attemptsLeft, message: `Qiyaasuhu ma aha mid sax ah. Waxaa kugu harsan ${state.attemptsLeft} isku day.` };
    }

    const stealPercent = 0.18 + Math.random() * 0.12;
    victim.cash ??= Number.isFinite(victim.usdBalance) ? victim.usdBalance : 0;
    robber.cash ??= Number.isFinite(robber.usdBalance) ? robber.usdBalance : 0;
    const stolenCash = Math.max(1, Math.floor((victim.cash || 0) * stealPercent));

    victim.cash = Math.max(0, (victim.cash || 0) - stolenCash);
    robber.cash += stolenCash;

    saveData();
    activeHeists.delete(robberId);

    return {
        success: true,
        stolenCash,
        message: `Xatooyadii waa guuleysatay! Waxaad ka xaday $${stolenCash} cash.`,
    };
}

function getHeistState(robberId) {
    return activeHeists.get(robberId);
}

module.exports = { createHeist, guessHeist, getHeistState, activeHeists };
