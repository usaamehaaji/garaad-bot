// =====================================================================
// GARAAD BOT - Maareynta Farriimaha (Message Handler)
// =====================================================================

const { PREFIX, REWARDS } = require('../config');
const { checkUser, addXp } = require('../utils/helpers');
const { isAdmin }          = require('../utils/admin');
const { userData, saveData } = require('../store');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const helpCmd       = require('../commands/help');
const aqoonCmd      = require('../commands/aqoon');
const profileCmd    = require('../commands/profile');
const statisticsCmd = require('../commands/statistics');
const topCmd        = require('../commands/top');
const titlesCmd     = require('../commands/titles');
const setTitleCmd   = require('../commands/settitle');
const soloCmd       = require('../commands/solo');
const duelCmd       = require('../commands/duel');
const quizCmd       = require('../commands/quiz');
const blitzCmd      = require('../commands/blitz');
const exchangeCmd   = require('../commands/exchange');
const ciladaCmd     = require('../commands/cilada');
const adminCmd      = require('../commands/admin/admin');
const broadcast     = require('../commands/admin/adminBroadcast');
const tournament    = require('../games/tournament');
const { stopBlitz } = require('../games/blitz');

// ── Daily XP + IQ reward (auto, once per 24h, on any command) ────────
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function tryDailyReward(userId, message) {
    const d    = userData[userId];
    const last = d.lastDaily || 0;
    if (Date.now() - last < DAILY_COOLDOWN_MS) return;

    d.lastDaily = Date.now();
    d.iq = (d.iq || 0) + REWARDS.daily.iq;
    addXp(userId, REWARDS.daily.xp);
    saveData();

    await message.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('🎁 Daily Reward')
            .setDescription(`<@${userId}> **+${REWARDS.daily.iq} IQ** · **+${REWARDS.daily.xp} XP**`)
            .setColor('#2ecc71')
            .setFooter({ text: 'Comes back after 24 hours.' })],
    }).catch(() => {});
}

// ── Embed: Economy La Saaray ──────────────────────────────────────────
function economyRemovedEmbed(userId) {
    return {
        embeds: [new EmbedBuilder()
            .setTitle('🚧 Economy Game — Update Ayaa Socda')
            .setColor('#e74c3c')
            .setDescription(
                `**Amarradaan dhaqaalaha waa la joojiyay si ku-meel-gaadh ah.**\n\n` +
                `🔧 Nidaamka dhaqaalaha (suuqa, ganacsi, lacagaha) waa dib u dhisayaa — update weyn ayaa u socda!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `✅ **Amarrada weli shaqaynaya:**\n` +
                `\`${PREFIX}solo\` — Ciyaarta IQ (xawliga = dhibco badan)\n` +
                `\`${PREFIX}duel @qof\` — Tartan 1v1\n` +
                `\`${PREFIX}quiz\` — Tartanka kooxda\n` +
                `\`${PREFIX}blitz\` — ⚡ Kii ugu dhakhsaha sax ah\n` +
                `\`${PREFIX}tartan\` — Tournament 🏆\n` +
                `\`${PREFIX}profile\` — Xaaladda kuu gaar ah\n` +
                `\`${PREFIX}top\` — Liiska IQ-da\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `_Iska sug — economy game cusub ayaa dhici doona! 🚀_`
            )
            .setFooter({ text: `${PREFIX}caawin — amarrada aqoonta oo dhan` })],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`close_eco_${userId}`)
                .setLabel('Garowday ✓')
                .setStyle(ButtonStyle.Secondary),
        )],
    };
}

module.exports = function setupMessageHandler(client) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot)                  return;
        if (!message.content.startsWith(PREFIX)) return;

        const args    = message.content.slice(PREFIX.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();
        const userId  = message.author.id;

        checkUser(userId);
        await tryDailyReward(userId, message);

        switch (command) {
            // ── Caawinaad ──
            case 'caawin':
            case 'caaawin':
            case 'help':
                return helpCmd(message);

            case 'aqoon':
                return aqoonCmd(message);

            // ── Profile & Stats ──
            case 'profile':
                return profileCmd(message);

            case 'statistics':
            case 'stats':
                return statisticsCmd(message);

            case 'top':
                return topCmd(message, args);

            // ── Darajooyinka ──
            case 'titles':
                return titlesCmd(message);

            case 'settitle':
                return setTitleCmd(message, args);

            case 'exchange':
                return exchangeCmd(message, args);

            // ── Ciyaaraha Aqoonta ──
            case 'solo':
                return soloCmd(message, args);

            case 'duel':
                return duelCmd(message, args);

            case 'quiz':
            case 'friends':
            case 'team':
                return quizCmd(message, args);

            case 'blitz':
                if (args[0] && args[0].toLowerCase() === 'stop') {
                    return stopBlitz(message);
                }
                return blitzCmd(message, args);

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

            // ════════════════════════════════════════════════════════
            // ECONOMY GAME — DHAMI LA SAARAY (Update ayaa socda)
            // ════════════════════════════════════════════════════════
            case 'trade':
            case 'jeeb':
            case 'wallet':
            case 'portfolio':
            case 'suuqa':
            case 'market':
            case 'markets':
            case 'manta':
            case 'daily':
            case 'shaqo':
            case 'work':
            case 'cashflip':
            case 'flip':
            case 'cf':
            case 'kubays':
            case 'slots':
            case 'tajiriin':
            case 'rich':
            case 'tajiir':
            case 'tilmaan':
            case 'buy':
            case 'shop':
            case 'dhaqaale':
            case 'lacag':
            case 'ganacsi':
            case 'row':
                return message.reply(economyRemovedEmbed(userId));
        }
    });
};
