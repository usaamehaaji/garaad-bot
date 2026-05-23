const { econData, saveEcon }  = require('../economy/econStore');
const { applyInterest }       = require('../../data/commands/economy/ebank');
const { applyLoanDeduction }  = require('../../data/commands/economy/deen');

const FIRST_TICK_MS     = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

module.exports = function setupBankChargeScheduler(client) {
    async function tick() {
        try {
            const users = Object.keys(econData).filter(k => !k.startsWith('__') && econData[k]?.banks);
            if (users.length === 0) return;

            let loansDeducted = 0;

            for (const userId of users) {
                const d = econData[userId];
                applyInterest(d);

                if (d.loan && d.loan.owed > 0) {
                    const owedBefore = d.loan.owed;
                    if (applyLoanDeduction(d)) {
                        loansDeducted++;
                        // Silent — no DMs sent to users for game results
                    }
                }
            }

            saveEcon();
            if (loansDeducted > 0)
                console.log(`[BankCharge] 💳 ${loansDeducted} overdue loans deducted`);
        } catch (err) {
            console.error('[BankCharge] Error:', err.message);
        }
    }

    setTimeout(() => {
        tick();
        setInterval(tick, CHECK_INTERVAL_MS);
    }, FIRST_TICK_MS);

    console.log('[BankCharge] ✅ Scheduler started (10 min → every 24 hours)');
};
