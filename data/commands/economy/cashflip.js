const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, deductFromTreasury, getTreasury, trackEarning } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const PROFIT_RATE   = 0.95; // win = stake back + 95% of stake as profit
const COOLDOWN_MS   = 10_000;
const MIN_BET       = 50;
const MAX_BET       = 50_000;

// Win rate drops as bet increases
function getWinRate(amount) {
    if (amount <= 1_000)  return 0.48;
    if (amount <= 5_000)  return 0.44;
    if (amount <= 10_000) return 0.39;
    if (amount <= 25_000) return 0.32;
    return 0.24;
}
const MIN_TREASURY  = 5_000; // market closes if treasury below this

const flipCooldowns = new Map();

// ── Live market price (cosmetic, changes every 10s) ──────────────────
function getMarketState() {
    const tick     = Math.floor(Date.now() / 10_000);
    const prevTick = tick - 1;
    const price    = p => 800 + Math.abs((p * 1664525 + 1013904223) & 0x7fffffff) % 400;
    const cur      = price(tick);
    const prev     = price(prevTick);
    const up       = cur >= prev;
    return {
        price:   cur,
        prev:    prev,
        trend:   up ? '📈' : '📉',
        arrow:   up ? '⬆️' : '⬇️',
        change:  Math.abs(cur - prev),
        nextSec: 10 - Math.floor((Date.now() % 10_000) / 1000),
    };
}

function buildResult(win, dirLabel, direction, profit, amount, newBal, market) { // profit = 95% of stake on win
    const marketUp   = win ? (direction === 'u') : (direction !== 'u');
    const trendEmoji = marketUp ? '📈' : '📉';
    const trendLine  = `${trendEmoji} Market: **${market.price.toLocaleString()}**`;
    return win
        ? new EmbedBuilder()
            .setTitle('✅ Economy Flip — WIN!')
            .setColor('#2ecc71')
            .setDescription(`You picked **${dirLabel}** — correct!\n${trendLine}`)
            .addFields(
                { name: '💰 Profit',      value: `**+₿ ${profit.toLocaleString()}**`, inline: true },
                { name: '💳 New Balance', value: `**₿ ${newBal.toLocaleString()}**`,  inline: true },
            )
            .setFooter({ text: 'Garaad Economy • Treasury-backed market' })
        : new EmbedBuilder()
            .setTitle('❌ Economy Flip — LOSS!')
            .setColor('#e74c3c')
            .setDescription(`You picked **${dirLabel}** — wrong!\n${trendLine}`)
            .addFields(
                { name: '💸 Lost',        value: `**-₿ ${amount.toLocaleString()}**`, inline: true },
                { name: '💳 New Balance', value: `**₿ ${newBal.toLocaleString()}**`,  inline: true },
            )
            .setFooter({ text: 'Garaad Economy • Treasury-backed market' });
}

function doFlip(userId, amount, direction) {
    const { econData: eData, checkEconUser: ceu } = require('../../../src/economy/econStore');
    ceu(userId);
    const d = eData[userId];

    if ((d.btc || 0) < amount) return { err: `⚠️ BTC kugu filna ma lihid. Wallet: **₿ ${fmt(d.btc || 0)}**` };

    const treasury = getTreasury();
    const win      = Math.random() < getWinRate(amount);
    const profit   = Math.floor(amount * PROFIT_RATE);

    // Always deduct stake first
    d.btc = (d.btc || 0) - amount;

    if (win) {
        if ((treasury.balance || 0) < profit) {
            d.btc += amount; // refund stake
            return { err: `⚠️ Treasury funds low — market temporarily closed. Balance: **₿ ${fmt(treasury.balance || 0)}**` };
        }
        d.btc += amount + profit; // return stake + 95% profit
        deductFromTreasury(profit);
        trackEarning(userId, profit);
    } else {
        addToTreasury(amount);
    }
    saveEcon();

    const dirLabel = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';
    return { win, profit, amount, newBal: d.btc, dirLabel, direction };
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d      = econData[userId];
    const market = getMarketState();

    // ── No args: show market state ──
    if (!args || args.length === 0) {
        const t = getTreasury();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('📊 Garaad Market')
            .setColor('#f39c12')
            .addFields(
                { name: `${market.trend} Price`,   value: `**${market.price.toLocaleString()}**`,        inline: true },
                { name: '⏳ Next Tick',             value: `**${market.nextSec}s**`,                      inline: true },
                { name: '🏛️ Treasury',              value: `**₿ ${fmt(t.balance || 0)}**`,               inline: true },
            )
            .setDescription(`Bet: \`?ef 500 u\` or \`?ef 500 d\` · Min **₿${MIN_BET}** · Max **₿${MAX_BET.toLocaleString()}**`)
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

    const treasury = getTreasury();
    if ((treasury.balance || 0) < MIN_TREASURY)
        return message.reply(`⚠️ Treasury funds low — market temporarily closed. **₿ ${fmt(treasury.balance || 0)}** left.`);

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);
    if (cdLeft > 0)
        return message.reply(`⏳ Sug **${cdLeft}s** kadib isku day.`);

    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);

    const result = doFlip(userId, amount, direction);
    if (result.err) return message.reply(result.err);

    return message.reply({ embeds: [buildResult(result.win, result.dirLabel, result.direction, result.profit, result.amount, result.newBal, market)] });
};

module.exports.PROFIT_RATE = PROFIT_RATE;
