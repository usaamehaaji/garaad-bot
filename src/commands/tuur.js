// =====================================================================
// AMARKA: ?tuur @user [xaddi]
// Ciyaarta Tuur: Labada qof waxay tuuraan diisku — cidda tirada weyn
// helaysa ayaa cash ka qaadanaysa midda kale. (IQ lama taabanayo)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData, isUserBusy } = require('../store');
const { checkUser } = require('../utils/helpers');
const { PREFIX, GLOBAL_WAIT_MS } = require('../config');

// Socod: challangeId -> { challengerId, targetId, amount, channelId }
const activeTuurChallenges = new Map();

module.exports = async function tuurCommand(message, args) {
    const challengerId = message.author.id;
    checkUser(challengerId);

    const target = message.mentions.users.first();
    if (!target) {
        return message.reply(
            `🎲 **Ciyaarta Tuur** — Labada qof waxay tuuraan diisku!\n` +
            `Isticmaal: \`${PREFIX}tuur @user [xaddi cash]\`\n` +
            `Tusaale: \`${PREFIX}tuur @saaxiib 50\``
        );
    }

    if (target.bot) return message.reply('🤖 Bot lama ciyaari karo.');
    if (target.id === challengerId) return message.reply('⚠️ Naftaada lama ciyaari kartid.');

    const amountArg = args.find(a => /^\d+$/.test(a));
    const amount = amountArg ? parseInt(amountArg) : 10;

    if (isNaN(amount) || amount < 1) {
        return message.reply('⚠️ Xaddiga cash-ka waa inuu ka weyn yahay 0. Tusaale: `?tuur @user 50`');
    }
    if (amount > 500) {
        return message.reply('⚠️ Ugu badnaan $500 cash ayaad ku khamaari kartaa hal ciyaar.');
    }

    checkUser(challengerId);
    checkUser(target.id);

    userData[challengerId].cash ??= Number.isFinite(userData[challengerId].usdBalance) ? userData[challengerId].usdBalance : 0;
    if ((userData[challengerId].cash || 0) < amount) {
        return message.reply(`⚠️ Cash-kaagu ma filna! Waxaad haysataa **$${(userData[challengerId].cash || 0).toFixed(2)}** oo keliya.`);
    }

    const busyC = isUserBusy(challengerId);
    if (busyC) return message.reply(`⚠️ Waxaad ku jirtaa ciyaar **${busyC}**. Dhamee ka hor!`);

    const busyT = isUserBusy(target.id);
    if (busyT) return message.reply(`⚠️ <@${target.id}> wuxuu ku jiraa ciyaar **${busyT}**. Sug!`);

    const challengeId = `${message.channel.id}_${challengerId}`;
    if (activeTuurChallenges.has(challengeId)) {
        return message.reply('⚠️ Waxaad horeba casuumaad soo dirisay oo aan weli la aqbalin.');
    }

    activeTuurChallenges.set(challengeId, {
        challengerId,
        targetId: target.id,
        amount,
        channelId: message.channel.id,
    });

    const embed = new EmbedBuilder()
        .setTitle('🎲 Tuur — Diisku Codsi!')
        .setDescription(
            `<@${challengerId}> wuxuu ku casuumayaa <@${target.id}> **Diisku Ciyaar**!\n\n` +
            `🏆 **Khamaarka:** $${amount} cash\n` +
            `📋 **Sida:** Labadooduba waxay tuuraan diisku (1-6). Cidda tirada weyn helaysa ayaa cash-ka qaadanaysa.\n` +
            `🔁 **Iskumid:** Lacag baa la soo celinayaa, cidna cash ma lumiso.\n\n` +
            `<@${target.id}>, ma aqbalaysaa? *(${Math.round(GLOBAL_WAIT_MS / 1000)} ilbiriqsi)*`
        )
        .setColor('#9b59b6');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tuur_accept_${challengeId}`)
            .setLabel('Aqbal 🎲')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`tuur_decline_${challengeId}`)
            .setLabel('Diid ❌')
            .setStyle(ButtonStyle.Danger),
    );

    const msg = await message.reply({
        content: `${target}`,
        embeds: [embed],
        components: [row],
        fetchReply: true,
    });

    // Time-out: haddii uusan aqbalin
    setTimeout(async () => {
        if (!activeTuurChallenges.has(challengeId)) return;
        activeTuurChallenges.delete(challengeId);
        try {
            await msg.edit({
                content: `⏰ <@${target.id}> ma aqbalin — codsi wuu dhamaaday.`,
                embeds: [],
                components: [],
            });
        } catch {}
    }, GLOBAL_WAIT_MS);
};

// ───── Tuur la ciyaaray (interaction handler-ka ayaa u yeedhaya) ─────
async function handleTuurInteraction(interaction, activeTuurChallengesMap) {
    const id = interaction.customId;

    if (id.startsWith('tuur_accept_')) {
        const challengeId = id.replace('tuur_accept_', '');
        const ch = activeTuurChallengesMap.get(challengeId);

        if (!ch) {
            return interaction.reply({ content: '⚠️ Codsigu wuu dhamaaday.', flags: 64 });
        }
        if (interaction.user.id !== ch.targetId) {
            return interaction.reply({ content: '⚠️ Adiga kuma codsanin.', flags: 64 });
        }

        activeTuurChallengesMap.delete(challengeId);

        checkUser(ch.challengerId);
        checkUser(ch.targetId);

        // Hubi cash
        userData[ch.challengerId].cash ??= Number.isFinite(userData[ch.challengerId].usdBalance) ? userData[ch.challengerId].usdBalance : 0;
        userData[ch.targetId].cash ??= Number.isFinite(userData[ch.targetId].usdBalance) ? userData[ch.targetId].usdBalance : 0;
        if ((userData[ch.challengerId].cash || 0) < ch.amount) {
            return interaction.update({
                content: `❌ <@${ch.challengerId}> hadda cash ku filan ma leh ($${(userData[ch.challengerId].cash || 0).toFixed(2)}).`,
                embeds: [], components: [],
            });
        }
        if ((userData[ch.targetId].cash || 0) < ch.amount) {
            return interaction.update({
                content: `❌ <@${ch.targetId}> hadda cash ku filan ma leh ($${(userData[ch.targetId].cash || 0).toFixed(2)}).`,
                embeds: [], components: [],
            });
        }

        // Tuur diisku
        const roll1 = Math.ceil(Math.random() * 6);
        const roll2 = Math.ceil(Math.random() * 6);

        const getDice = (n) => ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'][n - 1];

        let winner, loser, resultText, color;

        if (roll1 > roll2) {
            winner = ch.challengerId;
            loser  = ch.targetId;
            resultText = `🏆 <@${winner}> wuu guulaystay!`;
            color = '#2ecc71';
        } else if (roll2 > roll1) {
            winner = ch.targetId;
            loser  = ch.challengerId;
            resultText = `🏆 <@${winner}> wuu guulaystay!`;
            color = '#2ecc71';
        } else {
            winner = null;
            loser  = null;
            resultText = `🤝 Iskumid — cidina cash ma lumiso!`;
            color = '#f1c40f';
        }

        if (winner && loser) {
            userData[winner].cash ??= Number.isFinite(userData[winner].usdBalance) ? userData[winner].usdBalance : 0;
            userData[loser].cash  ??= Number.isFinite(userData[loser].usdBalance) ? userData[loser].usdBalance : 0;
            userData[winner].cash += ch.amount;
            userData[loser].cash   = Math.max(0, (userData[loser].cash || 0) - ch.amount);
        }
        saveData();

        const resultEmbed = new EmbedBuilder()
            .setTitle('🎲 Tuur — Natiijada!')
            .setDescription(
                `<@${ch.challengerId}> **${getDice(roll1)} ${roll1}** vs **${getDice(roll2)} ${roll2}** <@${ch.targetId}>\n\n` +
                `${resultText}\n\n` +
                (winner && loser
                    ? `✅ <@${winner}> +$${ch.amount} cash → **$${(userData[winner].cash || 0).toFixed(2)}**\n` +
                      `❌ <@${loser}> −$${ch.amount} cash → **$${(userData[loser].cash || 0).toFixed(2)}**`
                    : `Khamaarka ($${ch.amount} cash) waa la soo celiyay.`)
            )
            .setColor(color);

        return interaction.update({ content: '', embeds: [resultEmbed], components: [] });
    }

    if (id.startsWith('tuur_decline_')) {
        const challengeId = id.replace('tuur_decline_', '');
        const ch = activeTuurChallengesMap.get(challengeId);

        if (!ch) return interaction.reply({ content: '⚠️ Codsigu wuu dhamaaday.', flags: 64 });
        if (interaction.user.id !== ch.targetId && interaction.user.id !== ch.challengerId) {
            return interaction.reply({ content: '⚠️ Adiga kuma codsanin.', flags: 64 });
        }

        activeTuurChallengesMap.delete(challengeId);
        return interaction.update({
            content: `❌ <@${ch.targetId}> wuu diidday ciyaarta.`,
            embeds: [],
            components: [],
        });
    }
}

module.exports.handleTuurInteraction = handleTuurInteraction;
module.exports.activeTuurChallenges = activeTuurChallenges;
