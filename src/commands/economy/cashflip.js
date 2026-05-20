const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

const WIN_RATE    = 0.50;
const WIN_MULTI   = 0.90;
const BTC_ICON    = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';
const COOLDOWN_MS = 10_000; // 10s cooldown between flips

const flipCooldowns = new Map(); // userId → cooldownUntil ms

function buildResult(win, dirLabel, profit, amount, newBal) {
    return win
        ? new EmbedBuilder()
            .setTitle('✅ Economy Flip — WIN!')
            .setColor('#2ecc71')
            .setThumbnail(BTC_ICON)
            .setDescription(`You picked **${dirLabel}** — correct!\n\n📈 The market moved your way.`)
            .addFields(
                { name: '₿ Profit',      value: `**+${fmt(profit)} BTC**`, inline: true },
                { name: '₿ New Balance', value: `**${newBal} BTC**`,       inline: true },
            )
            .setFooter({ text: 'Garaad Economy', iconURL: BTC_ICON })
        : new EmbedBuilder()
            .setTitle('❌ Economy Flip — LOSS!')
            .setColor('#e74c3c')
            .setThumbnail(BTC_ICON)
            .setDescription(`You picked **${dirLabel}** — wrong!\n\n📉 The market went the other way.`)
            .addFields(
                { name: '₿ Lost',        value: `**-${fmt(amount)} BTC**`, inline: true },
                { name: '₿ New Balance', value: `**${newBal} BTC**`,       inline: true },
            )
            .setFooter({ text: 'Garaad Economy', iconURL: BTC_ICON });
}

function doFlip(userId, amount, direction) {
    const { econData: eData, checkEconUser: ceu, saveEcon: se, addToTreasury: att, trackEarning: te } = require('../../economy/econStore');
    ceu(userId);
    const d = eData[userId];

    if ((d.btc || 0) < amount) return { err: `⚠️ Not enough BTC. Wallet: **${fmt(d.btc || 0)} BTC**` };

    const win    = Math.random() < WIN_RATE;
    const profit = Math.floor(amount * WIN_MULTI);

    if (win) {
        d.btc = (d.btc || 0) + profit;
        att(amount - profit);
        te(userId, profit);
    } else {
        d.btc = (d.btc || 0) - amount;
        att(amount);
    }
    se();

    const dirLabel = direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';
    return { embed: buildResult(win, dirLabel, profit, amount, fmt(d.btc || 0)) };
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
        return message.reply(
            `⚠️ Usage: \`?ef 500 up\`  or  \`?ef 500 down\`\n` +
            `₿ Wallet: **${fmt(d.btc || 0)} BTC**`
        );
    }

    if ((d.btc || 0) < amount) {
        return message.reply(`⚠️ Not enough BTC. Wallet: **${fmt(d.btc || 0)} BTC**`);
    }

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);

    // ── On cooldown ──
    if (cdLeft > 0) {
        return message.reply(`⏳ Wait **${cdLeft}s** then send the command again.`);
    }

    // ── Instant result ──
    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);
    const { err, embed } = doFlip(userId, amount, direction);
    if (err) return message.reply(err);
    return message.reply({ embeds: [embed] });
};

module.exports.WIN_MULTI = WIN_MULTI;
