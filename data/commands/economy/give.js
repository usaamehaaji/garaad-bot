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
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🧠 IQ La Diray!')
            .setColor('#2ecc71')
            .setDescription(
                `✅ **${actualAmount} IQ** waxaad u diray <@${target.id}>\n\n` +
                `Maanta kuu hadhay: **${newRemaining}/${IQ_DAILY_LIMIT} IQ**`
            )
            .setFooter({ text: 'Garaad Economy' })] });
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

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Lacag La Diray!')
        .setColor('#2ecc71')
        .addFields(
            { name: '📤 Diray',    value: `<@${userId}>`,   inline: true },
            { name: '📥 Helay',    value: `<@${target.id}>`, inline: true },
            { name: '​',      value: '​',           inline: true },
            { name: '💰 Xaddadka', value: `**${fmt(amount)} ${ASSET_LABELS[asset]}**`, inline: true },
            { name: '📊 Hadhkiisa', value: `**${fmt(d[asset])} ${ASSET_LABELS[asset]}**`, inline: true },
            { name: '📈 Cusub',    value: `**${fmt(dt[asset])} ${ASSET_LABELS[asset]}**`, inline: true },
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
