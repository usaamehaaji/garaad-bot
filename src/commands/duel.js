// =====================================================================
// AMARKA: ?duel @user [tirada]
// Tusaale:
//   ?duel @user        → bot wuxuu weydiinayaa labadooda tirada (interactive)
//   ?duel @user 10     → toos buu u dirayaa casuumad 10 su'aalood ah
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { activeDuels, isUserBusy } = require('../store');
const { PREFIX, GLOBAL_WAIT_MS, DUEL_MIN_QUESTIONS, DUEL_MAX_QUESTIONS } = require('../config');

module.exports = async function duelCommand(message, args) {
    const userId = message.author.id;
    const target = message.mentions.users.first();

    if (!target)              return message.reply(`Isticmaal sidan: \`${PREFIX}duel @user\` ama \`${PREFIX}duel @user 10\``);
    if (target.bot)           return message.reply('Bot lama dagaallami karo.');
    if (target.id === userId) return message.reply('Naftaada lama dagaallami kartid.');

    if (activeDuels.has(message.channel.id)) {
        return message.reply('⚠️ Channel-kan mar hore ayaa dagaal ka socda. Sug ilaa uu dhamaado.');
    }

    // Hubi labadooduba inaanan ku jirin ciyaar kale
    const issuerBusy = isUserBusy(userId);
    if (issuerBusy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${issuerBusy}**! Sug ilaa ay dhammaato.`);
    }
    const targetBusy = isUserBusy(target.id);
    if (targetBusy) {
        return message.reply(`⚠️ <@${target.id}> wuxuu mar hore ku jiraa ciyaar **${targetBusy}**! Sug ilaa ay dhammaato.`);
    }

    // ⭐ Hubi haddii tirada toos loo qoray (?duel @user 10)
    let count = 0;
    const numArg = args.find(a => /^\d+$/.test(a));
    if (numArg) {
        count = parseInt(numArg);
        if (count < DUEL_MIN_QUESTIONS || count > DUEL_MAX_QUESTIONS) {
            return message.reply(
                `⚠️ Tirada waa inay u dhexeyso **${DUEL_MIN_QUESTIONS}** iyo **${DUEL_MAX_QUESTIONS}**.\n` +
                `Tusaale: \`${PREFIX}duel @${target.username} 10\``
            );
        }
    }

    const countLine = count > 0
        ? `**Tirada su'aalaha:** ${count}\n`
        : `**Tirada su'aalaha:** Bot wuxuu weydiinayaa labadiina marka aad aqbasho.\n`;

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Duel Codsi')
        .setDescription(
            `<@${userId}> wuxuu ku casuumayaa <@${target.id}> dagaal fool-ka-fool ah!\n\n` +
            countLine +
            `**Sida ay u shaqayso:** Qofka ugu horreeya ee si sax ah u jawaaba ayaa dhibic helaya.\n` +
            `**Abaalgudka:** Qofka guulaysta wuxuu ka qaadanayaa ilaa **5 IQ**.\n\n` +
            `<@${target.id}>, ma aqbalaysaa? *(${GLOBAL_WAIT_MS / 1000} ilbiriqsi)*`
        )
        .setColor('#e74c3c');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`accept_duel_${userId}_${target.id}_${count}`)
            .setLabel('Aqbal ✅')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`decline_duel_${userId}_${target.id}`)
            .setLabel('Diid ❌')
            .setStyle(ButtonStyle.Danger),
    );

    const sent = await message.reply({
        content:    `${target}`,
        embeds:     [embed],
        components: [row],
        fetchReply: true,
    });

    setTimeout(async () => {
        try {
            const fresh = await sent.fetch().catch(() => null);
            if (!fresh || fresh.components.length === 0) return;
            await sent.edit({
                content:    '⏰ Duel codsigii waqti dhammaaday — laguma jawaabin.',
                embeds:     [],
                components: [],
            }).catch(() => {});
        } catch {}
    }, GLOBAL_WAIT_MS);
};
