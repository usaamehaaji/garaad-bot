// =====================================================================
// GARAAD BOT - Bank Service Charge Scheduler
// =====================================================================

const { EmbedBuilder }        = require('discord.js');
const { econData, saveEcon }  = require('../economy/econStore');
const { applyServiceCharge }  = require('../commands/economy/ebank');
const { applyLoanDeduction }  = require('../commands/economy/deen');

const FIRST_TICK_MS     = 10 * 60 * 1000;        // 10 daqiiqo (bilow)
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;   // 24 saacadood

async function sendChargeDM(client, userId, mandeeqCharged, garaadCharged) {
    if (mandeeqCharged <= 0 && garaadCharged <= 0) return;
    try {
        const user = await client.users.fetch(userId);
        const lines = [];
        if (mandeeqCharged > 0) lines.push(`🏦 **Mandeeq Bank** — $${mandeeqCharged.toLocaleString()} oo laga jaray`);
        if (garaadCharged  > 0) lines.push(`🏦 **Garaad Bank**  — $${garaadCharged.toLocaleString()}  oo laga jaray`);
        const total = mandeeqCharged + garaadCharged;
        await user.send({ embeds: [
            new EmbedBuilder()
                .setTitle('🏦 Garaad Economy — Service Charge')
                .setColor('#e74c3c')
                .setDescription(
                    `📢 Maanta bangiyada lacagta laga jaray:\n\n` +
                    lines.join('\n') +
                    `\n\n💸 **Wadarta la qaatay: $${total.toLocaleString()}**\n\n` +
                    `_10% Service Charge — maalintii ayaa laga jartaa_`
                )
                .setFooter({ text: 'Garaad Economy • Keedsane Bank' }),
        ]});
    } catch {
        // DM disabled or user not found — silent
    }
}

module.exports = function setupBankChargeScheduler(client) {
    async function tick() {
        try {
            const users = Object.keys(econData).filter(k => econData[k]?.banks);
            if (users.length === 0) return;

            let charged       = 0;
            let totalDeducted = 0;
            let loansDeducted = 0;

            for (const userId of users) {
                const d = econData[userId];

                // ── Service charge ──
                const beforeM = d.banks?.mandeeq || 0;
                const beforeG = d.banks?.garaad  || 0;
                applyServiceCharge(d);
                const chargedM = beforeM - (d.banks?.mandeeq || 0);
                const chargedG = beforeG - (d.banks?.garaad  || 0);
                const diff     = chargedM + chargedG;

                if (diff > 0) {
                    charged++;
                    totalDeducted += diff;
                    sendChargeDM(client, userId, chargedM, chargedG);
                }

                // ── Loan auto-deduction ──
                if (applyLoanDeduction(d)) loansDeducted++;
            }

            if (charged > 0 || loansDeducted > 0) {
                saveEcon();
                if (charged > 0)       console.log(`[BankCharge] ✅ ${charged} qof oo laga jaray — Wadarta: $${totalDeducted.toLocaleString()}`);
                if (loansDeducted > 0) console.log(`[BankCharge] 💳 ${loansDeducted} qof oo deentooda bangiyada laga jartay`);
            }
        } catch (err) {
            console.error('[BankCharge] Khalad:', err.message);
        }
    }

    // First tick after 10 minutes, then every 24 hours
    setTimeout(() => {
        tick();
        setInterval(tick, CHECK_INTERVAL_MS);
    }, FIRST_TICK_MS);

    console.log('[BankCharge] ✅ Service charge scheduler waa la bilaabay (10 daqiiqo → 24 saacadood kasta)');
};
