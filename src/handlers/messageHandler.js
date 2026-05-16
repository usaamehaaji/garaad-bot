// =====================================================================
// GARAAD BOT - Maareynta Farriimaha (Message Handler)
// =====================================================================

const { PREFIX, SAVER_CHANNEL_ID } = require('../config');
const { checkUser }   = require('../utils/helpers');
const { isAdmin }     = require('../utils/admin');

const helpCmd         = require('../commands/help');

const profileCmd      = require('../commands/profile');
const statisticsCmd   = require('../commands/statistics');
const topCmd          = require('../commands/top');
const todayCmd        = require('../commands/today');

const buyCmd          = require('../commands/buy');
const soloCmd         = require('../commands/solo');
const duelCmd         = require('../commands/duel');
const quizCmd         = require('../commands/quiz');
const exchangeCmd     = require('../commands/exchange');
const ciladaCmd       = require('../commands/cilada');
const adminCmd        = require('../commands/admin/admin');
const broadcast       = require('../commands/admin/adminBroadcast');
const tournament      = require('../games/tournament');
const connect4        = require('../games/connect4');
const werewolf        = require('../games/werewolf');
const teamDuel        = require('../games/teamDuel');

// ── Economy ──

const jeebCmd         = require('../commands/economy/jeeb');
const tradeCmd        = require('../commands/economy/trade');
const cashflipCmd     = require('../commands/economy/cashflip');
const econExchangeCmd = require('../commands/economy/econExchange');
const giveCmd         = require('../commands/economy/give');
const robCmd          = require('../commands/economy/rob');
const richCmd         = require('../commands/economy/rich');
const ebankCmd        = require('../commands/economy/ebank');
const econShopCmd     = require('../commands/economy/econShop');

const shaqoCmd        = require('../commands/economy/shaqo');
const bankListCmd     = require('../commands/economy/bankList');
const econTitleCmd    = require('../commands/economy/econTitle');


module.exports = function setupMessageHandler(client) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot)                  return;
        if (!message.content.startsWith(PREFIX)) return;

        const args    = message.content.slice(PREFIX.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();
        const userId  = message.author.id;

        checkUser(userId);


        switch (command) {
            // ── Caawinaad ──
            case 'caawin':
            case 'caaawin':
            case 'help':
                return helpCmd(message);

            // ── Profile & Stats ──
            case 'profile':
                return profileCmd(message);

            case 'statistics':
            case 'stats':
                return statisticsCmd(message);

            case 'top':
                return topCmd(message, args);

            case 'today':
                return todayCmd(message);

            case 'buy':
                return buyCmd(message, args);

            case 'exchange': {
                const a0 = (args[0] || '').toLowerCase();
                if (a0 === 'xp' || a0 === 'iq') return exchangeCmd(message, args);
                return econExchangeCmd(message, args);
            }


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

            case 'rob':
                return robCmd(message, args);

            case 'rich':
                return richCmd(message);

            case 'list':
                return bankListCmd(message);

            case 'etitle':
                return econTitleCmd(message, args);

            case '4inrow':
                return connect4.cmdChallenge(message);

            case 'werewolf':
            case 'ww':
                return werewolf.cmdWerewolf(message);

            case 'ebank':
                return ebankCmd(message, args);

            case 'shop':
                return econShopCmd(message);

            // ── Kale ──
            case 'cilada':
            case 'cilad':
            case 'bug':
                return ciladaCmd(message, args);

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

            case 'remove':
            case 'tremove':
                return teamDuel.cmdTeamRemove(message, args);
        }
    });
};
