// =====================================================================
// GARAAD BOT - Reminder Scheduler (24h DM)
// =====================================================================
//
// Saac kasta wuxuu hubiyaa user-yada loo dirayo DM xusuusin in ay
// soo qaataan ?today.
//
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { getUsersDueForReminder, markReminderSent } = require('../utils/reminders');
const { PREFIX } = require('../config');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 saac

module.exports = function setupReminderScheduler(client) {
    async function tick() {
        try {
            const due = getUsersDueForReminder();
            if (due.length === 0) return;

            console.log(`[Reminder] ${due.length} user oo loo dirayo DM xusuusin...`);

            let success = 0, failed = 0;

            for (const userId of due) {
                try {
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (!user) { failed++; continue; }

                    const embed = new EmbedBuilder()
                        .setTitle('🔔 Garaad — Xusuusin')
                        .setDescription(
                            `Ku soo dhawoow! Wakhti badan ayaad ka maqnayd.\n\n` +
                            `🎁 **\`${PREFIX}today\`** ku qor server-kii Garaad si aad u qaadato dhibcahaaga maalinlaha ah!\n\n` +
                            `🧠 Sidoo kale, su'aalo cusub ayaa ku sugaya \`${PREFIX}solo\``
                        )
                        .setColor('#3498db')
                        .setFooter({ text: 'Garaad Bot — Mahadsanid' });

                    await user.send({ embeds: [embed] });
                    markReminderSent(userId);
                    success++;
                } catch (err) {
                    failed++;
                    // User wuxuu xidhay DM-yada — calaamadee si aanan dib u ku celcelin
                    markReminderSent(userId);
                }
                // Yar dib u dhig si aanan rate-limit ku dhicin
                await new Promise(r => setTimeout(r, 250));
            }

            console.log(`[Reminder] ✅ ${success} la diray | ❌ ${failed} guuldaray`);
        } catch (err) {
            console.error('[Reminder] Khalad scheduler-ka:', err);
        }
    }

    // Bilow 5 daqiiqo kadib (sii waqti loadiga)
    setTimeout(() => {
        tick();
        setInterval(tick, CHECK_INTERVAL_MS);
    }, 5 * 60 * 1000);

    console.log('[Reminder] ✅ Scheduler-ka 24h waa la bilaabay');
};
