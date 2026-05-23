const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, deductFromTreasury, getTreasury, trackEarning } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const WIN_RATE      = 0.50;
const WIN_MULTI     = 1.9;   // win 1.9x stake (house keeps 0.1)
const COOLDOWN_MS   = 10_000;
const MIN_BET       = 50;
const MAX_BET       = 10_000;
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

function buildResult(win, dirLabel, profit, amount, newBal, market) {
    const trendLine = `${market.trend} Market: **${market.price.toLocaleString()}** (${market.arrow} ${market.change})`;
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
    const win      = Math.random() < WIN_RATE;
    const payout   = Math.floor(amount * WIN_MULTI);

    if (win) {
        if ((treasury.balance || 0) < payout) {
            return { err: `⚠️ Treasury funds low — market temporarily closed. Balance: **₿ ${fmt(treasury.balance || 0)}**` };
        }
        d.btc = (d.btc || 0) + payout;
        deductFromTreasury(payout);
        trackEarning(userId, payout);
    } else {
        d.btc = (d.btc || 0) - amount;
        addToTreasury(amount);
    }
    saveEcon();

    const dirLabel = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';
    return { win, payout, amount, newBal: d.btc, dirLabel };
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

    return message.reply({ embeds: [buildResult(result.win, result.dirLabel, result.payout, result.amount, result.newBal, market)] });
};

module.exports.WIN_MULTI = WIN_MULTI;
