const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');

const ROB_SUCCESS_RATE   = 0.45;
const ROB_MIN_BTC        = 2_000;
const MAX_STEAL_FRACTION = 0.25;

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

    if (!target)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Usage:** `?rob @user`\n⚠️ Requires a Rob Ticket — buy at `?shop`')
            .setColor('#e74c3c')], components: [closeRow(userId)] });

    if (target.id === userId)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't rob yourself.").setColor('#e74c3c')], components: [closeRow(userId)] });

    if (target.bot)
        return message.reply({ embeds: [new EmbedBuilder().setDescription("⚠️ You can't rob a bot.").setColor('#e74c3c')], components: [closeRow(userId)] });

    checkEconUser(userId);
    checkEconUser(target.id);

    const robber = econData[userId];
    const victim = econData[target.id];

    if (!(robber.inventory.robticketExpiry > Date.now()))
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('⚠️ You need a **Rob Ticket** to rob. Buy one at `?shop` for ₿ 500 (active 3 days).')
            .setColor('#e74c3c')], components: [closeRow(userId)] });

    const today = todayStr();
    if (robber.robsToday.date !== today) robber.robsToday = { date: today, count: 0 };

    if ((victim.btc || 0) < ROB_MIN_BTC)
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ Target doesn't have enough BTC (min **₿ ${ROB_MIN_BTC.toLocaleString()}**).`)
            .setColor('#e74c3c')], components: [closeRow(userId)] });

    if (victim.inventory.safetyExpiry > Date.now()) {
        const hoursLeft = Math.ceil((victim.inventory.safetyExpiry - Date.now()) / 3600000);
        return message.reply(`🛡️ **${target.username}** waxaa ilaaliya Safety Shield — dhac ka dib!\nGaashaanku weli shaqaynayaa: **${hoursLeft}h** active.`);
    }

    robber.robsToday.count += 1;
    const success = Math.random() < ROB_SUCCESS_RATE;

    if (success) {
        const stolen = Math.floor((victim.btc || 0) * MAX_STEAL_FRACTION);
        victim.btc   = (victim.btc || 0) - stolen;
        robber.btc   = (robber.btc || 0) + stolen;
        saveEcon();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🔫 Rob — Success!')
            .setColor('#2ecc71')
            .setDescription(`✅ You robbed **${target.username}** successfully!`)
            .addFields(
                { name: '💰 Stolen',      value: `**+₿ ${stolen.toLocaleString()}**`,                     inline: true },
                { name: '💳 Your Wallet', value: `**₿ ${robber.btc.toLocaleString()}**`,                  inline: true },
            )
            .setFooter({ text: 'Garaad Economy' })], components: [closeRow(userId)] });
    } else {
        const fine = Math.min(500, Math.floor((robber.btc || 0) * 0.10));
        robber.btc = Math.max(0, (robber.btc || 0) - fine);
        saveEcon();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🚔 Rob — Failed!')
            .setColor('#e74c3c')
            .setDescription(`❌ You were caught trying to rob **${target.username}**!`)
            .addFields(
                { name: '💸 Fine',        value: `**-₿ ${fine.toLocaleString()}**`,                       inline: true },
                { name: '💳 Your Wallet', value: `**₿ ${robber.btc.toLocaleString()}**`,                  inline: true },
            )
            .setFooter({ text: 'Garaad Economy' })], components: [closeRow(userId)] });
    }
};
