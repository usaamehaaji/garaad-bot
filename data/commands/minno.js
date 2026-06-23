// =====================================================================
// AMARKA: ?minno <amount>         — Solo vs Bot (auto coinflip)
//         ?minno @user <amount>   — Challenge qof kale
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { checkUser, fmt } = require('../../src/utils/helpers');
const { econData, checkEconUser, saveEcon } = require('../../src/economy/econStore');

const MIN_BET           = 50;
const MAX_BET           = 50_000;
const CHALLENGE_TIMEOUT = 60_000;
const WINS_PER_LEVEL    = 10;

const pending = new Map(); // targetId → { challengerId, amount, msgId }

function getMinnoLevel(wins) { return Math.floor((wins || 0) / WINS_PER_LEVEL); }
function minnoWinsNeeded()   { return WINS_PER_LEVEL; }

// ── Shared result embed builder ───────────────────────────────────────
function buildResultEmbed(winnerId, loserId, amount, leveledUp, newLevel, econData, userData, wName, lName) {
    const wBal = fmt(econData[winnerId]?.btc || 0);
    const lBal = fmt(econData[loserId]?.btc  || 0);
    const wins = userData[winnerId]?.minnoWins || 0;
    const prog = wins % WINS_PER_LEVEL;

    return new EmbedBuilder()
        .setTitle('🎲 Minno — Natiijada!')
        .setColor(leveledUp ? '#f1c40f' : '#2ecc71')
        .setDescription(
            `🪙 **${wName}** ayaa guulaystay!\n\n` +
            `💰 **${wName}** +₿${fmt(amount)} → Wallet: ₿${wBal}\n` +
            `📉 **${lName}** -₿${fmt(amount)} → Wallet: ₿${lBal}\n\n` +
            `🏆 Minno Wins: **${wins}** (${prog}/${WINS_PER_LEVEL} → Level ${newLevel})` +
            (leveledUp ? `\n\n🎉 **LEVEL UP! ${wName} waa Minno Level ${newLevel}!**` : '')
        );
}

// ── Shared win/loss logic ─────────────────────────────────────────────
function applyResult(winnerId, loserId, amount) {
    econData[winnerId].btc = (econData[winnerId].btc || 0) + amount;
    econData[loserId].btc  = (econData[loserId].btc  || 0) - amount;
    saveEcon();

    checkUser(winnerId); checkUser(loserId);
    userData[winnerId].minnoWins  = (userData[winnerId].minnoWins  || 0) + 1;
    userData[loserId].minnoLosses = (userData[loserId].minnoLosses || 0) + 1;

    const prevLevel = getMinnoLevel(userData[winnerId].minnoWins - 1);
    const newLevel  = getMinnoLevel(userData[winnerId].minnoWins);
    saveData();

    return { newLevel, leveledUp: newLevel > prevLevel };
}

// ── Main command ──────────────────────────────────────────────────────
async function minnoCmd(message, args) {
    const cId = message.author.id;
    checkUser(cId);
    checkEconUser(cId);

    const target  = message.mentions.users.first();
    const numArg  = args.find(a => /^\d+$/.test(a));
    const amount  = parseInt(numArg, 10);

    // No args → help
    if (!numArg) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🎲 Minno — Coinflip')
            .setColor('#9b59b6')
            .setDescription(
                '**Qaabka:**\n' +
                '`?minno <amount>` — Kaligaa vs Bot\n' +
                '`?minno @user <amount>` — Challenge qof kale\n\n' +
                '🪙 50/50 coinflip — kii guulaystaa wuxuu qaataa BTC-da laba jibaaran.\n' +
                `🏆 **${WINS_PER_LEVEL} guul = Minno Level Up**\n\n` +
                '**Tusaale:**\n`?minno 500`\n`?minno @Cali 500`'
            )] });
    }

    if (!amount || amount < MIN_BET)
        return message.reply(`⚠️ Ugu yar **₿${MIN_BET}** ayaad sharadi kartaa.`);
    if (amount > MAX_BET)
        return message.reply(`⚠️ Ugu badan **₿${MAX_BET.toLocaleString()}** ayaad sharadi kartaa.`);

    // ── SOLO MODE: ?minno <amount> ──
    if (!target) {
        if ((econData[cId].btc || 0) < amount)
            return message.reply(`⚠️ BTC kugu filna ma lihid. Wallet: **₿${fmt(econData[cId].btc || 0)}**`);

        const playerWins  = Math.random() < 0.5;
        const winnerId    = playerWins ? cId : 'BOT';
        const loserId     = playerWins ? 'BOT' : cId;

        if (playerWins) {
            econData[cId].btc = (econData[cId].btc || 0) + amount;
            saveEcon();
            checkUser(cId);
            userData[cId].minnoWins = (userData[cId].minnoWins || 0) + 1;
            const prevLvl = getMinnoLevel(userData[cId].minnoWins - 1);
            const newLvl  = getMinnoLevel(userData[cId].minnoWins);
            const lvlUp   = newLvl > prevLvl;
            saveData();
            const wins = userData[cId].minnoWins;

            return message.reply({ embeds: [new EmbedBuilder()
                .setTitle('🎲 Minno vs Bot — GUUL! ✅')
                .setColor(lvlUp ? '#f1c40f' : '#2ecc71')
                .setDescription(
                    `🪙 Gacantaada ayaa soo baxday!\n\n` +
                    `💰 +₿${fmt(amount)} → Wallet: **₿${fmt(econData[cId].btc || 0)}**\n\n` +
                    `🏆 Minno Wins: **${wins}** (${wins % WINS_PER_LEVEL}/${WINS_PER_LEVEL} → Level ${newLvl})` +
                    (lvlUp ? `\n\n🎉 **LEVEL UP! Waa Minno Level ${newLvl}!**` : '')
                )] });
        } else {
            econData[cId].btc = (econData[cId].btc || 0) - amount;
            saveEcon();
            checkUser(cId);
            userData[cId].minnoLosses = (userData[cId].minnoLosses || 0) + 1;
            saveData();

            return message.reply({ embeds: [new EmbedBuilder()
                .setTitle('🎲 Minno vs Bot — GUUL-DARRO! ❌')
                .setColor('#e74c3c')
                .setDescription(
                    `🪙 Bot-ka ayaa guulaystay!\n\n` +
                    `📉 -₿${fmt(amount)} → Wallet: **₿${fmt(econData[cId].btc || 0)}**`
                )] });
        }
    }

    // ── PVP MODE: ?minno @user <amount> ──
    if (target.id === cId)  return message.reply('⚠️ Nafta kuma sharadayn kartid!');
    if (target.bot)         return message.reply('⚠️ Bot-ka kuma sharadayn kartid!');

    checkEconUser(target.id);

    if ((econData[cId].btc || 0) < amount)
        return message.reply(`⚠️ BTC kugu filna ma lihid. Wallet: **₿${fmt(econData[cId].btc || 0)}**`);
    if ((econData[target.id].btc || 0) < amount)
        return message.reply(`⚠️ **${target.username}** BTC kugu filan ma laha sharadkan.`);
    if (pending.has(target.id))
        return message.reply(`⚠️ **${target.username}** challenge kale ayuu haystaa. Sug.`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minno_accept_${cId}_${target.id}_${amount}`)
            .setLabel('✅ Aqbal')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`minno_decline_${cId}_${target.id}`)
            .setLabel('❌ Diid')
            .setStyle(ButtonStyle.Danger),
    );

    const msg = await message.reply({
        content: `${target}`,
        embeds: [new EmbedBuilder()
            .setTitle('🎲 Minno Challenge!')
            .setColor('#f39c12')
            .setDescription(
                `**${message.author.username}** wuxuu kugu sharaday **₿${fmt(amount)}**!\n\n` +
                `🪙 50/50 coinflip — kii guulaystaa wuxuu qaataa **₿${fmt(amount * 2)}**\n\n` +
                `⏳ ${CHALLENGE_TIMEOUT / 1000}s gudahood jawaab.`
            )],
        components: [row],
    });

    pending.set(target.id, { challengerId: cId, amount, msgId: msg.id });

    setTimeout(async () => {
        const p = pending.get(target.id);
        if (p && p.msgId === msg.id) {
            pending.delete(target.id);
            await msg.edit({
                embeds: [new EmbedBuilder()
                    .setTitle('⏰ Minno — Waqtigu wuu dhammaaday')
                    .setColor('#7f8c8d')
                    .setDescription(`**${target.username}** kama jawaabin.`)],
                components: [],
            }).catch(() => {});
        }
    }, CHALLENGE_TIMEOUT);
}

// ── Accept button ─────────────────────────────────────────────────────
async function handleMinnoAccept(interaction) {
    const parts  = interaction.customId.split('_');
    const cId    = parts[2];
    const tId    = parts[3];
    const amount = parseInt(parts[4], 10);

    if (interaction.user.id !== tId)
        return interaction.reply({ content: '⚠️ Adiga kuuma ahan challenge-kan.', flags: 64 });

    const p = pending.get(tId);
    if (!p || p.challengerId !== cId)
        return interaction.reply({ content: '⚠️ Challenge-kan waa dhacay ama wuu xidmay.', flags: 64 });

    pending.delete(tId);
    checkUser(cId); checkUser(tId);
    checkEconUser(cId); checkEconUser(tId);

    if ((econData[cId].btc || 0) < amount || (econData[tId].btc || 0) < amount) {
        return interaction.update({
            embeds: [new EmbedBuilder()
                .setTitle('⚠️ BTC kugu filna ma jiro')
                .setColor('#e74c3c')
                .setDescription('Mid ka mid ah labada qof BTC kugu filan ma haysto.')],
            components: [],
        }).catch(() => {});
    }

    await interaction.deferUpdate().catch(() => {});

    const cWins   = Math.random() < 0.5;
    const winnerId = cWins ? cId : tId;
    const loserId  = cWins ? tId : cId;

    const { newLevel, leveledUp } = applyResult(winnerId, loserId, amount);

    let wUser, lUser;
    try { wUser = await interaction.client.users.fetch(winnerId); } catch {}
    try { lUser = await interaction.client.users.fetch(loserId);  } catch {}

    const wName = wUser?.globalName || wUser?.username || 'Winner';
    const lName = lUser?.globalName || lUser?.username || 'Loser';

    return interaction.editReply({
        content: '',
        embeds: [buildResultEmbed(winnerId, loserId, amount, leveledUp, newLevel, econData, userData, wName, lName)],
        components: [],
    }).catch(() => {});
}

// ── Decline button ────────────────────────────────────────────────────
async function handleMinnoDecline(interaction) {
    const parts = interaction.customId.split('_');
    const tId   = parts[3];

    if (interaction.user.id !== tId)
        return interaction.reply({ content: '⚠️ Adiga kuuma ahan challenge-kan.', flags: 64 });

    pending.delete(tId);
    return interaction.update({
        embeds: [new EmbedBuilder()
            .setTitle('❌ Minno — La Diiday')
            .setColor('#e74c3c')
            .setDescription(`<@${tId}> wuu diiday sharadka.`)],
        components: [],
    }).catch(() => {});
}

module.exports = {
    minnoCmd,
    handleMinnoAccept,
    handleMinnoDecline,
    getMinnoLevel,
    minnoWinsNeeded,
};
