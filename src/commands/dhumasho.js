const { userData, saveData } = require('../store');
const { checkUser } = require('../utils/helpers');

module.exports = async function dhumashoCommand(message) {
    const userId = message.author.id;
    checkUser(userId);

    const user = userData[userId];
    user.cash ??= Number.isFinite(user.usdBalance) ? user.usdBalance : 0;
    const cost = 100;
    if ((user.cash || 0) < cost) {
        return message.reply('Ma haysatid cash ku filan si aad u qariso jeebkaaga. Waxaa loo baahan yahay $100 cash.');
    }

    user.cash -= cost;
    user.hiddenUntil = Date.now() + 60 * 60 * 1000;
    saveData();

    return message.reply('🛡️ Jeebkaaga waa la qariyey 1 saac. Xatooyo hadda kama xadi karto cash-kaaga.');
};
