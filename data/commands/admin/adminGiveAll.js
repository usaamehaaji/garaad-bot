const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

// ?admin giveall btc 5000
module.exports = async function adminGiveAll(message, args) {
    const asset  = (args[0] || '').toLowerCase();
    const amount = Number((args[1] || '').replace(/,/g, ''));

    if (asset !== 'btc' || isNaN(amount) || amount <= 0) {
        return message.reply('⚠️ Usage: `?admin giveall btc 5000`');
    }

    const users = Object.keys(econData).filter(k => !k.startsWith('__'));
    for (const uid of users) {
        checkEconUser(uid);
        econData[uid].btc = (econData[uid].btc || 0) + amount;
    }
    saveEcon();

    return message.reply(`✅ **${users.length}** players each received **₿ +${fmt(amount)} BTC**`);
};
