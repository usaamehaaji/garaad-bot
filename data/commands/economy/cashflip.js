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
    // Suuqa: kaliya UP ama DOWN
    const suuqLabel = state.name === 'UP' ? '⬆️ Up' : '⬇️ Down';

    const winDesc =
        `🎯 **Doorashada:** ${dirLabel}\n` +
        `📊 **Suuqa:** ${suuqLabel}\n\n` +
        `💰 **Gelisay:** ${fmt(amount)} BTC\n` +
        `🏆 **Heshay:** ${fmt(amount + profit)} BTC\n` +
        `📈 **Faa'iido:** +${fmt(profit)} BTC\n\n` +
        `👛 **New Wallet:** ${fmt(newBal)} BTC`;

    const lossDesc =
        `🎯 **Doorashada:** ${dirLabel}\n` +
        `📊 **Suuqa:** ${suuqLabel}\n\n` +
        `💰 **Gelisay:** ${fmt(amount)} BTC\n` +
        `📉 **Khasaaraha:** -${fmt(amount)} BTC\n\n` +
        `👛 **New Wallet:** ${fmt(newBal)} BTC`;

    return new EmbedBuilder()
        .setTitle('📈 Economy Flip')
        .setColor(win ? '#2ecc71' : '#e74c3c')
        .setDescription(
            (win ? '✅ **GUUL!**\n\n' : '❌ **GUUL-DARRO!**\n\n') +
            (win ? winDesc : lossDesc)
        )
        .setFooter({ text: 'Garaad Economy • ?trade tijaabi' });
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
            .setTitle('🏆 Ugu Wanaagsan Flip-yada')
            .setColor('#f39c12')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: 'Garaad Economy • Suuq Treasury-ku taageero' })] });
    }

    // ── No args: market overview ──
    if (!args || args.length === 0) {
        const t  = getTreasury();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('📊 Garaad Suuq')
            .setColor('#f39c12')
            .addFields(
                { name: `${state.icon} Xaalad`, value: `**${state.label}**`,            inline: true },
                { name: '📋 Faahfaahin',         value: `${state.desc}`,                 inline: true },
                { name: '🏛️ Khaznad',            value: `**₿ ${fmt(t.balance || 0)}**`, inline: true },
            )
            .setDescription(`Rahmad: \`?ef 500 u\` ama \`?ef 500 d\` · Ugu yar **₿${MIN_BET}**\n\`?ef top\` — koorontada`)
            .setFooter({ text: 'Garaad Economy • Suuq Treasury-ku taageero' })] });
    }

    // ── Parse args ──
    let amount, direction;
    const numIdx = isNaN(parseFloat(args[0])) ? 1 : 0;
    amount       = parseFloat(args[numIdx]);
    direction    = (args[numIdx + 1] || '').toLowerCase();
    if (direction === 'up')   direction = 'u';
    if (direction === 'down') direction = 'd';

    if (!amount || isNaN(amount) || amount <= 0 || (direction !== 'u' && direction !== 'd'))
        return message.reply(`⚠️ Isticmaal: \`?ef 500 u\`  ama  \`?ef 500 d\`\n👛 Wallet: **₿ ${fmt(d.btc || 0)}**`);

    if (amount < MIN_BET)
        return message.reply(`⚠️ Ugu yar bet waa **₿ ${MIN_BET.toLocaleString()}**. Kor u qaad.`);

    if (amount > MAX_BET)
        return message.reply(`⚠️ Ugu badan bet waa **₿ ${fmt(MAX_BET)}**. Hoos u dhig.`);

    if ((d.btc || 0) < amount)
        return message.reply(`⚠️ BTC kugu filna ma lihid. 👛 Wallet: **₿ ${fmt(d.btc || 0)}**`);

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);
    if (cdLeft > 0)
        return message.reply(`⏳ Flip cooldown: Sug **${cdLeft}s** kadib mar kale isku day.`);

    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);

    const dirLabel = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';

    const { win } = calculateOutcome(userId, amount, direction);
    const profit   = Math.floor(amount * PROFIT_RATE);
    const treasury = getTreasury();

    if (win && (treasury.balance || 0) < profit) {
        flipCooldowns.delete(userId);
        return message.reply(`⚠️ Treasury funds low — market temporarily closed. Balance: **₿ ${fmt(treasury.balance || 0)}**`);
    }

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
