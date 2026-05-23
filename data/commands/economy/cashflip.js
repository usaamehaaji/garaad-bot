const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const WIN_RATE    = 0.50;
const WIN_MULTI   = 2.0;
const WIN_TAX     = 5;
const COOLDOWN_MS = 10_000;

const flipCooldowns = new Map();

const txRef  = () => '#MKT-' + Math.random().toString(36).slice(2,8).toUpperCase();
const txDate = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

function buildResult(win, dirLabel, profit, amount, newBal) {
    if (win) {
        return new EmbedBuilder()
            .setTitle('🏦 GARAAD BANK — Market Trade Receipt')
            .setColor('#27ae60')
            .addFields(
                { name: '📋 Type',        value: '📈 MARKET FLIP',           inline: true },
                { name: '🔖 Reference',   value: `\`${txRef()}\``,            inline: true },
                { name: '📅 Date',        value: txDate(),                     inline: true },
                { name: '📊 Direction',   value: dirLabel,                     inline: true },
                { name: '✅ Result',      value: '**WIN**',                    inline: true },
                { name: '💰 Stake',       value: `₿ ${amount.toLocaleString()}`, inline: true },
                { name: '📈 Profit',      value: `**+₿ ${profit.toLocaleString()}**`, inline: true },
                { name: '💳 New Balance', value: `**₿ ${newBal.toLocaleString()}**`,  inline: true },
                { name: '​',         value: '​',                          inline: true },
            )
            .setFooter({ text: 'Garaad Bank • Market Trade • 50% win rate' });
    } else {
        return new EmbedBuilder()
            .setTitle('🏦 GARAAD BANK — Market Trade Receipt')
            .setColor('#c0392b')
            .addFields(
                { name: '📋 Type',        value: '📉 MARKET FLIP',              inline: true },
                { name: '🔖 Reference',   value: `\`${txRef()}\``,               inline: true },
                { name: '📅 Date',        value: txDate(),                        inline: true },
                { name: '📊 Direction',   value: dirLabel,                        inline: true },
                { name: '❌ Result',      value: '**LOSS**',                     inline: true },
                { name: '💰 Stake',       value: `₿ ${amount.toLocaleString()}`,  inline: true },
                { name: '📉 Lost',        value: `**-₿ ${amount.toLocaleString()}**`, inline: true },
                { name: '💳 New Balance', value: `**₿ ${newBal.toLocaleString()}**`,  inline: true },
                { name: '​',         value: '​',                             inline: true },
            )
            .setFooter({ text: 'Garaad Bank • Market Trade • 50% win rate' });
    }
}

function doFlip(userId, amount, direction) {
    const { econData: eData, checkEconUser: ceu, saveEcon: se, addToTreasury: att, trackEarning: te } = require('../../../src/economy/econStore');
    ceu(userId);
    const d = eData[userId];

    if ((d.btc || 0) < amount) return { err: `⚠️ BTC kugu filna ma lihid. Wallet: **₿ ${fmt(d.btc || 0)}**` };

    const win    = Math.random() < WIN_RATE;
    const profit = Math.floor(amount * WIN_MULTI);

    if (win) {
        const netProfit = profit - WIN_TAX;
        d.btc = (d.btc || 0) + netProfit;
        att(WIN_TAX);
        te(userId, netProfit);
    } else {
        d.btc = (d.btc || 0) - amount;
        att(amount);
    }
    se();

    const netProfit = win ? profit - WIN_TAX : profit;
    const dirLabel  = direction === 'u' ? '⬆️ UP' : '⬇️ DOWN';
    return { embed: buildResult(win, dirLabel, netProfit, amount, d.btc || 0) };
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

    if (direction === 'up') direction = 'u';
    if (direction === 'down') direction = 'd';

    if (!amount || isNaN(amount) || amount <= 0 || (direction !== 'u' && direction !== 'd')) {
        return message.reply(`⚠️ Isticmaal: \`?ef 500 u\`  ama  \`?ef 500 d\`\nWallet: **₿ ${fmt(d.btc || 0)}**`);
    }

    if ((d.btc || 0) < amount) {
        return message.reply(`⚠️ BTC kugu filna ma lihid. Wallet: **₿ ${fmt(d.btc || 0)}**`);
    }

    const cdUntil = flipCooldowns.get(userId) || 0;
    const cdLeft  = Math.ceil((cdUntil - Date.now()) / 1000);
    if (cdLeft > 0) {
        return message.reply(`⏳ Sug **${cdLeft}s** kadib isku day.`);
    }

    flipCooldowns.set(userId, Date.now() + COOLDOWN_MS);
    const { err, embed } = doFlip(userId, amount, direction);
    if (err) return message.reply(err);
    return message.reply({ embeds: [embed] });
};

module.exports.WIN_MULTI = WIN_MULTI;
