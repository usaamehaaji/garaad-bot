const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, deductFromTreasury, getTreasury, trackEarning } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const PROFIT_RATE      = 0.95;
const COOLDOWN_MS      = 10_000;
const MIN_BET          = 10;
const MAX_BET          = 50_000;
const DAILY_PROFIT_CAP = 500_000;

function getWinRate(amount) {
    if (amount <= 500)    return 0.50;
    if (amount <= 2_000)  return 0.47;
    if (amount <= 5_000)  return 0.44;
    if (amount <= 15_000) return 0.40;
    if (amount <= 35_000) return 0.36;
    return 0.32;
}

const flipCooldowns = new Map();

function todayKey() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getFlipStats(d) {
    d.flipStats ??= { flips: 0, wins: 0, totalProfit: 0, totalLost: 0, daily: { date: '', profit: 0 } };
    d.flipStats.daily ??= { date: '', profit: 0 };
    const today = todayKey();
    if (d.flipStats.daily.date !== today) d.flipStats.daily = { date: today, profit: 0 };
    return d.flipStats;
}

function getStreak(d) {
    d.flipStreak ??= { type: '', count: 0 };
    return d.flipStreak;
}

// Returns forced win (true), forced loss (false), or null (random)
function checkStreak(streak) {
    if (streak.type === 'loss' && streak.count >= 2) return true;  // 2 loss → force win
    if (streak.type === 'win'  && streak.count >= 3) return false; // 3 win  → force loss
    return null;
}

function updateStreak(streak, win) {
    const type = win ? 'win' : 'loss';
    if (streak.type === type) streak.count++;
    else { streak.type = type; streak.count = 1; }
}

function getMarketState() {
    const tick     = Math.floor(Date.now() / 10_000);
    const prevTick = tick - 1;
    const price    = p => 800 + Math.abs((p * 1664525 + 1013904223) & 0x7fffffff) % 400;
    const cur      = price(tick);
    const prev     = price(prevTick);
    const up       = cur >= prev;
    return {
        price:   cur,
        trend:   up ? '📈' : '📉',
        nextSec: 10 - Math.floor((Date.now() % 10_000) / 1000),
    };
}

function buildResult(win, dirLabel, direction, profit, amount, newBal, market, capLeft, lossStreak) {
    const marketUp  = win ? (direction === 'u') : (direction !== 'u');
    const marketDir = marketUp ? 'UP' : 'DOWN';
    const capNote   = win && capLeft !== null ? `\n📊 Daily cap remaining: **₿ ${fmt(capLeft)}**` : '';

    if (win) {
        const trendLine = `${marketUp ? '📈' : '📉'} Market: **${market.price.toLocaleString()}**`;
        return new EmbedBuilder()
            .setTitle('✅ Economy Flip — WIN!')
            .setColor('#2ecc71')
            .setDescription(`You picked **${dirLabel}** — correct!\n${trendLine}${capNote}`)
            .addFields(
                { name: '💰 Profit',      value: `**+₿ ${fmt(profit)}**`, inline: true },
                { name: '💳 New Balance', value: `**₿ ${fmt(newBal)}**`,  inline: true },
            )
            .setFooter({ text: 'Garaad Economy • Treasury-backed market' });
    }

    const streakHint = lossStreak >= 2
        ? '\n🔥 **Next flip → guaranteed WIN!**'
        : '\n🔥 **1 more loss → guaranteed WIN!**';

    return new EmbedBuilder()
        .setTitle(`💥 LOSS  •  -₿ ${fmt(amount)}`)
        .setColor('#e74c3c')
        .setDescription(`📉 Market went **${marketDir}** against you${streakHint}`)
        .addFields(
            { name: '💸 You lost', value: `**₿ ${fmt(amount)}**`, inline: true },
            { name: '💳 Balance',  value: `**₿ ${fmt(newBal)}**`, inline: true },
        )
        .setFooter({ text: 'Garaad Economy • Treasury-backed market' });
}

function doFlip(userId, amount, direction) {
    const { econData: eData, checkEconUser: ceu } = require('../../../src/economy/econStore');
    ceu(userId);
    const d    = eData[userId];
    const fs   = getFlipStats(d);

    if ((d.btc || 0) < amount) return { err: `⚠️ BTC kugu filna ma lihid. Wallet: **₿ ${fmt(d.btc || 0)}**` };

    // Daily profit cap check (skip for VIP users)
    if (!d.vip && fs.daily.profit >= DAILY_PROFIT_CAP)
        return { err: `🚫 Maalinta max profit-kaaga waad gaartay (**₿ ${fmt(DAILY_PROFIT_CAP)}**). Berri isku day.` };

    const treasury = getTreasury();
    const streak   = getStreak(d);
    const forced   = checkStreak(streak);
    const win      = forced !== null ? forced : Math.random() < getWinRate(amount);
    const profit   = Math.floor(amount * PROFIT_RATE);

    d.btc = (d.btc || 0) - amount;

    if (win) {
        if ((treasury.balance || 0) < profit) {
            d.btc += amount;
            return { err: `⚠️ Treasury funds low — market temporarily closed. Balance: **₿ ${fmt(treasury.balance || 0)}**` };
        }
        // Cap actual payout to daily remaining (VIP = no cap)
        const capLeft    = d.vip ? null : DAILY_PROFIT_CAP - fs.daily.profit;
        const paidProfit = d.vip ? profit : Math.min(profit, capLeft);
        d.btc += amount + paidProfit;
        deductFromTreasury(paidProfit);
        trackEarning(userId, paidProfit);
        fs.wins++;
        fs.totalProfit    += paidProfit;
        fs.daily.profit   += paidProfit;
        fs.flips++;
        updateStreak(streak, true);
        saveEcon();
        const dirLabel = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';
        return { win, profit: paidProfit, amount, newBal: d.btc, dirLabel, direction, capLeft: DAILY_PROFIT_CAP - fs.daily.profit };
    } else {
        addToTreasury(amount);
        fs.totalLost += amount;
        fs.flips++;
        updateStreak(streak, false);
        saveEcon();
        const dirLabel = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';
        return { win, profit, amount, newBal: d.btc, dirLabel, direction, capLeft: null, lossStreak: streak.count };
    }
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d      = econData[userId];
    const market = getMarketState();

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
            .setFooter({ text: `Garaad Economy • Daily cap: ₿${fmt(DAILY_PROFIT_CAP)}` })] });
    }

    // ── No args: market state ──
    if (!args || args.length === 0) {
        const t  = getTreasury();
        const fs = getFlipStats(d);
        const capLeft = Math.max(0, DAILY_PROFIT_CAP - fs.daily.profit);
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('📊 Garaad Market')
            .setColor('#f39c12')
            .addFields(
                { name: `${market.trend} Price`,    value: `**${market.price.toLocaleString()}**`, inline: true },
                { name: '⏳ Next Tick',              value: `**${market.nextSec}s**`,               inline: true },
                { name: '🏛️ Treasury',               value: `**₿ ${fmt(t.balance || 0)}**`,        inline: true },
                { name: '📊 Your Daily Cap Left',    value: `**₿ ${fmt(capLeft)}**`,                inline: true },
            )
            .setDescription(`Bet: \`?ef 500 u\` or \`?ef 500 d\` · Min **₿${MIN_BET}** · Max **₿${MAX_BET.toLocaleString()}**\n\`?ef top\` — leaderboard`)
            .setFooter({ text: 'Garaad Economy • Treasury-backed market' })] });
    }

    let amount, direction;
    const numIdx  = isNaN(parseFloat(args[0])) ? 1 : 0;
    amount        = parseFloat(args[numIdx]);
    direction     = (args[numIdx + 1] || '').toLowerCase();
    if (direction === 'up')   direction = 'u';
    if (direction === 'down') direction = 'd';

    if (!amount || isNaN(amount) || amount <= 0 || (direction !== 'u' && direction !== 'd'))
        return message.reply(`⚠️ Isticmaal: \`?ef 500 u\`  ama  \`?ef 500 d\`\nWallet: **₿ ${fmt(d.btc || 0)}**`);

    if (amount < MIN_BET)
        return message.reply(`⚠️ Min bet waa **₿ ${MIN_BET.toLocaleString()}**. Kor u qaad.`);

    if (amount > MAX_BET)
        return message.reply(`⚠️ Max bet waa **₿ ${MAX_BET.toLocaleString()}**. Hoos u dhig.`);

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);
    if (cdLeft > 0)
        return message.reply(`⏳ Sug **${cdLeft}s** kadib isku day.`);

    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);

    const result = doFlip(userId, amount, direction);
    if (result.err) return message.reply(result.err);

    return message.reply({ embeds: [buildResult(result.win, result.dirLabel, result.direction, result.profit, result.amount, result.newBal, market, result.capLeft, result.lossStreak)] });
};

module.exports.PROFIT_RATE = PROFIT_RATE;
