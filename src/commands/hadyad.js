const { userData, saveData } = require('../store');
const { checkUser } = require('../utils/helpers');

module.exports = async function hadyadCommand(message, args) {
    const senderId = message.author.id;
    checkUser(senderId);

    const target = message.mentions.users.first();
    if (!target) {
        return message.reply('Fadlan sheeg qofka aad cash u dirayso: `?hadyad @user 100` (ama isticmaal `?give`).');
    }

    const targetId = target.id;
    if (targetId === senderId) {
        return message.reply('Ma isugu diri kartid naftaada hadiyad.');
    }

    const amountArg = args.find((arg) => /^\d+(\.\d+)?$/.test(arg));
    const amount = amountArg ? Number(amountArg) : 0;

    if (!amount || amount <= 0) {
        return message.reply('Fadlan geli qaddar sax ah. Tusaale: `?hadyad @user 100`.');
    }

    const sender = userData[senderId];
    checkUser(targetId);
    sender.cash ??= Number.isFinite(sender.usdBalance) ? sender.usdBalance : 0;
    userData[targetId].cash ??= Number.isFinite(userData[targetId].usdBalance) ? userData[targetId].usdBalance : 0;

    if ((sender.cash || 0) < amount) {
        return message.reply('Ma haysatid cash ku filan si aad u dirto hadiyad.');
    }
    sender.cash -= amount;
    userData[targetId].cash += amount;

    saveData();
    return message.reply(`🎁 Hadiyad ayaa la diray: **$${amount.toFixed(2)} cash** loo diray <@${targetId}>.`);
};
