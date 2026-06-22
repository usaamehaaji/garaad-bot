// =====================================================================
// AMARKA: ?minno @user <amount> — Coinflip challenge, BTC vs BTC
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');
const { econData, checkEconUser, saveEcon } = require('../../src/economy/econStore');
const { fmt } = require('../../src/utils/helpers');

const MIN_BET     = 50;
const MAX_BET     = 50_000;
const CHALLENGE_TIMEOUT_MS = 60_000;

const pendingChallenges = new Map(); // key: targetId -> { challengerId, amount, messageId, channelId }

function minnoWinsNeeded() { return 10; }

function getMinnoLevel(wins) {
    return Math.floor((wins || 0) / minnoWinsNeeded());
}

module.exports = async function minnoCmd(message, args) {
    const challengerId = message.author.id;
    checkUser(challengerId);
    checkEconUser(challengerId);

    const target = message.mentions.users.first();
    if (!target) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🎲 Minno — Coinflip Challenge')
            .setColor('#9b59b6')
            .setDescription(
                `Isticmaal: \`?minno @user <amount>\`\n\n` +
                `🪙 Labada qof BTC isku mid ah ayay dhigaan, kii guulaystaa wuxuu qaataa labadaba.\n` +
                `🏆 **${minnoWinsNeeded()} guul = Level Up** (Minno Level-kaaga)\n\n` +
                `Tusaale: \`?minno @Cali 500\``
            )] });
    }

    if (target.id === challengerId)
        return message.reply('⚠️ Nafta kuma sharadayn kartid!');
    if (target.bot)
        return message.reply('⚠️ Bot-ka kuma sharadayn kartid!');

    // args: ['@mention', '500'] or ['<@123>', '500']
    const amount = parseInt(args.filter(a => !a.startsWith('<@'))[0], 10);
    if (!amount || isNaN(amount) || amount < MIN_BET)
        return message.reply(`⚠️ Ugu yar **₿${MIN_BET}** ayaad sharadi kartaa.`);
    if (amount > MAX_BET)
        return message.reply(`⚠️ Ugu badan **₿${MAX_BET.toLocaleString()}** ayaad sharadi kartaa.`);

    checkEconUser(target.id);

    if ((econData[challengerId].btc || 0) < amount)
        return message.reply(`⚠️ BTC kugu filna ma lihid. Wallet: **₿${fmt(econData[challengerId].btc || 0)}**`);
    if ((econData[target.id].btc || 0) < amount)
        return message.reply(`⚠️ **${target.username}** BTC kugu filan ma laha sharadkan.`);

    if (pendingChallenges.has(target.id))
        return message.reply(`⚠️ **${target.username}** hore ayuu challenge u haystaa. Sug.`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`minno_accept_${challengerId}_${target.id}_${amount}`).setLabel('✅ Aqbal').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`minno_decline_${challengerId}_${target.id}`).setLabel('❌ Diid').setStyle(ButtonStyle.Danger),
    );

    const challengeMsg = await message.reply({
        content: `${target}`,
        embeds: [new EmbedBuilder()
            .setTitle('🎲 Minno Challenge!')
            .setColor('#f39c12')
            .setDescription(
                `**${message.author.username}** wuxuu kugu sharaday **₿${fmt(amount)}**!\n\n` +
                `🪙 Coinflip 50/50 — kii guulaystaa wuxuu qaataa **₿${fmt(amount * 2)}**.\n\n` +
                `⏳ ${CHALLENGE_TIMEOUT_MS / 1000} seconds kugu jawaab.`
            )],
        components: [row],
    });

    pendingChallenges.set(target.id, {
        challengerId, amount,
        messageId: challengeMsg.id, channelId: message.channel.id,
    });

    setTimeout(async () => {
        if (pendingChallenges.has(target.id) && pendingChallenges.get(target.id).messageId === challengeMsg.id) {
            pendingChallenges.delete(target.id);
            await challengeMsg.edit({
                embeds: [new EmbedBuilder()
                    .setTitle('⏰ Minno Challenge — Waqtigu wuu dhammaaday')
                    .setColor('#7f8c8d')
                    .setDescription(`**${target.username}** kama jawaabin sharadka.`)],
                components: [],
            }).catch(() => {});
        }
    }, CHALLENGE_TIMEOUT_MS);
};

async function handleMinnoAccept(interaction) {
    const [, , challengerId, targetId, amountStr] = interaction.customId.split('_');
    const amount = parseInt(amountStr, 10);

    if (interaction.user.id !== targetId) {
        return interaction.reply({ content: '⚠️ Adiga kuuma ahan challenge-kan.', flags: 64 });
    }

    const pending = pendingChallenges.get(targetId);
    if (!pending || pending.challengerId !== challengerId) {
        return interaction.reply({ content: '⚠️ Challenge-kan waa dhacay.', flags: 64 });
    }
    pendingChallenges.delete(targetId);

    checkUser(challengerId); checkUser(targetId);
    checkEconUser(challengerId); checkEconUser(targetId);

    if ((econData[challengerId].btc || 0) < amount || (econData[targetId].btc || 0) < amount) {
        return interaction.update({
            embeds: [new EmbedBuilder().setTitle('⚠️ BTC kugu filna ma jiro').setColor('#e74c3c')
                .setDescription('Mid ka mid ah labada qof BTC kugu filan ma haysto hadda.')],
            components: [],
        }).catch(() => {});
    }

    await interaction.deferUpdate().catch(() => {});

    // 50/50 coinflip
    const challengerWins = Math.random() < 0.5;
    const winnerId  = challengerWins ? challengerId : targetId;
    const loserId   = challengerWins ? targetId : challengerId;
    const winnerName = challengerWins ? interaction.message.mentions?.users?.first()?.username : interaction.user.username;

    econData[winnerId].btc = (econData[winnerId].btc || 0) - amount + (amount * 2);
    econData[loserId].btc  = (econData[loserId].btc  || 0) - amount;
    saveEcon();

    userData[winnerId].minnoWins   = (userData[winnerId].minnoWins   || 0) + 1;
    userData[loserId].minnoLosses  = (userData[loserId].minnoLosses  || 0) + 1;

    const oldLevel = getMinnoLevel((userData[winnerId].minnoWins || 1) - 1);
    const newLevel = getMinnoLevel(userData[winnerId].minnoWins || 1);
    const leveledUp = newLevel > oldLevel;

    saveData();

    let winnerUser, loserUser;
    try { winnerUser = await interaction.client.users.fetch(winnerId); } catch {}
    try { loserUser  = await interaction.client.users.fetch(loserId); } catch {}

    const desc =
        `🪙 **${winnerUser?.username || 'Winner'}** ayaa guulaystay!\n\n` +
        `💰 **${winnerUser?.username}** wuxuu heshay: **₿${fmt(amount * 2)}**\n` +
        `📉 **${loserUser?.username}** wuxuu lumiyay: **₿${fmt(amount)}**\n\n` +
        `🏆 Minno Wins: **${userData[winnerId].minnoWins}** (${userData[winnerId].minnoWins % minnoWinsNeeded()}/${minnoWinsNeeded()} → Level ${newLevel + 1})` +
        (leveledUp ? `\n\n🎉 **LEVEL UP!** ${winnerUser?.username} hadda waa **Minno Level ${newLevel}**!` : '');

    return interaction.editReply({
        content: '',
        embeds: [new EmbedBuilder()
            .setTitle('🎲 Minno — Natiijada!')
            .setColor(leveledUp ? '#f1c40f' : '#2ecc71')
            .setDescription(desc)],
        components: [],
    }).catch(() => {});
}

async function handleMinnoDecline(interaction) {
    const [, , challengerId, targetId] = interaction.customId.split('_');
    if (interaction.user.id !== targetId) {
        return interaction.reply({ content: '⚠️ Adiga kuuma ahan challenge-kan.', flags: 64 });
    }
    pendingChallenges.delete(targetId);
    return interaction.update({
        embeds: [new EmbedBuilder().setTitle('❌ Minno Challenge — La Diiday').setColor('#e74c3c')
            .setDescription(`<@${targetId}> wuu diiday sharadka.`)],
        components: [],
    }).catch(() => {});
}

module.exports.handleMinnoAccept  = handleMinnoAccept;
module.exports.handleMinnoDecline = handleMinnoDecline;
module.exports.getMinnoLevel      = getMinnoLevel;
module.exports.minnoWinsNeeded    = minnoWinsNeeded;
