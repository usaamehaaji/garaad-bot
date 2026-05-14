const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');

const ROB_SUCCESS_RATE   = 0.45;
const ROB_MIN_USD        = 7_000;
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
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function robCmd(message) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('**Rob:** `?rob @user`\n⚠️ Rob Ticket ayaad u baahan tahay! `?buy robticket`')
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (target.id === userId) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription('⚠️ Nafta iskuma xadin kartid.').setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    checkEconUser(userId);
    checkEconUser(target.id);

    const robber = econData[userId];
    const victim = econData[target.id];

    if (robber.inventory.robticket < 1) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('⚠️ Rob Ticket ma lihid! `?buy robticket` ka iibso ($300).')
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
                .setDescription(`⚠️ Maanta ${MAX_ROBS_PER_DAY} rob aad samaynaysay. Berri dib u tijaabi.`)
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    if (victim.usd < ROB_MIN_USD) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ ${target} lacag ku filan ma lahan (min **$${ROB_MIN_USD.toLocaleString()}**). Rob ma faa'idayso.`)
                .setColor('#e74c3c'),
        ], components: [closeRow(userId)] });
    }

    robber.inventory.robticket -= 1;
    robber.robsToday.count    += 1;

    if (victim.inventory.safety > 0) {
        victim.inventory.safety -= 1;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🛡️ Rob — Laga Difaacay!')
                .setColor('#f39c12')
                .setDescription(`❌ ${target} Shield-ka ayuu isticmaalay — rob baa fashilmay!\nTicket-kaagii waa la isticmaalay.`)
                .setFooter({ text: 'Garaad Economy' }),
        ], components: [closeRow(userId)] });
    }

    const success = Math.random() < ROB_SUCCESS_RATE;

    if (success) {
        const stolen = Math.floor(victim.usd * MAX_STEAL_FRACTION);
        victim.usd  -= stolen;
        robber.usd  += stolen;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🔫 Rob — Guulaysatay!')
                .setColor('#2ecc71')
                .setDescription(`✅ **$${stolen.toLocaleString()} USD** ka xaday ${target}!\n💵 USD-kaaga: **$${robber.usd.toLocaleString()}**`)
                .setFooter({ text: 'Garaad Economy' }),
        ], components: [closeRow(userId)] });
    } else {
        const fine  = Math.min(200, Math.floor(robber.usd * 0.1));
        robber.usd  = Math.max(0, robber.usd - fine);
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🚔 Rob — Fashilmay!')
                .setColor('#e74c3c')
                .setDescription(`❌ Rob baa fashilmay! **$${fine} USD** ayaa laga jaray.\n💵 USD-kaaga: **$${robber.usd.toLocaleString()}**`)
                .setFooter({ text: 'Garaad Economy' }),
        ], components: [closeRow(userId)] });
    }
};
