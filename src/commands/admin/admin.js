// =====================================================================
// AMARKA: ?admin (router)
// =====================================================================

const { isAdmin }  = require('../../utils/admin');

const broadcast = require('./adminBroadcast');
const addAdmin  = require('./adminAddAdmin');
const removeAdm = require('./adminRemoveAdmin');
const listAdm   = require('./adminList');
const bugs      = require('./adminBugs');
const reset     = require('./adminReset');
const dm        = require('./adminDm');
const reward    = require('./adminReward');
const adminHelpPanel = require('./adminHelpPanel');
const giveChampion = require('./adminGiveChampion');
const removeChampion = require('./adminRemoveChampion');
const godMode = require('./adminGodMode');
const adminStop = require('./adminStop');

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

        case 'help':
        default:
            return adminHelpPanel(message);
    }
};
