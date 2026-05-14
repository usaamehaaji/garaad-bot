const fs   = require('fs');
const path = require('path');

const ECON_PATH = path.join(__dirname, '../../data/economy.json');

let econData = {};

function defaultUser() {
    return {
        usd: 1000,
        btc: 0,
        gold: 0,
        diamond: 0,
        ring: 0,
        banks: { mandeeq: 0, garaad: 0 },
        lastDaily: 0,
        lastInterest: 0,
        robsToday:           { date: '', count: 0 },
        inventory:           { safety: 0, robticket: 0 },
        lastWork:            0,
        serviceChargesPaid:  { mandeeq: 0, garaad: 0 },
        interestEarned:      { mandeeq: 0, garaad: 0 },
        loan:                null,
        lastLoanTaken:       0,
        econTitles:          [],
        activeEconTitle:     null,
        customEconTitle:     null,
        todayEarned:         { date: '', usd: 0 },
        dailyGiven:          { date: '', usd: 0 },
    };
}

function checkEconUser(userId) {
    if (!econData[userId]) {
        econData[userId] = defaultUser();
    } else {
        const d = econData[userId];
        d.usd             ??= 1000;
        d.btc             ??= 0;
        d.gold            ??= 0;
        d.diamond         ??= 0;
        d.ring            ??= 0;
        d.banks           ??= { mandeeq: 0, garaad: 0 };
        d.banks.mandeeq   ??= 0;
        d.banks.garaad    ??= 0;
        d.lastDaily       ??= 0;
        d.lastInterest    ??= 0;
        d.robsToday       ??= { date: '', count: 0 };
        d.inventory       ??= { safety: 0, robticket: 0 };
        d.inventory.safety    ??= 0;
        d.inventory.robticket ??= 0;
        d.lastWork        ??= 0;
        d.serviceChargesPaid         ??= { mandeeq: 0, garaad: 0 };
        d.serviceChargesPaid.mandeeq ??= 0;
        d.serviceChargesPaid.garaad  ??= 0;
        d.interestEarned             ??= { mandeeq: 0, garaad: 0 };
        d.interestEarned.mandeeq     ??= 0;
        d.interestEarned.garaad      ??= 0;
        if (d.loan === undefined)             d.loan             = null;
        d.lastLoanTaken ??= 0;
        if (d.econTitles === undefined)       d.econTitles       = [];
        if (d.activeEconTitle === undefined)  d.activeEconTitle  = null;
        if (d.customEconTitle === undefined)  d.customEconTitle  = null;
        d.todayEarned ??= { date: '', usd: 0 };
        d.dailyGiven  ??= { date: '', usd: 0 };
    }
    return econData[userId];
}

try {
    if (fs.existsSync(ECON_PATH)) {
        econData = JSON.parse(fs.readFileSync(ECON_PATH, 'utf8'));
    }
} catch (e) {
    console.error('[EconStore] Khalad:', e.message);
    econData = {};
}

function saveEcon() {
    try {
        const dir = path.dirname(ECON_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ECON_PATH, JSON.stringify(econData, null, 2));
    } catch (e) {
        console.error('[EconStore] Khalad keydintiinta:', e.message);
    }
}

function getTreasury() {
    econData.__treasury__ ??= { balance: 0, totalIn: 0 };
    econData.__treasury__.balance ??= 0;
    econData.__treasury__.totalIn ??= 0;
    return econData.__treasury__;
}

function addToTreasury(amount) {
    if (!amount || amount <= 0) return;
    const t  = getTreasury();
    t.balance += amount;
    t.totalIn += amount;
}

function deductFromTreasury(amount) {
    const t = getTreasury();
    if (t.balance < amount) return false;
    t.balance -= amount;
    return true;
}

function trackEarning(userId, usdAmount) {
    if (!usdAmount || usdAmount <= 0) return;
    const d = econData[userId];
    if (!d) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!d.todayEarned || d.todayEarned.date !== today) {
        d.todayEarned = { date: today, usd: 0 };
    }
    d.todayEarned.usd += usdAmount;
}

module.exports = { econData, checkEconUser, saveEcon, getTreasury, addToTreasury, deductFromTreasury, trackEarning };
