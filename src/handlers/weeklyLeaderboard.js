// =====================================================================
// GARAAD BOT — Weekly Leaderboard Scheduler
// Isbuuc walba: Top Economy + Top IQ channel-ka ku dir
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { econData }     = require('../economy/econStore');
const { getPrice }     = require('../economy/market');
const { userData }     = require('../store');
const { getLevel, getDisplayTitle, checkUser } = require('../utils/helpers');

const CHANNEL_ID     = '1504517873673048185';
const WEEK_MS        = 7 * 24 * 60 * 60 * 1000;
const FIRST_TICK_MS  = 30 * 1000; // 30 seconds after bot starts — first check

const MEDALS = ['🥇', '🥈', '🥉'];

// ── Somalia EAT UTC+3 Sunday midnight check ────────────────────────

function getNextSundayMidnightEAT() {
    const now = Date.now();
    const eat = new Date(now + 3 * 60 * 60 * 1000); // UTC+3
    // Find next Sunday 00:00 EAT
    const day  = eat.getUTCDay(); // 0=Sunday
    const daysUntilSunday = day === 0 ? 7 : 7 - day;
    const next = new Date(eat);
    next.setUTCDate(eat.getUTCDate() + daysUntilSunday);
    next.setUTCHours(0, 0, 0, 0);
    return next.getTime() - 3 * 60 * 60 * 1000; // back to UTC
}

// ── Economy top 10 ────────────────────────────────────────────────

async function buildEcoLines(client) {
    const prices = {
        btc:     getPrice('btc')     || 0,
        gold:    getPrice('gold')    || 0,
        diamond: getPrice('diamond') || 0,
        ring:    getPrice('ring')    || 0,
    };

    const entries = Object.entries(econData)
        .filter(([k]) => !k.startsWith('__'))
        .map(([uid, d]) => {
            const net = (d.usd || 0)
                + (d.btc     || 0) * prices.btc
                + (d.gold    || 0) * prices.gold
                + (d.diamond || 0) * prices.diamond
                + (d.ring    || 0) * prices.ring
                + (d.banks?.garaad || 0);
            return { uid, net: Math.round(net) };
        })
        .filter(e => e.net > 0)
        .sort((a, b) => b.net - a.net)
        .slice(0, 10);

    const lines = await Promise.all(entries.map(async ({ uid, net }, i) => {
        let name = `<@${uid}>`;
        try {
            const user = await client.users.fetch(uid);
            name = user.username;
        } catch {}
        const medal = MEDALS[i] || `**${i + 1}.**`;
        return `${medal} **${name}** — $${net.toLocaleString()}`;
    }));

    return lines;
}

// ── IQ top 10 ─────────────────────────────────────────────────────

async function buildIqLines(client) {
    const sorted = Object.entries(userData)
        .filter(([, d]) => (d.iq || 0) > 0)
        .sort(([, a], [, b]) => (b.iq || 0) - (a.iq || 0))
        .slice(0, 10);

    const lines = await Promise.all(sorted.map(async ([uid, d], i) => {
        let name = `<@${uid}>`;
        try {
            const user = await client.users.fetch(uid);
            name = user.username;
        } catch {}
        checkUser(uid);
        const title = getDisplayTitle(uid);
        const titlePart = (title && title !== 'Bilow') ? ` [${title}]` : '';
        const lvl   = getLevel(d.iq || 0);
        const medal = MEDALS[i] || `**${i + 1}.**`;
        return `${medal} **${name}**${titlePart} — 🧠 ${(d.iq || 0).toLocaleString()} IQ · Lvl ${lvl}`;
    }));

    return lines;
}

// ── Send leaderboard ──────────────────────────────────────────────

async function sendLeaderboard(client) {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error('[WeeklyLB] Channel la heli waayo:', CHANNEL_ID);
            return;
        }

        const [ecoLines, iqLines] = await Promise.all([
            buildEcoLines(client),
            buildIqLines(client),
        ]);

        const now = new Date(Date.now() + 3 * 60 * 60 * 1000); // EAT
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const ecoEmbed = new EmbedBuilder()
            .setTitle('💰 TOP 10 — Ugu Taajirta Isbuucaan')
            .setColor('#f39c12')
            .setDescription(ecoLines.join('\n') || '_Wax xog ah ma jirto._')
            .setFooter({ text: `Garaad Economy • ${dateStr}` })
            .setTimestamp();

        const iqEmbed = new EmbedBuilder()
            .setTitle('🧠 TOP 10 — Ugu IQ Badan Isbuucaan')
            .setColor('#3498db')
            .setDescription(iqLines.join('\n') || '_Wax xog ah ma jirto._')
            .setFooter({ text: `Garaad IQ System • ${dateStr}` })
            .setTimestamp();

        await channel.send({
            content: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **Garaad — Tirakoobka Isbuuceedka**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            embeds: [ecoEmbed, iqEmbed],
        });

        console.log('[WeeklyLB] ✅ Leaderboard la diray');
    } catch (err) {
        console.error('[WeeklyLB] Khalad:', err.message);
    }
}

// ── Setup ─────────────────────────────────────────────────────────

module.exports = function setupWeeklyLeaderboard(client) {
    async function scheduleNext() {
        const nextMs  = getNextSundayMidnightEAT();
        const delayMs = Math.max(0, nextMs - Date.now());
        const days    = Math.floor(delayMs / 86400000);
        const hours   = Math.floor((delayMs % 86400000) / 3600000);
        console.log(`[WeeklyLB] Xiga: Axad 00:00 EAT (~${days}d ${hours}h)`);

        setTimeout(async () => {
            await sendLeaderboard(client);
            // Schedule next week
            setInterval(async () => {
                await sendLeaderboard(client);
            }, WEEK_MS);
        }, delayMs);
    }

    // Wait 30s after boot then schedule
    setTimeout(() => scheduleNext(), FIRST_TICK_MS);
    console.log('[WeeklyLB] ✅ Weekly leaderboard scheduler bilaabay');
};
