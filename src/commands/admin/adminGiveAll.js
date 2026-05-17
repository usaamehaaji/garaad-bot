const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

// ?admin giveall btc 5000
// ?admin giveall gold 5000
module.exports = async function adminGiveAll(message, args) {
    const asset  = (args[0] || '').toLowerCase();
    const amount = Number((args[1] || '').replace(/,/g, ''));

    if (!['btc', 'gold'].includes(asset) || isNaN(amount) || amount <= 0) {
        return message.reply(
            '⚠️ Isticmaal:\n' +
            '`?admin giveall btc 5000`\n' +
            '`?admin giveall gold 5000`'
        );
    }

    const users = Object.keys(econData).filter(k => !k.startsWith('__'));
    for (const uid of users) {
        checkEconUser(uid);
        econData[uid][asset] = (econData[uid][asset] || 0) + amount;
    }
    saveEcon();

    const icon = asset === 'gold' ? '🥇' : '₿';
    return message.reply(
        `✅ **${users.length}** qof kasta wuxuu helay **${icon} +${fmt(amount)} ${asset.toUpperCase()}**`
    );
};
