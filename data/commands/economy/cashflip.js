const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const WIN_RATE    = 0.50;
const WIN_MULTI   = 2.0;
const WIN_TAX     = 5;
const BTC_ICON    = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';
const COOLDOWN_MS = 10_000;

const flipCooldowns = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fakePrice(base, tick) {
    const moves = [
        Math.floor(base * 1.012),
        Math.floor(base * 0.994),
        Math.floor(base * 1.007),
        Math.floor(base * 0.988),
        Math.floor(base * 1.021),
        Math.floor(base * 0.975),
    ];
    return moves[tick % moves.length];
}

function tickerEmbed(tick, price, prevPrice, dirLabel, amount) {
    const arrow  = price >= prevPrice ? '📈' : '📉';
    const bars   = ['🟥', '🟥', '🟥', '🟨', '🟨', '🟩'];
    const filled = bars.slice(0, tick + 1).join('');
    const empty  = '⬛'.repeat(3 - tick - 1);
    return new EmbedBuilder()
        .setTitle('📊 Garaad Market — Processing...')
        .setColor('#f39c12')
        .setDescription(
            `**Bet:** ${dirLabel}  |  **₿: ${price.toLocaleString()}**  ${arrow}\n\n` +
            `${filled}${empty}  Tick ${tick + 1}/3\n\n` +
            `_Natiijiadu waxay kuu timid DM-ka..._`
        )
        .setThumbnail(BTC_ICON);
}

function buildResult(win, dirLabel, profit, amount, newBal) {
    return win
        ? new EmbedBuilder()
            .setTitle('✅ Market Flip — WIN!')
            .setColor('#2ecc71')
            .setThumbnail(BTC_ICON)
            .setDescription(`Waxaad dooratay **${dirLabel}** — sax!\n\n📈 Suuqku dhinacaagaa u dhaqaaqay.`)
            .addFields(
                { name: '₿ Profit',      value: `**+₿: ${profit.toLocaleString()}**`, inline: true },
                { name: '₿ New Balance', value: `**₿: ${newBal.toLocaleString()}**`,  inline: true },
            )
            .setFooter({ text: 'Garaad Economy', iconURL: BTC_ICON })
        : new EmbedBuilder()
            .setTitle('❌ Market Flip — LOSS!')
            .setColor('#e74c3c')
            .setThumbnail(BTC_ICON)
            .setDescription(`Waxaad dooratay **${dirLabel}** — khalad!\n\n📉 Suuqku dhinaca kale u dhaqaaqay.`)
            .addFields(
                { name: '₿ Lost',        value: `**-₿: ${amount.toLocaleString()}**`, inline: true },
                { name: '₿ New Balance', value: `**₿: ${newBal.toLocaleString()}**`,  inline: true },
            )
            .setFooter({ text: 'Garaad Economy', iconURL: BTC_ICON });
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    let amount, direction;
    if (args && args.length >= 1) {
        const numIdx = isNaN(parseFloat(args[0])) ? 1 : 0;
        amount    = parseFloat(args[numIdx]);
        direction = (args[numIdx + 1] || '').toLowerCase();
    }

    if (!amount || isNaN(amount) || amount <= 0 || (direction !== 'up' && direction !== 'down')) {
        return message.reply(`⚠️ Isticmaal: \`?ef 500 up\`  ama  \`?ef 500 down\`\nWallet: **₿: ${fmt(d.btc || 0)}**`);
    }

    if ((d.btc || 0) < amount) {
        return message.reply(`⚠️ BTC kugu filna ma lihid. Wallet: **₿: ${fmt(d.btc || 0)}**`);
    }

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);
    if (cdLeft > 0) {
        return message.reply(`⏳ Sug **${cdLeft}s** kadib isku day.`);
    }

    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);

    // Delete user's command so others can't see the bet
    await message.delete().catch(() => {});

    const dirLabel = direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    const basePrice = 1000 + Math.floor(Math.random() * 500);
    let prevPrice = basePrice;

    // Show 3-tick live ticker
    const tickMsg = await message.channel.send({
        embeds: [tickerEmbed(0, fakePrice(basePrice, 0), prevPrice, dirLabel, amount)],
    }).catch(() => null);

    for (let t = 1; t < 3; t++) {
        await sleep(1000);
        const price = fakePrice(basePrice, t);
        if (tickMsg) await tickMsg.edit({ embeds: [tickerEmbed(t, price, prevPrice, dirLabel, amount)] }).catch(() => {});
        prevPrice = price;
    }

    await sleep(1000);

    // Calculate result
    const win     = Math.random() < WIN_RATE;
    const gross   = Math.floor(amount * WIN_MULTI);
    const netProfit = win ? gross - WIN_TAX : gross;

    if (win) {
        d.btc = (d.btc || 0) + (gross - WIN_TAX);
        addToTreasury(WIN_TAX);
        trackEarning(userId, gross - WIN_TAX);
    } else {
        d.btc = (d.btc || 0) - amount;
        addToTreasury(amount);
    }
    saveEcon();

    // Delete ticker, send result to DM only
    if (tickMsg) await tickMsg.delete().catch(() => {});

    await message.author.send({ embeds: [buildResult(win, dirLabel, win ? gross - WIN_TAX : amount, amount, d.btc || 0)] })
        .catch(() => {
            // If DM fails, send briefly in channel then delete
            message.channel.send({ embeds: [buildResult(win, dirLabel, win ? gross - WIN_TAX : amount, amount, d.btc || 0)] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
        });
};

module.exports.WIN_MULTI = WIN_MULTI;
