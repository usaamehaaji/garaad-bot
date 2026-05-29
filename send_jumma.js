require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const CHANNEL_ID = '1507460521098612817';
const IMAGE_PATH = path.join(__dirname, 'jumma.png'); // sawirka bot-ka root-ka ku dhig

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`[Jumma] Bot online: ${client.user.tag}`);
    try {
        const ch = await client.channels.fetch(CHANNEL_ID);
        if (!ch) { console.error('[Jumma] Channel lama helin'); process.exit(1); }

        const payload = { content: '@everyone 🕌 **جمعة مبارکة — Jumma Mubarak!**\n\n> 🤲 Jimcaha waa barakaysan yahay — Alle ha noo gaargaaro dhammaanteen!\n> ✨ Ducadaada maanta aqbaal ha ka dhigo\n\n**/All Stars • Garaad Bot App**' };

        if (fs.existsSync(IMAGE_PATH)) {
            payload.files = [new AttachmentBuilder(IMAGE_PATH, { name: 'jumma.png' })];
        }

        await ch.send(payload);
        console.log('[Jumma] ✅ La diray!');
    } catch (e) {
        console.error('[Jumma] Khalad:', e.message);
    }
    client.destroy();
    process.exit(0);
});

const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || process.env.TOKEN;
client.login(token);
