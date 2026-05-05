// =====================================================================
// AMARKA: ?rush  (interactive — bot wuxuu weydiinayaa tirada su'aalaha)
// Tusaale:
//   ?rush        → bot wuxuu weydiinayaa "Imisa su'aalood?" → user qoraa "30"
//   ?rush 30     → toos buu u bilaabmayaa 30 su'aalood
// =====================================================================

const { activeRush, isUserBusy } = require('../store');
const { pickQuestionsForGame, noQuestionsLeftEmbed } = require('../utils/questions');
const { sendRushQuestion } = require('../games/rush');
const {
    PREFIX, RUSH_MIN_QUESTIONS, RUSH_MAX_QUESTIONS, RUSH_DEFAULT_QUESTIONS,
} = require('../config');

async function startRush(message, count) {
    const userId = message.author.id;

    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }

    const requested = Math.min(count, 50);
    const initial   = pickQuestionsForGame(userId, 'rush', requested);
    if (!initial || initial.length === 0) {
        return message.reply({ embeds: [noQuestionsLeftEmbed(message.author.username)] });
    }
    // ⭐ Haddii batch-ka kowaad ay ka yar yihiin la codsaday → su'aalo cusub way dhammaadeen
    if (initial.length < requested) {
        await message.reply(
            `📚 Waxaa kuu hadhay **${initial.length}** su'aalood cusub kaliya (adigoo codsaday ${count}).\n` +
            `Rush-ku wuxuu noqonayaa **${initial.length}** su'aalood.`
        );
        count = initial.length;
    }

    activeRush.set(userId, { score: 0, questions: initial, totalQ: count, currentQ: 0 });
    sendRushQuestion(message, userId);
}

module.exports = async function rushCommand(message, args) {
    const userId = message.author.id;

    const busy = isUserBusy(userId);
    if (busy) {
        return message.reply(`⚠️ Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`);
    }

    // 1. Toos haddii lambar la qoray (?rush 30)
    if (args[0] !== undefined) {
        const count = parseInt(args[0]);
        if (isNaN(count) || count < RUSH_MIN_QUESTIONS || count > RUSH_MAX_QUESTIONS) {
            return message.reply(
                `⚠️ Tirada waa inay u dhexeyso **${RUSH_MIN_QUESTIONS}** iyo **${RUSH_MAX_QUESTIONS}**.\n` +
                `Tusaale: \`${PREFIX}rush 30\``
            );
        }
        return startRush(message, count);
    }

    // 2. Interactive — weydii user-ka
    await message.reply(
        `⚡ **${message.author.username}**, imisa su'aalood ayaad rabtaa Rush?\n` +
        `Qor lambar **${RUSH_MIN_QUESTIONS}** ilaa **${RUSH_MAX_QUESTIONS}** (tusaale: \`30\` ama \`50\`).\n` +
        `_(30 ilbiriqsi ayaad heysataa)_`
    );

    const filter    = m => m.author.id === userId && /^\d+$/.test(m.content.trim());
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });

    if (collected.size === 0) {
        return message.channel.send(`⏰ <@${userId}>, wakhti dhammaaday — \`${PREFIX}rush\` mar kale isku day.`);
    }

    const reply = collected.first();
    const count = parseInt(reply.content.trim());

    if (count < RUSH_MIN_QUESTIONS || count > RUSH_MAX_QUESTIONS) {
        return reply.reply(
            `⚠️ Tirada waa inay u dhexeyso **${RUSH_MIN_QUESTIONS}** iyo **${RUSH_MAX_QUESTIONS}**.\n` +
            `\`${PREFIX}rush\` mar kale isku day.`
        );
    }

    return startRush(reply, count);
};
