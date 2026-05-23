const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');

const ROB_SUCCESS_RATE   = 0.45;
const ROB_MIN_BTC        = 5_000;
const MAX_STEAL_FRACTION = 0.25;
const MAX_ROBS_PER_DAY   = 3;

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
                .setDescription('**Rob:** `?rob @user`\n⚠️ You need a Rob Ticket — buy one at `?shop`')
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (target.id === userId) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription("⚠️ You can't rob yourself.").setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (target.bot) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription("⚠️ You can't rob a bot.").setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    checkEconUser(userId);
    checkEconUser(target.id);

    const robber = econData[userId];
    const victim = econData[target.id];

    if (!(robber.inventory.robticketExpiry > Date.now())) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('⚠️ You need a **Rob Ticket** to rob. Buy one at `?shop` for 500 BTC (active 2 days).')
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
                .setDescription(`⚠️ You've used all **${MAX_ROBS_PER_DAY} robs** for today. Come back tomorrow.`)
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if ((victim.btc || 0) < ROB_MIN_BTC) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ Target doesn't have enough BTC to rob (min **₿: ${ROB_MIN_BTC.toLocaleString()}**).`)
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (victim.inventory.safetyExpiry > Date.now()) {
        victim.inventory.safetyExpiry = 0;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🛡️ Rob Blocked!')
                .setColor('#f39c12')
                .setDescription(`❌ Target used a **Safety Shield** — rob failed!\n✅ Your ticket was refunded.`)
                .setFooter({ text: 'Garaad Economy' }),
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
                .setTitle('🔫 Rob — Success!')
                .setColor('#2ecc71')
                .setDescription(
                    `✅ You stole **₿: ${stolen.toLocaleString()}** from the target!\n` +
                    `Wallet: **₿: ${(robber.btc).toLocaleString()}**`
                )
                .setFooter({ text: 'Garaad Economy' }),
        ], components: [closeRow(userId)] });
    } else {
        const fine = Math.min(500, Math.floor((robber.btc || 0) * 0.10));
        robber.btc = Math.max(0, (robber.btc || 0) - fine);
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🚔 Rob — Failed!')
                .setColor('#e74c3c')
                .setDescription(
                    `❌ You were caught! Fined **₿: ${fine.toLocaleString()}**.\n` +
                    `Wallet: **₿: ${(robber.btc).toLocaleString()}**`
                )
                .setFooter({ text: 'Garaad Economy' }),
        ], components: [closeRow(userId)] });
    }
};
