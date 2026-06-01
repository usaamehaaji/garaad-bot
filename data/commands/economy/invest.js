// =====================================================================
// AMARKA: ?invest <xad> <nooc>
// Personal Investment — company la'aanteed jeebkaaga BTC ku invest geli
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');

const INVEST_COOLDOWN = 8 * 60 * 60 * 1000; // 8 saacadood

const TYPES = {
    ammaan:      { label: '🟢 Ammaan',      emoji: '🟢', win: 0.80, minW: 0.05, maxW: 0.15, minL: 0.01, maxL: 0.05 },
    safe:        { label: '🟢 Ammaan',      emoji: '🟢', win: 0.80, minW: 0.05, maxW: 0.15, minL: 0.01, maxL: 0.05 },
    dhexdhexaad: { label: '🟡 Dhexdhexaad', emoji: '🟡', win: 0.60, minW: 0.15, maxW: 0.30, minL: 0.10, maxL: 0.20 },
    medium:      { label: '🟡 Dhexdhexaad', emoji: '🟡', win: 0.60, minW: 0.15, maxW: 0.30, minL: 0.10, maxL: 0.20 },
    khatar:      { label: '🔴 Khatar',      emoji: '🔴', win: 0.40, minW: 0.30, maxW: 0.60, minL: 0.15, maxL: 0.40 },
    risky:       { label: '🔴 Khatar',      emoji: '🔴', win: 0.40, minW: 0.30, maxW: 0.60, minL: 0.15, maxL: 0.40 },
};

function fmtBtc(n) { return `₿${Math.floor(n || 0).toLocaleString()}`; }

module.exports = async function investCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    // ?invest — no args, show options
    if (!args[0] || args[0] === 'info') {
        const last = d.lastPersonalInvest || 0;
        const wait = INVEST_COOLDOWN - (Date.now() - last);
        const coolLine = wait > 0
            ? `⏳ Cooldown: **${Math.floor(wait / 3600000)}h ${Math.ceil((wait % 3600000) / 60000)}m** hadhay`
            : `✅ Invest geli kartaa`;

        return message.reply({ embeds: [new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('📈 Personal Investment')
            .setDescription(
                `**💳 Jeebkaaga:** ${fmtBtc(d.btc)}\n${coolLine}\n\n` +
                `**Noocyada:**\n` +
                `🟢 \`ammaan\` — 80% guul **(+5–15%)** | 20% qasaaro **(−1–5%)**\n` +
                `🟡 \`dhexdhexaad\` — 60% guul **(+15–30%)** | 40% qasaaro **(−10–20%)**\n` +
                `🔴 \`khatar\` — 40% guul **(+30–60%)** | 60% qasaaro **(−15–40%)**\n\n` +
                `**Isticmaal:**\n` +
                `\`?invest 5000 ammaan\`\n` +
                `\`?invest 10000 khatar\`\n\n` +
                `_Cooldown: 8 saacadood_`
            )
        ]});
    }

    const amount = Math.floor(Number(args[0]));
    const type   = TYPES[(args[1] || '').toLowerCase()];

    if (!amount || amount <= 0)
        return message.reply('⚠️ Isticmaal: `?invest <xad> <nooc>`\nTusaale: `?invest 5000 ammaan`');
    if (!type)
        return message.reply('⚠️ Nooca dooro: `ammaan` / `dhexdhexaad` / `khatar`\nTusaale: `?invest 5000 ammaan`');
    if (amount < 500)
        return message.reply('⚠️ Ugu yaraan **₿500** ayaa loo baahan invest.');
    if (amount > (d.btc || 0))
        return message.reply(`⚠️ BTC kugu filna ma lihid. Haysataa: ${fmtBtc(d.btc)}`);

    // Cooldown
    const now  = Date.now();
    const wait = INVEST_COOLDOWN - (now - (d.lastPersonalInvest || 0));
    if (wait > 0) {
        const h = Math.floor(wait / 3600000);
        const m = Math.ceil((wait % 3600000) / 60000);
        return message.reply(`⏳ **${h}h ${m}m** sug ka dibna invest galin kartaa.`);
    }

    // Invest
    const won    = Math.random() < type.win;
    const pct    = won
        ? type.minW + Math.random() * (type.maxW - type.minW)
        : type.minL + Math.random() * (type.maxL - type.minL);
    const change = Math.floor(amount * pct);
    const profit = won ? change : -change;

    d.btc = (d.btc || 0) + profit;
    d.lastPersonalInvest = now;

    if (!d.investHistory) d.investHistory = [];
    d.investHistory.unshift({ type: args[1], amount, profit, at: now });
    if (d.investHistory.length > 10) d.investHistory.length = 10;

    saveEcon();

    const emoji = won ? '📈' : '📉';
    const sign  = won ? '+' : '−';
    const color = won ? '#27ae60' : '#e74c3c';

    return message.reply({ embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Personal Invest — ${won ? 'GUUL! 🎉' : 'QASAARO 😔'}`)
        .setDescription(
            `**${type.label}** Invest\n\n` +
            `💵 **Invest-ka:** ${fmtBtc(amount)}\n` +
            `${emoji} **Natiiio:** **${sign}${fmtBtc(Math.abs(profit))}** *(${sign}${(pct * 100).toFixed(1)}%)*\n` +
            `💳 **Jeebkaaga hadda:** ${fmtBtc(d.btc)}\n\n` +
            `⏳ Invest-ka xiga: **8 saacadood**`
        )
        .setFooter({ text: 'Garaad Economy • ?invest info — options' })
    ]});
};
