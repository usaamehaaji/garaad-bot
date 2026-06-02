const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, deductFromTreasury, getTreasury, trackEarning } = require('../../../src/economy/econStore');
const { getMarketState, calculateOutcome, recordFlip } = require('../../../src/economy/marketEngine');

const { fmt } = require('../../../src/utils/helpers');

const PROFIT_RATE = 0.95;
const COOLDOWN_MS = 15_000;
const MIN_BET     = 10;
const MAX_BET     = 50_000;

const flipCooldowns = new Map();

function getFlipStats(d) {
    d.flipStats ??= { flips: 0, wins: 0, totalProfit: 0, totalLost: 0 };
    return d.flipStats;
}


function buildResultEmbed(win, dirLabel, amount, profit, newBal, state) {
    const returnedLine = win
        ? `✅ Returned: **${fmt(amount + profit)} BTC** _(+${fmt(profit)} BTC profit)_`
        : `❌ Returned: **0 BTC** _(−${fmt(amount)} BTC loss)_`;

    return new EmbedBuilder()
        .setTitle(win ? '✅ Economy Flip — WIN' : '❌ Economy Flip — LOSS')
        .setColor(win ? '#2ecc71' : '#e74c3c')
        .setDescription(
            `🎯 Direction: **${dirLabel}**\n` +
            `${state.icon} Market: **${state.label}** — ${state.desc}\n\n` +
            `💰 Bet: **${fmt(amount)} BTC**\n` +
            `${returnedLine}\n\n` +
            `₿ Wallet: **${fmt(newBal)} BTC**`
        )
        .setFooter({ text: 'Garaad Economy • ?ef to play again' });
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d     = econData[userId];
    const state = getMarketState();

    // ── ?ef top: leaderboard ──
    if (args && (args[0] === 'top' || args[0] === 'kwrn' || args[0] === 'kooron')) {
        const top = Object.entries(econData)
            .filter(([k, v]) => /^\d{17,19}$/.test(k) && v.flipStats?.flips > 0)
            .sort(([, a], [, b]) => (b.flipStats?.totalProfit || 0) - (a.flipStats?.totalProfit || 0))
            .slice(0, 10);

        if (top.length === 0)
            return message.reply('📊 Wali cid flip ma samayn.\nIsticmaal: `?ef 500 u` ama `?ef 500 d`');

        const medals = ['🥇', '🥈', '🥉'];
        const lines  = top.map(([uid, v], i) => {
            const fs      = v.flipStats;
            const winRate = fs.flips > 0 ? Math.round((fs.wins / fs.flips) * 100) : 0;
            const medal   = medals[i] || `**${i + 1}.**`;
            return `${medal} <@${uid}>\n┆ 💰 **₿ ${fmt(fs.totalProfit)}** profit · 🎯 ${winRate}% · 🎲 ${fs.flips} flips`;
        });

        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🏆 Top Flippers')
            .setColor('#f39c12')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: 'Garaad Economy • Treasury-backed market' })] });
    }

    // ── No args: market overview ──
    if (!args || args.length === 0) {
        const t  = getTreasury();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('📊 Garaad Market')
            .setColor('#f39c12')
            .addFields(
                { name: `${state.icon} State`, value: `**${state.label}**`,            inline: true },
                { name: '📋 Desc',              value: `${state.desc}`,                 inline: true },
                { name: '🏛️ Treasury',          value: `**₿ ${fmt(t.balance || 0)}**`, inline: true },
            )
            .setDescription(`Bet: \`?ef 500 u\` or \`?ef 500 d\` · Min **₿${MIN_BET}**\n\`?ef top\` — leaderboard`)
            .setFooter({ text: 'Garaad Economy • Treasury-backed market' })] });
    }

    // ── Parse args ──
    let amount, direction;
    const numIdx = isNaN(parseFloat(args[0])) ? 1 : 0;
    amount       = parseFloat(args[numIdx]);
    direction    = (args[numIdx + 1] || '').toLowerCase();
    if (direction === 'up')   direction = 'u';
    if (direction === 'down') direction = 'd';

    if (!amount || isNaN(amount) || amount <= 0 || (direction !== 'u' && direction !== 'd'))
        return message.reply(`⚠️ Isticmaal: \`?ef 500 u\`  ama  \`?ef 500 d\`\nWallet: **₿ ${fmt(d.btc || 0)}**`);

    if (amount < MIN_BET)
        return message.reply(`⚠️ Min bet waa **₿ ${MIN_BET.toLocaleString()}**. Kor u qaad.`);

    if (amount > MAX_BET)
        return message.reply(`⚠️ Max bet waa **₿ ${fmt(MAX_BET)}**. Hoos u dhig.`);

    if ((d.btc || 0) < amount)
        return message.reply(`⚠️ BTC kugu filna ma lihid. Wallet: **₿ ${fmt(d.btc || 0)}**`);

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);
    if (cdLeft > 0)
        return message.reply(`⏳ Flip cooldown: Sug **${cdLeft}s** kadib mar kale isku day.`);

    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);

    const dirLabel = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';

    const { win } = calculateOutcome(userId, amount);
    const profit   = Math.floor(amount * PROFIT_RATE);
    const treasury = getTreasury();

    if (win && (treasury.balance || 0) < profit) {
        flipCooldowns.delete(userId);
        return message.reply(`⚠️ Treasury funds low — market temporarily closed. Balance: **₿ ${fmt(treasury.balance || 0)}**`);
    }

    // 2 second suspense then result
    await new Promise(r => setTimeout(r, 2000));

    const walletBefore = d.btc || 0;
    d.btc = walletBefore - amount;
    const fs = getFlipStats(d);
    fs.flips++;

    if (win) {
        d.btc += amount + profit;
        deductFromTreasury(profit);
        trackEarning(userId, profit);
        fs.wins++;
        fs.totalProfit = (fs.totalProfit || 0) + profit;
    } else {
        addToTreasury(amount);
        fs.totalLost = (fs.totalLost || 0) + amount;
    }

    recordFlip(userId, amount, win, walletBefore);
    // Track flipsPlayed in userData stats
    try {
        const { userData, saveData } = require('../../../src/store');
        const { checkUser } = require('../../../src/utils/helpers');
        checkUser(userId);
        userData[userId].stats.flipsPlayed = (userData[userId].stats.flipsPlayed || 0) + 1;
        saveData();
    } catch {}
    saveEcon();

    const freshState = getMarketState();
    return message.reply({ embeds: [buildResultEmbed(win, dirLabel, amount, profit, d.btc, freshState)] });
};

module.exports.PROFIT_RATE = PROFIT_RATE;
