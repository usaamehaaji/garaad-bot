// =====================================================================
// GARAAD BOT - Maareynta Farriimaha (Message Handler)
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { PREFIX } = require('../config');
const { checkUser }   = require('../utils/helpers');
const { isAdmin }     = require('../utils/admin');
const { setEconUsername } = require('../economy/econStore');

const helpCmd         = require('../../data/commands/help');

const profileCmd      = require('../../data/commands/profile');

const topCmd          = require('../../data/commands/top');
const { topIqCmd, topBtcCmd, topMissionsCmd, topStreakCmd, topFlipsCmd, topDuelsCmd } = require('../../data/commands/top');
const todayCmd        = require('../../data/commands/today');
const showCmd         = require('../../data/commands/show');

const buyCmd          = require('../../data/commands/buy');
const soloCmd         = require('../../data/commands/solo');
const duelCmd         = require('../../data/commands/duel');
const quizCmd         = require('../../data/commands/quiz');
const ciladaCmd       = require('../../data/commands/cilada');
const adminCmd        = require('../../data/commands/admin/admin');
const broadcast       = require('../../data/commands/admin/adminBroadcast');
const djCmd           = require('../../data/commands/admin/adminDj');
const tournament      = require('../games/tournament');
const teamDuel        = require('../games/teamDuel');

// ── Economy ──

const jeebCmd         = require('../../data/commands/economy/jeeb');
const tradeCmd        = require('../../data/commands/economy/trade');
const robCmd          = require('../../data/commands/economy/rob');
const cashflipCmd     = require('../../data/commands/economy/cashflip');
const giveCmd         = require('../../data/commands/economy/give');
const richCmd         = require('../../data/commands/economy/rich');
const ebankCmd        = require('../../data/commands/economy/ebank');
const treasuryCmdFn   = require('../../data/commands/economy/treasuryCmd');

const shaqoCmd        = require('../../data/commands/economy/shaqo');
const bankListCmd     = require('../../data/commands/economy/bankList');
const econTitleCmd    = require('../../data/commands/economy/econTitle');
const dmCmd           = require('../../data/commands/dm');
const ciidCmd         = require('../../data/commands/admin/ciidCmd');
const missionsCmd     = require('../../data/commands/missions');
const giveItemCmd     = require('../../data/commands/admin/giveItem');
const lootboxCmd      = require('../../data/commands/lootbox');
const shopCmd         = require('../../data/commands/shopCmd');
const { inventoryCmd, equipCmd, sellCmd } = require('../../data/commands/inventory');
const { friendCmd, unfriendCmd, friendsListCmd, proposeCmd, partnerCmd, breakupCmd } = require('../../data/commands/relationship');
const personalCmd = require('../../data/commands/personal');
const { bankCreateCmd, bankPasswordCmd, bankViewCmd, depositCmd, withdrawCmd, bankSendCmd } = require('../../data/commands/economy/personalBank');
const { createPublicBankCmd, listPublicBanksCmd, bankInfoCmd, bankDepositCmd, bankWithdrawCmd, bankPasswordCmd: pubBankPwCmd, topBanksCmd } = require('../../data/commands/economy/publicBank');
const { companyCreateCmd, companyViewCmd, companyHireCmd, companyFireCmd, companyEmployeesCmd, companyDepositCmd, companyWithdrawCmd, companyTransferCmd, companyPasswordCmd, topCompaniesCmd, companyInvestCmd } = require('../../data/commands/company');
const { getDisTube } = require('../music/disTubeSetup');
const werewolfCmd     = require('../../data/commands/werewolf');
const passwordCmd     = require('../../data/commands/password');
const accessCmd       = require('../../data/commands/access');
const adminBankCmd    = require('../../data/commands/admin/adminBank');
const investCmd       = require('../../data/commands/economy/invest');


let _music = null;
let _musicErr = '';
function getMusic() {
    if (!_music) {
        try {
            _music = require('../../data/commands/music');
            _musicErr = '';
        } catch (e) {
            _musicErr = e.message;
            console.error('[Music] Load error:', e.message);
        }
    }
    return _music;
}

module.exports = function setupMessageHandler(client) {
    // ── Rate limiter: max 6 economy commands per 10s per user ──
    const _econRateMap = new Map();
    const ECON_CMDS    = new Set(['shaqo','work','jeeb','trade','ecoflip','ef','give','rich','ebank','bank','etitle']);
    function econRateLimited(userId) {
        const now    = Date.now();
        const bucket = _econRateMap.get(userId) || { count: 0, reset: now + 10_000 };
        if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + 10_000; }
        bucket.count++;
        _econRateMap.set(userId, bucket);
        return bucket.count > 6;
    }

    client.on('messageCreate', async (message) => {
        if (message.author.bot)                  return;
        if (!message.content.startsWith(PREFIX)) return;

        const args    = message.content.slice(PREFIX.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();
        const userId  = message.author.id;

        // DM-ka: admin wax walba, players ?caawin kaliya
        if (!message.guild && !isAdmin(userId)) {
            if (command !== 'caawin' && command !== 'caaawin' && command !== 'help') {
                return message.reply(
                    `⛔ Amarkan DM-ka kama shaqeeyo.\n\n` +
                    `📍 Tag **server-kaaga** oo halkaas ku isticmaal, ama ku biir server-kan:\n` +
                    `🔗 **https://discord.gg/FyNKRyAKc9**\n\n` +
                    `_(Haddaad u baahan tahay caawimad, isticmaal \`?caawin\`)_`
                ).catch(() => {});
            }
        }

        checkUser(userId);

        if (ECON_CMDS.has(command)) setEconUsername(userId, message.author.username);

        if (ECON_CMDS.has(command) && !isAdmin(userId) && econRateLimited(userId))
            return message.reply('⏳ Aad u dhaqso. Daqiiqad yar sug.').catch(() => {});

        switch (command) {
            // ── Caawinaad ──
            case 'caawin':
            case 'caaawin':
            case 'help':
                return helpCmd(message);

            // ── Profile & Stats ──
            case 'profile':
            case 'p':
                return profileCmd(message);



            case 'top':
            case 'topiq':
                return (command === 'topiq') ? topIqCmd(message) : topCmd(message, args);

            case 'topbtc':        return topBtcCmd(message);
            case 'topmissions':   return topMissionsCmd(message);
            case 'topstreak':     return topStreakCmd(message);
            case 'topflips':      return topFlipsCmd(message);
            case 'topduels':      return topDuelsCmd(message);

            case 'today':
                return todayCmd(message);

            case 'show':
            case 'cooldown':
            case 'cooldowns':
                return showCmd(message);

            case 'buy':
                return buyCmd(message, args);

            // ── Ciyaaraha Aqoonta ──
            case 'solo':
                return soloCmd(message, args);

            case 'duel':
                return duelCmd(message, args);

            case 'quiz':
            case 'team':
                return quizCmd(message, args);

            // ── Economy ──
            case 'shaqo':
            case 'work':
                return shaqoCmd(message);

            case 'jeeb':
                return jeebCmd(message, args);


            case 'rob':
                return robCmd(message);

            case 'trade':
                return tradeCmd(message, args);

            case 'ecoflip':
            case 'ef':
                return cashflipCmd(message, args);

            case 'give':
                return giveCmd(message, args);

            case 'rich':
                return richCmd(message);

            case 'list':
                return bankListCmd(message);

            case 'etitle':
                return econTitleCmd(message, args);

            case 'ebank':
                return ebankCmd(message, args);

            // ── Personal Bank ──
            case 'bank':
                if (args[0] === 'create') return bankCreateCmd(message);
                return bankViewCmd(message);

            case 'bp':
                return bankPasswordCmd(message, args);

            case 'deposit':
                return depositCmd(message, args);

            case 'withdraw':
                return withdrawCmd(message, args);

            case 'banksend':
                return bankSendCmd(message, args);

            // ── Public Banks ──
            case 'createbank':
                return createPublicBankCmd(message, args);

            case 'banks':
                return listPublicBanksCmd(message);

            case 'bankinfo':
                return bankInfoCmd(message, args);

            case 'bankdeposit':
                return bankDepositCmd(message, args);

            case 'bankwithdraw':
                return bankWithdrawCmd(message, args);

            case 'bankpassword':
                return pubBankPwCmd(message, args);

            case 'topbanks':
                return topBanksCmd(message);

            // ── Companies ──
            case 'company': {
                const sub = (args[0] || '').toLowerCase();
                if (sub === 'create')    return companyCreateCmd(message, args.slice(1));
                if (sub === 'hire')      return companyHireCmd(message);
                if (sub === 'fire')      return companyFireCmd(message);
                if (sub === 'employees') return companyEmployeesCmd(message);
                if (sub === 'deposit')   return companyDepositCmd(message, args.slice(1));
                if (sub === 'withdraw')  return companyWithdrawCmd(message, args.slice(1));
                if (sub === 'transfer')  return companyTransferCmd(message, args.slice(1));
                if (sub === 'password')  return companyPasswordCmd(message, args.slice(1));
                if (sub === 'invest')    return companyInvestCmd(message, args.slice(1));
                return companyViewCmd(message);
            }

            case 'topcompanies':
                return topCompaniesCmd(message);

            case 'treasury':
            case 'khaznad':
                return treasuryCmdFn(message);

            case 'ciid':
                return ciidCmd.sendEidToChannel(message);

            // ── Shop & Items ──
            case 'shop':
                return shopCmd(message, args);

            case 'open':
                return lootboxCmd(message, args);

            case 'inventory':
            case 'inv':
                return inventoryCmd(message);

            case 'equip':
                return equipCmd(message, args);

            case 'sell':
                return sellCmd(message, args);

            // ── Personal / Relationship ──
            case 'personal':
                return personalCmd(message);

            case 'friend':
                return friendCmd(message);
            case 'unfriend':
                return unfriendCmd(message);
            case 'friends':
                return friendsListCmd(message);
            case 'propose':
                return proposeCmd(message);
            case 'partner':
                return partnerCmd(message);
            case 'breakup':
                return breakupCmd(message);

            // ── Missions ──
            case 'missions':
            case 'mission':
            case 'm':
            case 'hawl':
                return missionsCmd(message, args);

            case 'mc1':
            case 'mc2':
            case 'mc3':
                return missionsCmd(message, ['claim', command.slice(2)]);

            // ── Admin: Give item ──
            case 'giveitem':
            case 'giveframe':
                return giveItemCmd(message, args);

            // ── Music ──
            case 'play': { const m = getMusic(); return m ? m.joinCmd(message, args) : message.reply(`⚠️ Music khalad: \`${_musicErr || 'unknown'}\``); }
            case 'skip':  { const m = getMusic(); if (m) m.skipMsgCmd(message);  return; }
            case 'stop':  { const m = getMusic(); if (m) m.stopMsgCmd(message);  return; }
            case 'leave': { const m = getMusic(); if (m) m.leaveMsgCmd(message); return; }
            case 'queue': { const m = getMusic(); if (m) m.queueMsgCmd(message); return; }
            case 'np':    { const m = getMusic(); if (m) m.npMsgCmd(message);    return; }



            // ── Kale ──
            case 'cilada':
            case 'cilad':
            case 'bug':
                return ciladaCmd(message, args);

            case 'dj':
                return djCmd(message, args);

            case 'admin':
                return adminCmd(message, args);

            case 'adall': {
                if (!isAdmin(userId)) {
                    return message.reply('⛔ **Adigu admin maaha.**');
                }
                return broadcast(message, args);
            }

            // ── Tartan (Tournament) ──
            case 'isdiiwaangeli':
            case 'diiwaan':
                return tournament.cmdRegister(message);

            case 'tartan':
                return tournament.cmdAnnounce(message);

            case 'tartan_bilow':
                return tournament.cmdOpen(message);

            case 'gal':
                return tournament.cmdJoin(message, args);

            case 'admin_next':
                return tournament.cmdAdminNext(message);

            case 'tartan_status':
                return tournament.cmdStatus(message);

            case 'tartan_jooji':
            case 'tartan_stop':
                return tournament.cmdStop(message);

            // ── Team Duel ──
            case 'deul':
            case 'tduel':
                return teamDuel.cmdTeamDuel(message, args);

            case '2v2':
            case '2vs2':
                return teamDuel.cmd2v2(message, args);

            case '3v3':
            case '3vs3':
                return teamDuel.cmd3v3(message, args);

            case 'r':
            case 'remove':
            case 'tremove':
                return teamDuel.cmdTeamRemove(message);

            case 'dm':
                return dmCmd(message, args);

            case 'password':
            case 'passwd':
            case 'pw':
                return passwordCmd(message, args);

            case 'access':
            case 'galee':
                return accessCmd(message, args);

            case 'invest':
            case 'maalgashi':
                return investCmd(message, args);

            case 'adminbank': {
                if (!isAdmin(userId)) return message.reply('⛔ Admin maahan.');
                return adminBankCmd(message, args);
            }

            case 'reminder':
            case 'xusuusin': {
                checkUser(userId);
                const d   = require('../../src/store').userData[userId];
                const sub = (args[0] || '').toLowerCase();
                if (sub === 'off' || sub === 'jooji') {
                    d.reminderOptOut = true;
                    require('../../src/store').saveData();
                    return message.reply('🔕 **Xusuusinta waa la joojiyay.** Dib u fur: `?reminder on`');
                }
                if (sub === 'on' || sub === 'fur') {
                    d.reminderOptOut = false;
                    require('../../src/store').saveData();
                    return message.reply('🔔 **Xusuusinta waa la furay.** DM ayaa la soo diri doonaa haddaad maqnaato.');
                }
                const status = d.reminderOptOut ? '🔕 Joojisan' : '🔔 Firfircoon';
                return message.reply(`**Xusuusinta:** ${status}\n\`?reminder off\` — Jooji\n\`?reminder on\` — Fur`);
            }

            // ── Werewolf ──
            case 'werewolf':
            case 'ww':
            case 'wwolf': {
                if (args[0] === 'stop' && isAdmin(userId)) {
                    const { games: wwG, cancelGame } = require('../games/werewolf');
                    const g = wwG.get(message.guild.id);
                    if (!g) return message.reply('⚠️ Ciyaar ma jirto.');
                    cancelGame(message.guild.id);
                    return message.reply('🛑 Werewolf game la joojiyay.');
                }
                return werewolfCmd(message);
            }
        }
    });
};
