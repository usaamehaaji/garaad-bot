// =====================================================================
// GARAAD BOT - Bank Scheduler (loan auto-deduction + interest)
// =====================================================================

const { EmbedBuilder }        = require('discord.js');
const { econData, saveEcon }  = require('../economy/econStore');
const { applyInterest }       = require('../commands/economy/ebank');
const { applyLoanDeduction }  = require('../commands/economy/deen');

const FIRST_TICK_MS     = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function sendLoanDM(client, userId, owed) {
    try {
        const user = await client.users.fetch(userId);
        await user.send({ embeds: [
            new EmbedBuilder()
                .setTitle('💳 Garaad Economy — Deen La Jaray')
                .setColor('#e74c3c')
                .setDescription(
                    `⚠️ **3 malin ayaa dhaaftay** — deentaadii bangiyada laga jaray.\n\n` +
                    `💸 **Wadarta la jaray: $${owed.toLocaleString()}**\n\n` +
                    `_?ebank si aad dib u bilaabasho._`
                )
                .setFooter({ text: 'Garaad Economy • Garaad Bank' }),
        ]});
    } catch {
        // DM disabled or user not found — silent
    }
}

module.exports = function setupBankChargeScheduler(client) {
    async function tick() {
        try {
            const users = Object.keys(econData).filter(k => !k.startsWith('__') && econData[k]?.banks);
            if (users.length === 0) return;

            let loansDeducted = 0;

            for (const userId of users) {
                const d = econData[userId];

                // Apply daily interest to Garaad Bank
                applyInterest(d);

                // Loan auto-deduction after 3 days
                if (d.loan && d.loan.owed > 0) {
                    const owedBefore = d.loan.owed;
                    if (applyLoanDeduction(d)) {
                        loansDeducted++;
                        sendLoanDM(client, userId, owedBefore);
                    }
                }
            }

            saveEcon();
            if (loansDeducted > 0)
                console.log(`[BankCharge] 💳 ${loansDeducted} qof oo deentooda la jaray`);
        } catch (err) {
            console.error('[BankCharge] Khalad:', err.message);
        }
    }

    setTimeout(() => {
        tick();
        setInterval(tick, CHECK_INTERVAL_MS);
    }, FIRST_TICK_MS);

    console.log('[BankCharge] ✅ Scheduler bilaabay (10 daqiiqo → 24 saacadood kasta)');
};
