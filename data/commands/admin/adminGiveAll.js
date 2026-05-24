const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { userData, saveData }                = require('../../../src/store');
const { checkUser, fmt }                    = require('../../../src/utils/helpers');

// ?admin giveall btc 5000  /  ?admin giveall iq 100
module.exports = async function adminGiveAll(message, args) {
    const asset  = (args[0] || '').toLowerCase();
    const amount = Number((args[1] || '').replace(/,/g, ''));

    if ((asset !== 'btc' && asset !== 'iq') || isNaN(amount) || amount <= 0) {
        return message.reply('⚠️ Usage: `?admin giveall btc 5000`  or  `?admin giveall iq 100`');
    }

    if (asset === 'iq') {
        const users = Object.keys(userData);
        for (const uid of users) {
            checkUser(uid);
            userData[uid].iq = (userData[uid].iq || 0) + amount;
        }
        saveData();
        return message.reply(`✅ **${users.length}** players each received **+${amount} IQ**`);
    }

    const users = Object.keys(econData).filter(k => !k.startsWith('__'));
    for (const uid of users) {
        checkEconUser(uid);
        econData[uid].btc = (econData[uid].btc || 0) + amount;
    }
    saveEcon();

    return message.reply(`✅ **${users.length}** players each received **₿ +${fmt(amount)} BTC**`);
};
