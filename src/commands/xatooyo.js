const { createHeist, guessHeist, getHeistState } = require('../games/heist');
const { checkUser } = require('../utils/helpers');

module.exports = async function xatooyoCommand(message, args) {
    const robberId = message.author.id;
    checkUser(robberId);

    const mention = message.mentions.users.first();
    const numericGuess = args.find((arg) => /^[0-9]{4}$/.test(arg));

    if (mention && !numericGuess) {
        const victimId = mention.id;
        if (victimId === robberId) {
            return message.reply('Ma xadin kartid naftaada.');
        }
        const result = createHeist(robberId, victimId);
        if (result.error) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply(
            `🔐 Waxaad isku dayeysaa xatooyo. Hal lambarka sirta ah ayaa la muujiyay: \`${result.pattern}\`. ` +
            'Hadda isticmaale `?xatooyo 1234` si aad u qiyaasto sirta oo dhan. Waxaa kugu harsan 3 isku day.'
        );
    }

    if (numericGuess) {
        const state = getHeistState(robberId);
        if (!state) {
            return message.reply('Ma jiro xatooyo socda. Bilow `?xatooyo @user` marka hore.');
        }
        const result = guessHeist(robberId, numericGuess);
        if (result.error) {
            return message.reply(`❌ ${result.error}`);
        }
        if (result.success) {
            return message.reply(`✅ ${result.message}`);
        }
        if (result.failure) {
            let reply = `⚠️ ${result.message}`;
            if (result.penalty) {
                reply += ' Waxaa lagaa jaray 10,000 IQ.';
            }
            return message.reply(reply);
        }
    }

    return message.reply('Fadlan isticmaal `?xatooyo @user` ama `?xatooyo 1234` haddii aad qiyaasayso sirta.');
};
