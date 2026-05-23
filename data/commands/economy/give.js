const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { userData, saveData, checkUser, todayKey } = require('../../../src/utils/helpers');
const { fmt } = require('../../../src/utils/helpers');

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold', iq: '🧠 IQ' };
const IQ_DAILY_LIMIT = 5;

module.exports = async function giveCmd(message, args) {
    const userId  = message.author.id;
    const target  = message.mentions.users.first();

    if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('**Isticmaal:** `?give @user btc 200` ama `?give @user iq 3`').setColor('#e74c3c')] });
    }

    if (target.id === userId) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ Adiga naftu lacag uma dirin kartid.').setColor('#e74c3c')] });
    }

    if (target.bot) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ Bot-ka lacag uma dirin kartid.').setColor('#e74c3c')] });
    }

    const asset  = (args[1] || '').toLowerCase();
    const amount = parseInt(args[2], 10);

    if (!['btc', 'gold', 'iq'].includes(asset) || isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Isticmaal:** `?give @user btc 200` ama `?give @user gold 300` ama `?give @user iq 3`')
            .setColor('#e74c3c')] });
    }

    // ── IQ give ──
    if (asset === 'iq') {
        checkUser(userId);
        checkUser(target.id);
        const d  = userData[userId];
        const dt = userData[target.id];

        // Daily limit tracking
        d.iqGivenToday ??= { date: '', count: 0 };
        if (d.iqGivenToday.date !== todayKey()) {
            d.iqGivenToday = { date: todayKey(), count: 0 };
        }

        const remaining = IQ_DAILY_LIMIT - d.iqGivenToday.count;
        if (remaining <= 0) {
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription(`⚠️ Maanta IQ-ga aad bixin karto waa dhammaatay. **(0/${IQ_DAILY_LIMIT})** — berri isku day.`)
                .setColor('#e74c3c')] });
        }

        const actualAmount = Math.min(amount, remaining);

        if ((d.iq || 0) < actualAmount) {
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription(`⚠️ Ma haysid **${actualAmount} IQ** si aad u dirtid.`)
                .setColor('#e74c3c')] });
        }

        d.iq -= actualAmount;
        dt.iq = (dt.iq || 0) + actualAmount;
        d.iqGivenToday.count += actualAmount;
        saveData();

        const newRemaining = IQ_DAILY_LIMIT - d.iqGivenToday.count;
        const txRef = '#GVE-' + Math.random().toString(36).slice(2,8).toUpperCase();
        const txDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🏦 GARAAD BANK — Transfer Receipt')
            .setColor('#27ae60')
            .addFields(
                { name: '📋 Type',        value: '🧠 IQ TRANSFER',                                     inline: true },
                { name: '🔖 Reference',   value: `\`${txRef}\``,                                        inline: true },
                { name: '📅 Date',        value: txDate,                                                 inline: true },
                { name: '📤 Sender',      value: `**${message.author.username}**\n<@${userId}>`,         inline: true },
                { name: '📥 Receiver',    value: `**${target.username}**\n<@${target.id}>`,              inline: true },
                { name: '✅ Amount',      value: `**${actualAmount} 🧠 IQ**`,                            inline: true },
                { name: '📊 Sender IQ',   value: `**${d.iq} IQ**`,                                      inline: true },
                { name: '📊 Receiver IQ', value: `**${dt.iq} IQ**`,                                     inline: true },
                { name: '⏳ Daily Limit', value: `${newRemaining}/${IQ_DAILY_LIMIT} remaining today`,    inline: true },
            )
            .setFooter({ text: 'Garaad Economy • IQ transfers limited to 5 per day' })] });
    }

    // ── BTC / Gold give ──
    checkEconUser(userId);
    checkEconUser(target.id);
    const d  = econData[userId];
    const dt = econData[target.id];

    if ((d[asset] || 0) < amount) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ Ma haysid **${fmt(amount)} ${ASSET_LABELS[asset]}** si aad u dirtid.`)
            .setColor('#e74c3c')] });
    }

    d[asset]  = (d[asset]  || 0) - amount;
    dt[asset] = (dt[asset] || 0) + amount;
    saveEcon();

    const txRef  = '#GVE-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const txDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🏦 GARAAD BANK — Transfer Receipt')
        .setColor('#27ae60')
        .addFields(
            { name: '📋 Type',           value: `${asset === 'btc' ? '₿ BTC' : '🥇 GOLD'} TRANSFER`,   inline: true },
            { name: '🔖 Reference',      value: `\`${txRef}\``,                                          inline: true },
            { name: '📅 Date',           value: txDate,                                                   inline: true },
            { name: '📤 Sender',         value: `**${message.author.username}**\n<@${userId}>`,           inline: true },
            { name: '📥 Receiver',       value: `**${target.username}**\n<@${target.id}>`,                inline: true },
            { name: '✅ Amount',         value: `**${fmt(amount)} ${ASSET_LABELS[asset]}**`,              inline: true },
            { name: `📊 Sender Balance`, value: `**${fmt(d[asset])} ${ASSET_LABELS[asset]}**`,            inline: true },
            { name: `📊 Receiver Balance`,value: `**${fmt(dt[asset])} ${ASSET_LABELS[asset]}**`,          inline: true },
            { name: '​',            value: '​',                                                    inline: true },
        )
        .setFooter({ text: 'Garaad Economy • Peer-to-peer transfer' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
