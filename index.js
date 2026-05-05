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

const http = require('http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

/** Railway / hosting: TOKEN, DISCORD_TOKEN, ama DISCORD_BOT_TOKEN */
function getBotToken() {
    return process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
}

/** Railway Web service: waa in PORT la dhagaystaa si healthcheck u guuleysto */
function startPortHealthServerIfNeeded() {
    const raw = process.env.PORT;
    if (raw === undefined || raw === '') return;
    const port = Number(raw);
    if (!Number.isFinite(port)) return;
    const server = http.createServer((_, res) => {
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
const { initializeMarket }     = require('./src/games/marketManager');

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
client.once('ready', () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log(`║  ✅  Garaad Bot v2 — SHAQAYNAYA      ║`);
    console.log(`║  🤖  ${client.user.tag.padEnd(32)}║`);
    console.log(`║  📊  ${String(client.guilds.cache.size + ' server').padEnd(32)}║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');

    // Bilow scheduler-ka 24h DM xusuusinta
    setupReminderScheduler(client);

    // Bilow suuqa Forex & Crypto
    initializeMarket();
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
