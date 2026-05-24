// =====================================================================
//
//   ██████╗  █████╗ ██████╗  █████╗  █████╗ ██████╗     ██████╗  ██████╗ ████████╗
//  ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
//  ██║  ███╗███████║██████╔╝███████║███████║██║  ██║    ██████╔╝██║   ██║   ██║
//  ██║   ██║██╔══██║██╔══██╗██╔══██║██╔══██║██║  ██║    ██╔══██╗██║   ██║   ██║
//  ╚██████╔╝██║  ██║██║  ██║██║  ██║██║  ██║██████╔╝    ██████╔╝╚██████╔╝   ██║
//   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚═════╝  ╚═════╝    ╚═╝
//
//  Garaad Bot v2 — Discord Quiz Bot (Af-Soomaali)
//  =====================================================================

require('dotenv').config();

// Suppress known harmless deprecation warnings from discord.js internals on Node.js 25
process.on('warning', w => { if (w.code === 'DEP0180') return; console.warn(w); });

const http = require('http');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

function getBotToken() {
    return process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || process.env.TOKEN || '';
}

function startPortHealthServerIfNeeded() {
    const raw = process.env.PORT;
    if (raw === undefined || raw === '') return;
    const port = Number(raw);
    if (!Number.isFinite(port)) return;

    const server = http.createServer((req, res) => {
        // ── top.gg vote webhook ──
        if (req.method === 'POST' && req.url === '/topgg-vote') {
            const auth = req.headers.authorization || '';
            if (process.env.TOPGG_AUTH && auth !== process.env.TOPGG_AUTH) {
                res.writeHead(401);
                return res.end('Unauthorized');
            }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.user && data.type === 'upvote') {
                        const { setPendingVote } = require('./src/economy/voteStore');
                        setPendingVote(data.user);
                        console.log(`[Vote] ${data.user} wuu codeeyay top.gg`);
                    }
                } catch {}
                res.writeHead(200);
                res.end('ok');
            });
            return;
        }
        // ── Health check ──
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ok');
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`[Health] Dhagaysan ${port} (Railway / PaaS)`);
    });
}

const setupMessageHandler      = require('./src/handlers/messageHandler');
const setupInteractionHandler  = require('./src/handlers/interactionHandler');
const setupReminderScheduler   = require('./src/handlers/reminderScheduler');
const setupBankChargeScheduler  = require('./src/handlers/bankChargeScheduler');
const setupWeeklyLeaderboard    = require('./src/handlers/weeklyLeaderboard');
const { restorePredictions }    = require('./src/economy/prediction');
const { tickMarket }            = require('./src/economy/market');

// ───── Client ─────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
});

// ───── Handlers ─────
setupMessageHandler(client);
setupInteractionHandler(client);

// ───── Ready ─────
client.once('clientReady', () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log(`║  ✅  Garaad Bot v2 — SHAQAYNAYA      ║`);
    console.log(`║  🤖  ${client.user.tag.padEnd(32)}║`);
    console.log(`║  📊  ${String(client.guilds.cache.size + ' server').padEnd(32)}║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');

    setupReminderScheduler(client);
    setupBankChargeScheduler(client);
    setupWeeklyLeaderboard(client);
    restorePredictions(client);

    // Market auto-tick: update prices every 60s
    tickMarket();
    setInterval(tickMarket, 60 * 1000);

    // Activity status: ?caawin | X servers
    function updateStatus() {
        const count = client.guilds.cache.size;
        client.user.setActivity(`?caawin | ${count} servers`, { type: 3 }); // 3 = Watching
    }
    updateStatus();
    client.on('guildCreate', updateStatus);
    client.on('guildDelete', updateStatus);

    const announceId = process.env.ANNOUNCE_CHANNEL_ID;
    if (announceId) {
        const ch = client.channels.cache.get(announceId);
        if (ch) {
            const embed = new EmbedBuilder()
                .setTitle('🎮 Garaad Bot — Waa La Soo Celiyay!')
                .setDescription(
                    `Nabad! Bot-ku wuu soo noqday.\n\n` +
                    `Game dhaqaalaha waa bilaabmay — heshiis fiican!\n\n` +
                    `• \`?shaqo\` — shaqeyso lacag ku hel\n` +
                    `• \`?bank\` — lacagta bangiga ku dhig\n` +
                    `• \`?solo\` — su'aalo jawaab, IQ korso`
                )
                .setFooter({ text: 'Garaad Bot — Mahadsanid! • Garaad Economy + Quiz' })
                .setColor('#2ecc71');
            ch.send({ embeds: [embed] }).catch(() => {});
        }
    }
});

// ───── Khaladaad aan la filanayn ─────
client.on('error', err  => console.error('[Bot Error]', err));
process.on('unhandledRejection', err => console.error('[Unhandled Rejection]', err));

// ───── Login ─────
startPortHealthServerIfNeeded();

const token = getBotToken();
if (!token) {
    console.error('❌ KHALAD: TOKEN lama helin. Ku dar Railway → Variables: TOKEN=<bot token>');
    console.error('   (sidoo kale waxaa la aqbalaa: DISCORD_TOKEN ama DISCORD_BOT_TOKEN)');
    process.exit(1);
}

client.login(token).catch((err) => {
    console.error('❌ Login Discord ma guulaysan:', err.message);
    process.exit(1);
});
