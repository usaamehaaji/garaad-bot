// =====================================================================
// AMARKA: ?admin (router)
// =====================================================================

const { isAdmin }  = require('../../../src/utils/admin');

const broadcast      = require('./adminBroadcast');
const addAdmin       = require('./adminAddAdmin');
const removeAdm      = require('./adminRemoveAdmin');
const listAdm        = require('./adminList');
const bugs           = require('./adminBugs');
const reset          = require('./adminReset');
const dm             = require('./adminDm');
const reward         = require('./adminReward');
const adminHelpPanel = require('./adminHelpPanel');
const giveChampion   = require('./adminGiveChampion');
const removeChampion = require('./adminRemoveChampion');
const godMode        = require('./adminGodMode');
const adminStop      = require('./adminStop');
const adminEconPanel   = require('./adminEconPanel');
const adminEconRestart = require('./adminEconRestart');
const adminGiveAll     = require('./adminGiveAll');

module.exports = async function adminCommand(message, args) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ **Adigu admin maaha.** Si aad u noqotid admin, weydiiso admin kale ku darro liiska.');
    }

    const sub = (args.shift() || 'help').toLowerCase();

    switch (sub) {
        case 'broadcast':
        case 'bc':
        case 'announce':
            return broadcast(message, args);

        case 'add':
            return addAdmin(message, args);

        case 'remove':
        case 'rm':
        case 'del':
            return removeAdm(message, args);

        case 'list':
        case 'ls':
            return listAdm(message, args);

        case 'bugs':
        case 'cilada':
            return bugs(message, args);

        case 'reset':
            return reset(message, args);

        case 'dm':
        case 'message':
            return dm(message, args);

        case 'reward':
        case 'siin':
        case 'gift':
            return reward(message, args);

        case 'givechampion':
        case 'champion':
            return giveChampion(message, args);

        case 'removechampion':
        case 'rmchampion':
            return removeChampion(message, args);

        case 'stop':
            return adminStop(message, args);

        case 'god':
            return godMode(message, args);

        case 'econ':
        case 'economy':
            return adminEconPanel(message, args);

        case 'giveall':
        case 'siidhamaan':
            return adminGiveAll(message, args);

        case 'restart':
        case 'bilow':
            return adminEconRestart(message);

        case 'transfer':
        case 'bank':
        case 'send': {
            const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
            const { fmt } = require('../../../src/utils/helpers');
            const target = message.mentions.users.first();
            const amount = Number((args.find(a => !isNaN(parseFloat(a))) || '').replace(/,/g, ''));
            if (!target) return message.reply('⚠️ Isticmaal: `?admin transfer @user 5000`');
            if (!amount || isNaN(amount) || amount <= 0) return message.reply('⚠️ Lacag sax ah ku qor: `?admin transfer @user 5000`');
            checkEconUser(target.id);
            econData[target.id].banks        ??= { garaad: 0 };
            econData[target.id].banks.garaad ??= 0;
            econData[target.id].banks.garaad  += amount;
            saveEcon();
            return message.reply(`✅ **₿ ${fmt(amount)}** bankiga <@${target.id}> lagu daray.\n🏦 Bangiga hadda: **₿ ${fmt(econData[target.id].banks.garaad)}**`);
        }

        case 'treasury':
        case 'khaznad': {
            const { topUpTreasury, getTreasury, saveEcon } = require('../../../src/economy/econStore');
            const { fmt } = require('../../../src/utils/helpers');
            const amount = Number((args[0] || '').replace(/,/g, ''));
            if (!amount || isNaN(amount) || amount <= 0)
                return message.reply('⚠️ Isticmaal: `?admin treasury 200000000`');
            topUpTreasury(amount);
            saveEcon();
            const t = getTreasury();
            return message.reply(`✅ **₿ ${fmt(amount)}** khaznadda lagu daray.\n🏛️ Hadda: **₿ ${fmt(t.balance)}**`);
        }

        case 'vip': {
            const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
            const target = message.mentions.users.first();
            if (!target) return message.reply('⚠️ Isticmaal: `?admin vip @user`');
            checkEconUser(target.id);
            const d = econData[target.id];
            d.vip = !d.vip;
            saveEcon();
            return message.reply(d.vip
                ? `✅ <@${target.id}> **VIP** noqday — daily cap ma jiro.`
                : `❌ <@${target.id}> VIP la qaatay — cap caadi ah ayuu leeyahay.`
            );
        }

        case 'help':
        default:
            return adminHelpPanel(message);
    }
};
