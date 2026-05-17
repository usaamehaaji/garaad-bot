// =====================================================================
// GARAAD BOT — Weekly Leaderboard
// Axad 19:00 EAT: top earners + top IQ, winner prize, reset earnings
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, resetWeeklyEarnings } = require('../economy/econStore');
const { userData }     = require('../store');
const { getLevel, getDisplayTitle, checkUser } = require('../utils/helpers');

const CHANNEL_ID    = '1504517873673048185';
const WEEK_MS       = 7 * 24 * 60 * 60 * 1000;
const FIRST_TICK_MS = 30 * 1000;
const PRIZE_USD     = 2000; // winner prize (BTC)

const MEDALS = ['🥇', '🥈', '🥉'];

// ── Weekly earnings top 10 ────────────────────────────────────────

async function buildEcoLines(client) {
    const week = getCurrentWeekKey();
    const entries = Object.entries(econData)
        .filter(([k]) => !k.startsWith('__'))
        .map(([uid, d]) => ({
            uid,
            earned: (d.weeklyEarned?.week === week ? d.weeklyEarned.usd : 0),
        }))
        .filter(e => e.earned > 0)
        .sort((a, b) => b.earned - a.earned)
        .slice(0, 10);

    const lines = await Promise.all(entries.map(async ({ uid, earned }, i) => {
        let name = `<@${uid}>`;
        try { const u = await client.users.fetch(uid); name = u.username; } catch {}
        const medal = MEDALS[i] || `**${i + 1}.**`;
        return `${medal} **${name}** — $${earned.toLocaleString()} shaqaystay`;
    }));

    return { lines, winner: entries[0] || null };
}

// ── IQ top 10 ─────────────────────────────────────────────────────

async function buildIqLines(client) {
    const sorted = Object.entries(userData)
        .filter(([, d]) => (d.iq || 0) > 0)
        .sort(([, a], [, b]) => (b.iq || 0) - (a.iq || 0))
        .slice(0, 10);

    const lines = await Promise.all(sorted.map(async ([uid, d], i) => {
        let name = `<@${uid}>`;
        try { const u = await client.users.fetch(uid); name = u.username; } catch {}
        checkUser(uid);
        const title = getDisplayTitle(uid);
        const titlePart = (title && title !== 'Bilow') ? ` [${title}]` : '';
        const lvl   = getLevel(d.iq || 0);
        const medal = MEDALS[i] || `**${i + 1}.**`;
        return `${medal} **${name}**${titlePart} — 🧠 ${(d.iq || 0).toLocaleString()} IQ · Lvl ${lvl}`;
    }));

    return lines;
}

function getCurrentWeekKey() {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
}

// ── Send leaderboard + prize + reset ─────────────────────────────

async function sendLeaderboard(client) {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error('[WeeklyLB] Channel la heli waayo:', CHANNEL_ID);
            return;
        }

        const [{ lines: ecoLines, winner }, iqLines] = await Promise.all([
            buildEcoLines(client),
            buildIqLines(client),
        ]);

        const dateStr = new Date().toLocaleDateString('so-SO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Give prize to weekly earnings winner
        let prizeLine = '';
        if (winner) {
            checkEconUser(winner.uid);
            econData[winner.uid].btc = (econData[winner.uid].btc || 0) + PRIZE_USD;
            saveEcon();
            prizeLine = `\n\n🏆 **Winner-ka Isbuucaan:** <@${winner.uid}>\n₿ **+${PRIZE_USD.toLocaleString()} BTC** abaalmarintii`;
        }

        const ecoEmbed = new EmbedBuilder()
            .setTitle('💰 TOP 10 — Ugu Badan Shaqaystay Isbuucaan')
            .setColor('#f39c12')
            .setDescription(
                (ecoLines.join('\n') || '_Cidna weli ma shaqaynin._') +
                prizeLine
            )
            .setFooter({ text: `Garaad Economy • ${dateStr} • Dib ayaa la bilaabayaa` })
            .setTimestamp();

        const iqEmbed = new EmbedBuilder()
            .setTitle('🧠 TOP 10 — Ugu IQ Badan')
            .setColor('#3498db')
            .setDescription(iqLines.join('\n') || '_Wax xog ah ma jirto._')
            .setFooter({ text: `Garaad IQ System • ${dateStr}` })
            .setTimestamp();

        await channel.send({
            content: '@here\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **Garaad — Tirakoobka Isbuuceedka**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            embeds: [ecoEmbed, iqEmbed],
        });

        // Reset weekly earnings after announcing
        resetWeeklyEarnings();
        console.log('[WeeklyLB] ✅ Leaderboard la diray, earnings la reset gareeyay');

    } catch (err) {
        console.error('[WeeklyLB] Khalad:', err.message);
    }
}

// ── Setup ─────────────────────────────────────────────────────────

function getNextSundayEAT() {
    const now = Date.now();
    const eat = new Date(now + 3 * 60 * 60 * 1000);
    const day = eat.getUTCDay();
    let daysUntilSunday = day === 0 ? 0 : 7 - day;
    const next = new Date(eat);
    next.setUTCDate(eat.getUTCDate() + daysUntilSunday);
    next.setUTCHours(16, 0, 0, 0); // 19:00 EAT = 16:00 UTC
    if (next.getTime() <= now + 3 * 60 * 60 * 1000) {
        next.setUTCDate(next.getUTCDate() + 7);
    }
    return next.getTime();
}

module.exports = function setupWeeklyLeaderboard(client) {
    function scheduleNext() {
        const nextMs  = getNextSundayEAT();
        const delayMs = Math.max(0, nextMs - Date.now());
        const days    = Math.floor(delayMs / 86400000);
        const hours   = Math.floor((delayMs % 86400000) / 3600000);
        console.log(`[WeeklyLB] Xiga: Axad 19:00 EAT (~${days}d ${hours}h)`);

        setTimeout(async () => {
            await sendLeaderboard(client);
            setInterval(async () => {
                await sendLeaderboard(client);
            }, WEEK_MS);
        }, delayMs);
    }

    setTimeout(() => scheduleNext(), FIRST_TICK_MS);
    console.log('[WeeklyLB] ✅ Weekly leaderboard scheduler bilaabay');
};
