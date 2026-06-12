const { EmbedBuilder } = require('discord.js');
const { hagbadData, saveHagbad } = require('../../../src/economy/hagbadStore');
const { econData, saveEcon, checkEconUser } = require('../../../src/economy/econStore');

const DAILY_CONTRIBUTION = 1000;

module.exports = async function hagbadCommand(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);

    const subCommand = args[0] ? args[0].toLowerCase() : '';
    const groupName = args[1] ? args[1].toLowerCase() : '';

    if (!subCommand || !['create', 'join', 'leave', 'pay', 'status'].includes(subCommand)) {
        return message.reply('📝 **Hagbad Commands:**\n`?hagbad create <name>`\n`?hagbad join <name>`\n`?hagbad leave <name>`\n`?hagbad pay <name>`\n`?hagbad status <name>`');
    }

    if (!groupName) {
        return message.reply('⚠️ Please provide a group name. Example: `?hagbad join saxibada`');
    }

    // CREATE
    if (subCommand === 'create') {
        if (hagbadData[groupName]) {
            return message.reply(`⚠️ Hagbad group **${groupName}** already exists!`);
        }
        hagbadData[groupName] = {
            creator: userId,
            members: [userId],
            payments: {}, // userId -> lastPaymentTimestamp
            payoutQueue: [userId],
            currentTurn: 0, // index in payoutQueue
            pot: 0
        };
        saveHagbad();
        return message.reply(`✅ Hagbad group **${groupName}** created! You are the first member. Others can join using \`?hagbad join ${groupName}\`.`);
    }

    // Ensure group exists for other commands
    const group = hagbadData[groupName];
    if (!group) {
        return message.reply(`⚠️ Hagbad group **${groupName}** does not exist.`);
    }

    // JOIN
    if (subCommand === 'join') {
        if (group.members.includes(userId)) {
            return message.reply(`⚠️ You are already in **${groupName}**!`);
        }
        group.members.push(userId);
        group.payoutQueue.push(userId);
        saveHagbad();
        return message.reply(`✅ You have successfully joined the hagbad group **${groupName}**! Remember to pay ${DAILY_CONTRIBUTION} BTC daily.`);
    }

    // LEAVE
    if (subCommand === 'leave') {
        if (!group.members.includes(userId)) {
            return message.reply(`⚠️ You are not in **${groupName}**.`);
        }
        if (group.creator === userId && group.members.length > 1) {
            return message.reply('⚠️ The creator cannot leave unless they are the only member. Pass ownership first or dissolve the group.');
        }
        group.members = group.members.filter(id => id !== userId);
        group.payoutQueue = group.payoutQueue.filter(id => id !== userId);
        
        // Reset currentTurn if it goes out of bounds
        if (group.currentTurn >= group.payoutQueue.length) {
            group.currentTurn = 0;
        }

        if (group.members.length === 0) {
            delete hagbadData[groupName];
            saveHagbad();
            return message.reply(`🗑️ Hagbad group **${groupName}** has been deleted because it has no members left.`);
        }
        
        saveHagbad();
        return message.reply(`✅ You have left **${groupName}**.`);
    }

    // PAY
    if (subCommand === 'pay') {
        if (!group.members.includes(userId)) {
            return message.reply(`⚠️ You must join **${groupName}** first before paying.`);
        }

        const lastPayment = group.payments[userId] || 0;
        const now = Date.now();
        
        // Ensure they haven't paid today (using a 20 hour cooldown to be safe for daily)
        if (now - lastPayment < 20 * 60 * 60 * 1000) {
            return message.reply(`⏳ You already paid your contribution for today. Next payment is available tomorrow.`);
        }

        const userBtc = econData[userId].btc || 0;
        if (userBtc < DAILY_CONTRIBUTION) {
            return message.reply(`❌ You need **${DAILY_CONTRIBUTION} BTC** to pay the hagbad, but you only have **${userBtc} BTC**.`);
        }

        // Deduct BTC and add to pot
        econData[userId].btc -= DAILY_CONTRIBUTION;
        saveEcon();

        group.payments[userId] = now;
        group.pot += DAILY_CONTRIBUTION;

        // Check if everyone has paid today (simplified check: has everyone paid in the last 20 hours?)
        let allPaid = true;
        for (const memberId of group.members) {
            const mPay = group.payments[memberId] || 0;
            if (now - mPay > 24 * 60 * 60 * 1000) { // If someone hasn't paid in last 24h
                allPaid = false;
                break;
            }
        }

        // Rotate payout if everyone paid
        let payoutMsg = '';
        if (allPaid && group.members.length > 1) {
            const winnerId = group.payoutQueue[group.currentTurn];
            const potAmount = group.pot;
            
            // Give pot to winner
            checkEconUser(winnerId);
            econData[winnerId].btc = (econData[winnerId].btc || 0) + potAmount;
            saveEcon();

            payoutMsg = `\n🎉 **PAYOUT TIME!** Everyone has paid. <@${winnerId}> receives the pot of **${potAmount} BTC**!`;

            // Reset pot and advance turn
            group.pot = 0;
            group.currentTurn = (group.currentTurn + 1) % group.payoutQueue.length;
            
            // Reset payments so they can pay again next cycle
            group.payments = {};
        }

        saveHagbad();
        return message.reply(`✅ You successfully paid **${DAILY_CONTRIBUTION} BTC** to the **${groupName}** pot. The pot is now **${group.pot} BTC**.${payoutMsg}`);
    }

    // STATUS
    if (subCommand === 'status') {
        const turnUserId = group.payoutQueue[group.currentTurn];
        const memberTags = group.members.map(id => {
            const mPay = group.payments[id] || 0;
            const hasPaid = (Date.now() - mPay < 20 * 60 * 60 * 1000);
            return `<@${id}> - ${hasPaid ? '✅ Paid' : '❌ Unpaid'}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`💰 Hagbad: ${groupName.toUpperCase()}`)
            .setColor('#f1c40f')
            .addFields(
                { name: '👥 Members', value: memberTags || 'None', inline: false },
                { name: '🏦 Current Pot', value: `${group.pot} BTC`, inline: true },
                { name: '🔄 Next Payout To', value: turnUserId ? `<@${turnUserId}>` : 'None', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }
};
