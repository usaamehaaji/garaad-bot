const { econData, saveEcon, addToTreasury } = require('../economy/econStore');
const { applyInterest }                     = require('../../data/commands/economy/ebank');
const { applyLoanDeduction }               = require('../../data/commands/economy/deen');

const FIRST_TICK_MS     = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

const WEALTH_TAX_THRESHOLD = 1_000_000;
const WEALTH_TAX_RATE      = 0.10; // 10% on the excess above threshold

module.exports = function setupBankChargeScheduler(client) {
    async function tick() {
        try {
            const users = Object.keys(econData).filter(k => /^\d{17,19}$/.test(k) && econData[k]?.banks);
            if (users.length === 0) return;

            let loansDeducted = 0;
            let taxedPlayers  = 0;
            let totalTaxed    = 0;

            for (const userId of users) {
                const d = econData[userId];
                applyInterest(d);

                if (d.loan && d.loan.owed > 0) {
                    if (applyLoanDeduction(d)) loansDeducted++;
                }

                // Wealth tax: 10% on wallet above ₿1M
                const wallet = d.btc || 0;
                if (wallet > WEALTH_TAX_THRESHOLD) {
                    const excess = wallet - WEALTH_TAX_THRESHOLD;
                    const tax    = Math.floor(excess * WEALTH_TAX_RATE);
                    if (tax > 0) {
                        d.btc -= tax;
                        addToTreasury(tax);
                        taxedPlayers++;
                        totalTaxed += tax;
                    }
                }
            }

            saveEcon();
            if (loansDeducted > 0)
                console.log(`[BankCharge] 💳 ${loansDeducted} overdue loans deducted`);
            if (taxedPlayers > 0)
                console.log(`[BankCharge] 💸 Wealth tax: ${taxedPlayers} players, ₿${totalTaxed.toLocaleString()} treasury-ga`);
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
