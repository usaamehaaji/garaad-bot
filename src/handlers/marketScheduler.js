// =====================================================================
// SUUQA SCHEDULER — Farriin 12 saacadood kasta (Market Update Auto-Post)
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { getPrices, getPriceHistory, renderChart, pctChange } = require('../utils/market');

const INTERVAL_MS      = 12 * 60 * 60 * 1000;
const CHANNEL_ENV_KEY  = 'MARKET_CHANNEL_ID';

function buildMarketEmbed() {
    const prices = getPrices();
    const assets = [
        { key: 'BTC',  label: '₿ Bitcoin',              unit: '$' },
        { key: 'EUR',  label: '🔵 Euro',                 unit: '$' },
        { key: 'GOLD', label: '🟡 Dahabka (Gold)',       unit: '$' },
        { key: 'SOS',  label: '🇸🇴 Shilinka Soomali',   unit: 'SOS/$1' },
    ];

    const lines = assets.map(a => {
        const hist  = getPriceHistory(a.key, 7);
        const chart = renderChart(hist);
        const pct   = pctChange(hist);
        const n     = parseFloat(pct);
        const sign  = n >= 0 ? `🟢 +${pct}%` : `🔴 ${pct}%`;
        const price = a.key === 'SOS'
            ? `${prices[a.key].toLocaleString()} SOS = $1`
            : `$${prices[a.key].toLocaleString()}`;
        return `**${a.label}** — ${price}  ${sign}\n\`${chart}\``;
    }).join('\n\n');

    return new EmbedBuilder()
        .setTitle('📡 Wariyaha Suuqa — Garaad Markets (12h)')
        .setColor('#1a1a2e')
        .setDescription(
            lines +
            '\n\n`?suuqa` — fiiri chart wax badan | `?trade` — ganacsi | `?manta` — dakhlig maanta'
        )
        .setTimestamp()
        .setFooter({ text: 'Qiimayaashu waxay beddelmaan saacad kasta · ganacsi khatarta ku jiro' });
}

module.exports = function setupMarketScheduler(client) {
    const channelId = process.env[CHANNEL_ENV_KEY];
    if (!channelId) {
        console.log('[Market] MARKET_CHANNEL_ID lama samayn — auto-post waa demid.');
        return;
    }

    async function post() {
        try {
            const ch = await client.channels.fetch(channelId).catch(() => null);
            if (!ch || !ch.isTextBased()) return;
            await ch.send({ embeds: [buildMarketEmbed()] });
            console.log('[Market] Wariyaha suuqa la diray:', channelId);
        } catch (e) {
            console.error('[Market] Khalad diridda:', e.message);
        }
    }

    // Post first after 30 seconds (let bot settle), then every 12h
    setTimeout(() => {
        post();
        setInterval(post, INTERVAL_MS);
    }, 30_000);

    console.log('[Market] Scheduler bilaaday — channel:', channelId);
};

module.exports.buildMarketEmbed = buildMarketEmbed;
