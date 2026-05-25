// =====================================================================
// AMARKA: ?solo  (interactive — bot wuxuu weydiinayaa tirada su'aalaha)
// Tusaale:
//   ?solo        → bot wuxuu weydiinayaa "Imisa su'aalood?" → user qoraa "10"
//   ?solo 10     → toos buu u bilaabmayaa 10 su'aalood
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { isUserBusy, activeGames, userData, saveData } = require('../../src/store');
const { pickQuestionsForGame, noQuestionsLeftEmbed } = require('../../src/utils/questions');
const { sendQuestion } = require('../../src/games/solo');
const { checkUser } = require('../../src/utils/helpers');
const { PREFIX, SOLO_MIN_QUESTIONS, SOLO_MAX_QUESTIONS, SOLO_DEFAULT_QUESTIONS } = require('../../src/config');

function soloIntroEmbed() {
    return new EmbedBuilder()
        .setTitle('📘 Macallin — Solo')
        .setDescription(
            '**Sida loo ciyaaro:**\n' +
            '• Jawaab **sax** ah → **+3 IQ**\n' +
            '• Jawaab **qalad** ama **waqti dhammaaday** → **−1 IQ**\n\n' +
            'Haddii IQ-gu uu hooseeyo, isticmaal `?today` (maalin kasta) ama ka qayb gal `?quiz` si aad u hesho dhibco aad u badasho `?exchange`.'
        )
        .setColor('#3498db');
}

// Sharrax: bilow ciyaarta solo iyada oo la isticmaalayo tirada gaarka ah
async function startSoloGame(message, count) {
    const userId = message.author.id;

    checkUser(userId);
    const d = userData[userId];

    // Hubi xadka 30 IQ maalintiiba
    const dayKey = new Date().toISOString().slice(0, 10);
    if (d.soloIqDayKey !== dayKey) { d.soloIqDayKey = dayKey; d.soloIqToday = 0; saveData(); }
    if ((d.soloIqToday || 0) >= 30) {
        const { EmbedBuilder } = require('discord.js');
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🚫 Solo — Xadka Maanta Waad Gaartay!')
                .setDescription(
                    `✅ Maanta **30 IQ** solo kasoo helatay — xad maalinlaha ah.\n\n` +
                    `Ciyaar kuwa kale si aad IQ u hesho:\n` +
                    `🎓 \`${PREFIX}quiz\` — Tartan koox\n` +
                    `⚔️ \`${PREFIX}duel @qof\` — Tartam qof kale\n\n` +
                    `_Solo dib ayuu u furmayaa berri._`
                )
                .setColor('#e74c3c'),
        ]});
    }

    if (!d.seenSoloIntro || d.iq <= 0) {
        await message.reply({ embeds: [soloIntroEmbed()] });
        if (d.iq > 0) {
            d.seenSoloIntro = true;
            saveData();
        }
    }

    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }

    const picked = pickQuestionsForGame(userId, 'solo', count);
    if (!picked || picked.length === 0) {
        return message.reply({ embeds: [noQuestionsLeftEmbed(message.author.username)] });
    }

    // ⭐ Haddii su'aalo cusub ka yar yihiin tirada la codsaday → ka warbixi
    let actualCount = picked.length;
    if (actualCount < count) {
        await message.reply(
            `📚 **${message.author.username}**, waxaa kuu hadhay **${actualCount}** su'aalood oo aanad weligaa arkin (adigoo codsaday ${count}).\n` +
            `Ciyaartu waxay socon doontaa **${actualCount}** su'aalood — su'aalo cusub ayaa kuu furmaya marka muddada laba toddobaad ee hore ka dhammaato.`
        );
    }

    activeGames.set(userId, { questions: picked, total: actualCount, originMsg: message });
    sendQuestion(message, 1);
}

module.exports = async function soloCommand(message, args) {
    const userId = message.author.id;

    // 1. Hubi in user-ku ku jiro ciyaar kale
    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }

    // 2. Haddii user-ku tilmaamay tirada toos ah (?solo 10), bilow toos
    if (args[0] !== undefined) {
        const count = parseInt(args[0]);
        if (isNaN(count) || count < SOLO_MIN_QUESTIONS || count > SOLO_MAX_QUESTIONS) {
            return message.reply(
                `⚠️ Tirada waa inay u dhexeyso **${SOLO_MIN_QUESTIONS}** iyo **${SOLO_MAX_QUESTIONS}**.\n` +
                `Tusaale: \`${PREFIX}solo 10\``
            );
        }
        return startSoloGame(message, count);
    }

    // 3. Haddii kale, weydii user-ka tirada (interactive)
    await message.reply(
        `🎯 **${message.author.username}**, imisa su'aalood ayaad rabtaa?\n` +
        `Qor lambar **${SOLO_MIN_QUESTIONS}** ilaa **${SOLO_MAX_QUESTIONS}** (tusaale: \`10\` ama \`25\`).\n` +
        `_(30 ilbiriqsi ayaad heysataa — haddii kale waa la tirtirayaa)_`
    );

    const filter    = m => m.author.id === userId && /^\d+$/.test(m.content.trim());
    const collected = await message.channel.awaitMessages({
        filter, max: 1, time: 30000,
    });

    if (collected.size === 0) {
        return message.channel.send(`⏰ <@${userId}>, wakhti dhammaaday — \`${PREFIX}solo\` mar kale isku day.`);
    }

    const reply = collected.first();
    const count = parseInt(reply.content.trim());

    if (count < SOLO_MIN_QUESTIONS || count > SOLO_MAX_QUESTIONS) {
        return reply.reply(
            `⚠️ Tirada waa inay u dhexeyso **${SOLO_MIN_QUESTIONS}** iyo **${SOLO_MAX_QUESTIONS}**.\n` +
            `\`${PREFIX}solo\` mar kale isku day.`
        );
    }

    return startSoloGame(reply, count);
};
