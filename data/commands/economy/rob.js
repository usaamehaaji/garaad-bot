const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');

const ROB_SUCCESS_RATE   = 0.45;
const ROB_MIN_BTC        = 2_000;
const MAX_STEAL_FRACTION = 0.25;
const MAX_ROBS_PER_DAY   = 5;

const txRef  = () => '#ROB-' + Math.random().toString(36).slice(2,8).toUpperCase();
const txDate = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_rob_${userId}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function robCmd(message) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('**Rob:** `?rob @user`\n⚠️ Rob Ticket ku baahan tahay — ka iibso `?shop`')
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (target.id === userId) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription('⚠️ Adiga nafta kuma xadin kartid.').setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (target.bot) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription('⚠️ Bot-ka xadin karo.').setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    checkEconUser(userId);
    checkEconUser(target.id);

    const robber = econData[userId];
    const victim = econData[target.id];

    if (!(robber.inventory.robticketExpiry > Date.now())) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('⚠️ **Rob Ticket** ma lihid. Ka iibso `?shop` — 500 BTC (2 maalmood active).')
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    const today = todayStr();
    if (robber.robsToday.date !== today) {
        robber.robsToday = { date: today, count: 0 };
    }
    if (robber.robsToday.count >= MAX_ROBS_PER_DAY) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ Maanta **${MAX_ROBS_PER_DAY} rob** oo dhan baad isticmaashay. Berri isku day.`)
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if ((victim.btc || 0) < ROB_MIN_BTC) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ Target-ku lacag ku filan ma lahan (min **₿ ${ROB_MIN_BTC.toLocaleString()}**).`)
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (victim.inventory.safetyExpiry > Date.now()) {
        victim.inventory.safetyExpiry = 0;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🏦 GARAAD SECURITY — Incident Report')
                .setColor('#f39c12')
                .addFields(
                    { name: '📋 Type',      value: '🛡️ ROB BLOCKED',                        inline: true },
                    { name: '🔖 Reference', value: `\`${txRef()}\``,                          inline: true },
                    { name: '📅 Date',      value: txDate(),                                   inline: true },
                    { name: '🎯 Target',    value: `**${target.username}**\n<@${target.id}>`, inline: true },
                    { name: '🛡️ Status',    value: 'Safety Shield activated',                 inline: true },
                    { name: '💳 Outcome',   value: 'Rob failed — shield consumed',            inline: true },
                )
                .setFooter({ text: 'Garaad Security • Safety Shield protected the target' }),
        ], components: [closeRow(userId)] });
    }

    robber.robsToday.count += 1;
    const success = Math.random() < ROB_SUCCESS_RATE;

    if (success) {
        const stolen = Math.floor((victim.btc || 0) * MAX_STEAL_FRACTION);
        victim.btc   = (victim.btc || 0) - stolen;
        robber.btc   = (robber.btc || 0) + stolen;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🏦 GARAAD SECURITY — Incident Report')
                .setColor('#27ae60')
                .addFields(
                    { name: '📋 Type',        value: '🔫 ROBBERY',                                     inline: true },
                    { name: '🔖 Reference',   value: `\`${txRef()}\``,                                  inline: true },
                    { name: '📅 Date',        value: txDate(),                                           inline: true },
                    { name: '🦹 Robber',      value: `**${message.author.username}**\n<@${userId}>`,     inline: true },
                    { name: '🎯 Victim',      value: `**${target.username}**\n<@${target.id}>`,          inline: true },
                    { name: '✅ Status',      value: '**SUCCESS**',                                      inline: true },
                    { name: '💰 Stolen',      value: `**+₿ ${stolen.toLocaleString()}**`,               inline: true },
                    { name: '💳 Your Wallet', value: `**₿ ${robber.btc.toLocaleString()}**`,            inline: true },
                    { name: '📊 Robs Today',  value: `${robber.robsToday.count}/${MAX_ROBS_PER_DAY}`,   inline: true },
                )
                .setFooter({ text: 'Garaad Security • Robbery Report' }),
        ], components: [closeRow(userId)] });
    } else {
        const fine = Math.min(500, Math.floor((robber.btc || 0) * 0.10));
        robber.btc = Math.max(0, (robber.btc || 0) - fine);
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🏦 GARAAD SECURITY — Incident Report')
                .setColor('#c0392b')
                .addFields(
                    { name: '📋 Type',        value: '🚔 ROBBERY ATTEMPT',                              inline: true },
                    { name: '🔖 Reference',   value: `\`${txRef()}\``,                                  inline: true },
                    { name: '📅 Date',        value: txDate(),                                           inline: true },
                    { name: '🦹 Suspect',     value: `**${message.author.username}**\n<@${userId}>`,     inline: true },
                    { name: '🎯 Target',      value: `**${target.username}**\n<@${target.id}>`,          inline: true },
                    { name: '❌ Status',      value: '**ARRESTED**',                                     inline: true },
                    { name: '💸 Fine',        value: `**-₿ ${fine.toLocaleString()}**`,                 inline: true },
                    { name: '💳 Your Wallet', value: `**₿ ${robber.btc.toLocaleString()}**`,            inline: true },
                    { name: '📊 Robs Today',  value: `${robber.robsToday.count}/${MAX_ROBS_PER_DAY}`,   inline: true },
                )
                .setFooter({ text: 'Garaad Security • You were caught and fined' }),
        ], components: [closeRow(userId)] });
    }
};
