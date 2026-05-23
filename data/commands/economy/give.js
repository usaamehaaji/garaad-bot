const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { userData, saveData, checkUser, todayKey } = require('../../../src/utils/helpers');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold', iq: '🧠 IQ' };
const IQ_DAILY_LIMIT = 5;

module.exports = async function giveCmd(message, args) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target)
        return message.reply({ embeds: [new EmbedBuilder().setDescription('**Usage:** `?give @user btc 200` or `?give @user iq 3`').setColor('#e74c3c')] });
    if (target.id === userId)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't send to yourself.").setColor('#e74c3c')] });
    if (target.bot)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't send to a bot.").setColor('#e74c3c')] });

    const asset  = (args[1] || '').toLowerCase();
    const amount = parseInt(args[2], 10);

    if (!['btc', 'gold', 'iq'].includes(asset) || isNaN(amount) || amount <= 0)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Usage:** `?give @user btc 200` · `?give @user gold 300` · `?give @user iq 3`')
            .setColor('#e74c3c')] });

    // ── IQ ──
    if (asset === 'iq') {
        checkUser(userId);
        checkUser(target.id);
        const d  = userData[userId];
        const dt = userData[target.id];

        d.iqGivenToday ??= { date: '', count: 0 };
        if (d.iqGivenToday.date !== todayKey()) d.iqGivenToday = { date: todayKey(), count: 0 };

        const remaining = IQ_DAILY_LIMIT - d.iqGivenToday.count;
        if (remaining <= 0)
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription(`⚠️ Daily IQ limit reached **(0/${IQ_DAILY_LIMIT})**. Try again tomorrow.`)
                .setColor('#e74c3c')] });

        const actual = Math.min(amount, remaining);
        if ((d.iq || 0) < actual)
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription(`⚠️ You don't have **${actual} IQ** to send.`)
                .setColor('#e74c3c')] });

        d.iq -= actual;
        dt.iq = (dt.iq || 0) + actual;
        d.iqGivenToday.count += actual;
        saveData();

        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🧠 IQ Sent!')
            .setColor('#2ecc71')
            .setDescription(`**${message.author.username}** → **${target.username}**`)
            .addFields(
                { name: '🧠 Amount',   value: `**${actual} IQ**`,  inline: true },
                { name: '📊 Your IQ', value: `**${d.iq} IQ**`,    inline: true },
                { name: '📊 Their IQ',value: `**${dt.iq} IQ**`,   inline: true },
            )
            .setFooter({ text: `Garaad Economy • ${IQ_DAILY_LIMIT - d.iqGivenToday.count}/${IQ_DAILY_LIMIT} IQ remaining today` })] });
    }

    // ── BTC / Gold ──
    checkEconUser(userId);
    checkEconUser(target.id);
    const d  = econData[userId];
    const dt = econData[target.id];

    if ((d[asset] || 0) < amount)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ You don't have **${fmt(amount)} ${ASSET_LABELS[asset]}** to send.`)
            .setColor('#e74c3c')] });

    d[asset]  = (d[asset]  || 0) - amount;
    dt[asset] = (dt[asset] || 0) + amount;
    saveEcon();

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Transfer Sent!')
        .setColor('#2ecc71')
        .setDescription(`**${message.author.username}** → **${target.username}**`)
        .addFields(
            { name: '💰 Amount',           value: `**${fmt(amount)} ${ASSET_LABELS[asset]}**`,   inline: true },
            { name: '📊 Your Balance',     value: `**${fmt(d[asset])} ${ASSET_LABELS[asset]}**`, inline: true },
            { name: '📊 Their Balance',    value: `**${fmt(dt[asset])} ${ASSET_LABELS[asset]}**`,inline: true },
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
