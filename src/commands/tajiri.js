// =====================================================================
// AMARKA: ?tajiriin — 15-ka Tajiriinta (active users kaliya)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../store');
const { getPrices, portfolioValue } = require('../utils/market');

const TOP_N   = 15;
const MEDALS  = ['🥇', '🥈', '🥉'];
const DEFAULT_CASH = 500;

function fmt(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${Math.round(n).toLocaleString()}`;
}

// Active = qof wax ka badelay default-ka ama wax ku ganacstay
function isActive(d, portVal) {
    const cash = d.cash || 0;
    return portVal > 0 || Math.abs(cash - DEFAULT_CASH) >= 1;
}

module.exports = async function tajiriCommand(message) {
    const userId = message.author.id;
    const prices = getPrices();

    const allEntries = Object.entries(userData).map(([id, d]) => {
        const portVal = portfolioValue(d.portfolio || {}, prices);
        const cash    = d.cash || 0;
        const total   = cash + portVal;
        return { id, d, total, cash, portVal };
    });

    // Top 15 — active users kaliya (default $500 oo waxba ma shaqaynin ka saar)
    const entries = allEntries
        .filter(e => e.total > 0 && isActive(e.d, e.portVal))
        .sort((a, b) => b.total - a.total)
        .slice(0, TOP_N);

    if (!entries.length) {
        return message.reply('⚠️ Wali cidna ganacsi ma sameynin — bilow `?trade`!');
    }

    // Meeshay ku jirto qofka (active users dhexdooda)
    const activeRanked = allEntries
        .filter(e => e.total > 0 && isActive(e.d, e.portVal))
        .sort((a, b) => b.total - a.total);
    const myRank  = activeRanked.findIndex(e => e.id === userId) + 1;
    const myEntry = allEntries.find(e => e.id === userId);
    const myTotal = myEntry ? myEntry.total : 0;

    const lines = entries.map((e, i) => {
        const pos    = MEDALS[i] ?? `**${i + 1}.**`;
        const shield = (e.d.shieldActiveUntil || 0) > Date.now() ? ' 🛡️' : '';
        const trend  = e.portVal > 0 ? ' 📈' : '';

        return (
            `${pos} <@${e.id}>${shield}${trend}\n` +
            `> 💎 **${fmt(e.total)}** wadarta\n` +
            `> 💵 ${fmt(e.cash)} cash  ·  📦 ${fmt(e.portVal)} hanti`
        );
    }).join('\n\n');

    const myLine = myRank > 0
        ? `📍 **Adigu:** Xero #${myRank} — **${fmt(myTotal)}**`
        : `📍 **Adigu:** Liiska kuma jirto — bilow \`?trade\`!`;

    const embed = new EmbedBuilder()
        .setTitle('💎 Garaad — Liiska Tajiriinta')
        .setColor('#f1c40f')
        .setDescription(
            `> 🏆 **${entries.length}** qof oo ganacsi sameeyay\n` +
            `> 📊 Kala-sooc: **cash + hanti** (suuqa hadda)\n\n` +
            lines +
            `\n\n${myLine}`
        )
        .setFooter({ text: '?trade si aad u bilaabato · ?suuqa qiimayaasha' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tajiriin_refresh_${userId}`)
            .setLabel('🔄 Cusboonaysii')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_tajiriin_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
