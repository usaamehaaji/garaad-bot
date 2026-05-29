const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');

const ROB_SUCCESS_RATE   = 0.50;
const ROB_MIN_BTC        = 1_000;
const MAX_STEAL_FRACTION = 0.25;
const ROB_COOLDOWN_MS    = 30 * 60 * 1000;

module.exports = async function robCmd(message) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target) return message.reply('⚠️ Isticmaal: `?rob @user`');
    if (target.id === userId) return message.reply('⚠️ Adigu adiga ma dhici kartid.');
    if (target.bot) return message.reply('⚠️ Bot ma dhici kartid.');

    checkEconUser(userId);
    checkEconUser(target.id);

    const robber = econData[userId];
    const victim = econData[target.id];

    const cooldownLeft = ROB_COOLDOWN_MS - (Date.now() - (robber.lastRob || 0));
    if (cooldownLeft > 0)
        return message.reply(`⏳ **${Math.ceil(cooldownLeft / 60000)} daqiiqo** ka dib isku day.`);

    if ((victim.btc || 0) < ROB_MIN_BTC)
        return message.reply(`⚠️ **${target.username}** lacag ku filan ma hayo (ugu yaraan **₿${ROB_MIN_BTC.toLocaleString()}**).`);

    if ((victim.inventory?.safetyExpiry || 0) > Date.now()) {
        const h = Math.ceil((victim.inventory.safetyExpiry - Date.now()) / 3600000);
        return message.reply(`🛡️ **${target.username}** Safety Shield waxaa ilaaliya — ${h}h haray.`);
    }

    robber.lastRob = Date.now();
    const success  = Math.random() < ROB_SUCCESS_RATE;

    if (success) {
        const stolen = Math.floor((victim.btc || 0) * MAX_STEAL_FRACTION);
        victim.btc  = (victim.btc  || 0) - stolen;
        robber.btc  = (robber.btc  || 0) + stolen;
        saveEcon();
        return message.reply(`🔫 **Guul!** **${target.username}** ayaad dhacday!\n💰 La xaday: **+₿${stolen.toLocaleString()}** | 💳 Lacagtaada: **₿${robber.btc.toLocaleString()}**`);
    } else {
        const penalty = Math.floor((robber.btc || 0) * 0.50);
        robber.btc = Math.max(0, (robber.btc || 0) - penalty);
        saveEcon();
        return message.reply(`🚔 **Fashilmay!** La qabteen — **₿${penalty.toLocaleString()}** (50%) lacagtaadii waa la qaaday!\n💳 Hadhay: **₿${robber.btc.toLocaleString()}**`);
    }
};
