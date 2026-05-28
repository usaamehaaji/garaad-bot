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
const todayCmd        = require('../../data/commands/today');

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
const { getDisTube } = require('../music/disTubeSetup');


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
                return topCmd(message, args);

            case 'today':
                return todayCmd(message);

            case 'buy':
                return buyCmd(message, args);

            // ── Ciyaaraha Aqoonta ──
            case 'solo':
                return soloCmd(message, args);

            case 'duel':
                return duelCmd(message, args);

            case 'quiz':
            case 'friends':
            case 'team':
                return quizCmd(message, args);

            // ── Economy ──
            case 'shaqo':
            case 'work':
                return shaqoCmd(message);

            case 'jeeb':
                return jeebCmd(message, args);


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
            case 'bank':
                return ebankCmd(message, args);

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

            // ── Missions ──
            case 'missions':
            case 'mission':
            case 'hawl':
                return missionsCmd(message, args);

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
        }
    });
};
