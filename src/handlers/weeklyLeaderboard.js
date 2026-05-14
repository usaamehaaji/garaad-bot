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
const FIRST_TICK_MS  = 30 * 1000;

const MEDALS = ['🥇', '🥈', '🥉'];

const WEEKLY_MOTIVATION = `
Every single week, this leaderboard resets the stage — and every single week, you get another chance to prove what you are made of. Whether you are sitting at the top of the rankings right now or you are still grinding your way up from the bottom, understand this clearly: **the scoreboard does not define your potential. Your consistency does.**

Look at the names at the top of this list. They did not get there by accident. They showed up. They played the games. They made the smart trades. They invested in their knowledge. They did not wait for the perfect moment — they built momentum through action, one quiz question at a time, one smart economy decision at a time. That is the Garaad way.

**To the leaders at the top:** Do not get comfortable. The fire behind you is real. There are players in this community who are studying, strategizing, and preparing to take your position. The gap between first and second place has been closed overnight before, and it will happen again. Stay sharp. Stay hungry. The crown is heavy — carry it with purpose.

**To everyone in the middle of the pack:** This is the most dangerous position in any competition — dangerous not because you are failing, but because it is easy to tell yourself that you are "doing okay" and stop pushing. Do not settle. The difference between the middle and the top is rarely talent. It is the decision to take one more step when your body says stop. Make that decision this week. Grind harder on the quizzes. Be smarter with your economy. The top ten is closer than you think.

**To everyone starting from zero:** You have something the leaders do not have — nothing to lose and everything to gain. Every IQ point you earn this week, you are building something from nothing. Every dollar you make through work, trade, or smart investments is proof that you belong in this game. The players who started with zero and clawed their way into the top ten are the most respected in any community — because they proved that the system rewards effort, not luck.

The **Garaad Economy** is not just a game inside a Discord server. It is a simulation of real-world principles. The market moves. Prices rise and fall. Loans come with responsibility. Hard work pays off over time. The players who understand these principles — who buy assets when prices are low, who save before they spend, who take calculated risks instead of blind gambles — these are the players who build lasting wealth on this leaderboard. Learn the patterns. Respect the system. And it will reward you.

The **IQ system** is built on the same foundation. Knowledge compounds. Every quiz you play, every correct answer you give, every wrong answer you learn from — it all adds up. The top IQ players in this community did not memorize everything in one night. They built a habit. A habit of curiosity. A habit of showing up. A habit of turning every question into an opportunity to grow stronger. You can build that same habit starting right now.

Here is the truth about competition that most people forget: **you are not actually competing against the other players on this leaderboard.** You are competing against the version of yourself from last week. Did you earn more IQ this week than last week? Did you make smarter trades? Did you play more games? Did you take the deen loan responsibly and pay it back on time? Those are the real metrics of progress. The leaderboard is just a mirror — it shows you where you stand against others so that you know how far you have come and how far you can go.

This community was built on the idea that Somali youth deserve a space where intelligence is celebrated, where economic thinking is encouraged, where competition sharpens the mind. Every time you play a quiz, you are part of something bigger than a game. You are proving that curiosity is a strength. Every time you make a trade or manage your economy wisely, you are practicing skills that matter in the real world — discipline, patience, calculated risk.

So look at this leaderboard one more time. Respect the grind of every player on it. And then close this message, open the bot, and **go earn your place.**

Seven days. New week. Same opportunity. Different results.

**The top ten is waiting. Will your name be on it next Sunday?** 🔥
`.trim();

// ── Somalia EAT UTC+3 Sunday midnight check ────────────────────────

function getNextSundayEAT() {
    const now = Date.now();
    const eat = new Date(now + 3 * 60 * 60 * 1000); // UTC+3
    // Find next Sunday 19:00 EAT
    const day = eat.getUTCDay(); // 0=Sunday
    let daysUntilSunday = day === 0 ? 0 : 7 - day;
    const next = new Date(eat);
    next.setUTCDate(eat.getUTCDate() + daysUntilSunday);
    next.setUTCHours(19, 0, 0, 0); // 19:00 EAT = 16:00 UTC
    // If today is Sunday but 19:00 already passed, schedule next Sunday
    if (next.getTime() - 3 * 60 * 60 * 1000 <= now) {
        next.setUTCDate(next.getUTCDate() + 7);
    }
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

        const motivationEmbed = new EmbedBuilder()
            .setTitle('🌟 Weekly Message — From Garaad')
            .setColor('#9b59b6')
            .setDescription(WEEKLY_MOTIVATION)
            .setFooter({ text: `Garaad Community • ${dateStr}` });

        await channel.send({
            content: '@here\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **Garaad — Tirakoobka Isbuuceedka**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            embeds: [motivationEmbed, ecoEmbed, iqEmbed],
        });

        console.log('[WeeklyLB] ✅ Leaderboard la diray');
    } catch (err) {
        console.error('[WeeklyLB] Khalad:', err.message);
    }
}

// ── Setup ─────────────────────────────────────────────────────────

module.exports = function setupWeeklyLeaderboard(client) {
    async function scheduleNext() {
        const nextMs  = getNextSundayEAT();
        const delayMs = Math.max(0, nextMs - Date.now());
        const days    = Math.floor(delayMs / 86400000);
        const hours   = Math.floor((delayMs % 86400000) / 3600000);
        console.log(`[WeeklyLB] Xiga: Axad 19:00 EAT (~${days}d ${hours}h)`);

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
