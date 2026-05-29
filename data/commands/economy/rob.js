const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');

const ROB_SUCCESS_RATE   = 0.50;
const ROB_MIN_BTC        = 1_000;
const MAX_STEAL_FRACTION = 0.25;
const ROB_COOLDOWN_MS    = 30 * 60 * 1000;

module.exports = async function robCmd(message) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target)
        return message.reply('⚠️ Isticmaal: `?rob @user`');

    if (target.id === userId)
        return message.reply('⚠️ Adigu adiga ma dhici kartid.');

    if (target.bot)
        return message.reply('⚠️ Bot ma dhici kartid.');

    checkEconUser(userId);
    checkEconUser(target.id);

    const robber = econData[userId];
    const victim = econData[target.id];

    // Cooldown check
    const lastRob = robber.lastRob || 0;
    const cooldownLeft = ROB_COOLDOWN_MS - (Date.now() - lastRob);
    if (cooldownLeft > 0) {
        const mins = Math.ceil(cooldownLeft / 60000);
        return message.reply(`⏳ **${mins} daqiiqo** ka dib isku day. Weli cooldown-ka ayaad joogtaa.`);
    }

    // Target must have enough BTC
    if ((victim.btc || 0) < ROB_MIN_BTC)
        return message.reply({ embeds: [new EmbedBuilder()
            .setColor('#e74c3c')
            .setDescription(`⚠️ **${target.username}** lacag ku filan ma hayo (ugu yaraan **₿${ROB_MIN_BTC.toLocaleString()}** ayaa looga baahan yahay).`)
        ] });

    // Shield check
    if ((victim.inventory?.safetyExpiry || 0) > Date.now()) {
        const hoursLeft = Math.ceil(((victim.inventory.safetyExpiry) - Date.now()) / 3600000);
        return message.reply({ embeds: [new EmbedBuilder()
            .setColor('#3498db')
            .setDescription(`🛡️ **${target.username}** waxaa ilaaliya **Safety Shield** — ${hoursLeft}h haray.\nDhac kari maysid!`)
        ] });
    }

    robber.lastRob = Date.now();
    const success  = Math.random() < ROB_SUCCESS_RATE;

    if (success) {
        const stolen = Math.floor((victim.btc || 0) * MAX_STEAL_FRACTION);
        victim.btc  = (victim.btc  || 0) - stolen;
        robber.btc  = (robber.btc  || 0) + stolen;
        saveEcon();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🔫 Rob — Guul!')
            .setColor('#2ecc71')
            .setDescription(`✅ **${target.username}** si guul leh ayaad u dhacday!`)
            .addFields(
                { name: '💰 La xaday',     value: `**+₿${stolen.toLocaleString()}**`,        inline: true },
                { name: '💳 Lacagtaada',   value: `**₿${robber.btc.toLocaleString()}**`,      inline: true },
                { name: '😢 Dhibbanaha',   value: `**₿${victim.btc.toLocaleString()}** haray`, inline: true },
            )
            .setFooter({ text: '30 daqiiqo ka dib mar labaad isku day' })
        ] });
    } else {
        const penalty = Math.floor((robber.btc || 0) * 0.50);
        robber.btc = Math.max(0, (robber.btc || 0) - penalty);
        saveEcon();
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🚔 Rob — Fashilmay!')
            .setColor('#e74c3c')
            .setDescription(`❌ La qabteen iyadoo la isku dayayo in **${target.username}** la dhaco!`)
            .addFields(
                { name: '💸 Xanaaqsan',    value: `**-₿${penalty.toLocaleString()}**`,        inline: true },
                { name: '💳 Lacagtaada',   value: `**₿${robber.btc.toLocaleString()}**`,      inline: true },
            )
            .setFooter({ text: '50% lacagtaadii waa la qaaday!' })
        ] });
    }
};
