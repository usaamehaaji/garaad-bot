// =====================================================================
// AMARKA: ?caawin / ?help
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../config');
const { isAdmin } = require('../utils/admin');

module.exports = async function helpCommand(message) {
    const userId = message.author.id;

    let description =
        `Ku soo dhawoow **Garaad Quiz Bot v3**. Hoos waxaa ku qoran amarrada oo qaybo loo kala saaray:\n\n` +

        `🎲 **Ciyaaraha**\n` +
        `\`${PREFIX}solo\` - Ciyaar shakhsi ah\n` +
        `\`${PREFIX}duel @user\` - Dagaal labo qof\n` +
        `\`${PREFIX}row @user\` - 4-in-a-row style\n` +
        `\`${PREFIX}quiz\` - Quiz kooxeed\n` +
        `\`${PREFIX}tuur @user [xaddi]\` - Diisku Ciyaar — khamaar IQ tuurnimada\n\n` +

        `📈 **Forex & Crypto**\n` +
        `\`${PREFIX}trade\` - Ganacsi Forex/Crypto\n` +
        `\`${PREFIX}jeeb\` - Fiiri lacagta iyo hantidaada\n` +
        `\`${PREFIX}suuq\` - Arag suuqa iyo qiimaha SOS\n` +
        `\`${PREFIX}password 1234\` - Samee password ka hor trade\n\n` +

        `💸 **Dhaqaale & Ammaanka**\n` +
        `\`${PREFIX}hadyad @user 1000 sos\` - Dir SOS saaxiib\n` +
        `\`${PREFIX}hadyad @user 1000 iq\` - Dir IQ saaxiib\n` +
        `\`${PREFIX}xatooyo @user\` - Isku day inaad xado hantida\n` +
        `\`${PREFIX}dhumasho\` - Qarso jeebkaaga 1 saac (10,000 IQ)\n\n` +

        `🛒 **Dukaanka**\n` +
        `\`${PREFIX}bet [amount]\` - Khamaar IQ\n` +
        `\`${PREFIX}shop\` - Fur dukaanka\n` +
        `\`${PREFIX}buy [item]\` - Iibso item\n\n` +

        `👤 **Profile & Xogtaada**\n` +
        `\`${PREFIX}profile\` - Arag profile-kaaga\n` +
        `\`${PREFIX}statistics\` - Tirakoobkaaga\n` +
        `\`${PREFIX}top\` - Top 10\n` +
        `\`${PREFIX}today\` - Dhibco maalinle ah\n\n` +

        `🛠️ **Caawinaad**\n` +
        `\`${PREFIX}caawin\` - Liiska caawinta\n` +
        `\`${PREFIX}cilada [farriin]\` - Soo sheeg cilad`;

    if (isAdmin(userId)) {
        description +=
            `\n\n👑 **Admin** — tilmaamaha tartanka & farriinta dadka: \`${PREFIX}admin help\``;
    }

    const embed = new EmbedBuilder()
        .setTitle('📖 Garaad Quiz - Liiska Amarrada')
        .setDescription(description)
        .setColor('#3498db')
        .setFooter({ text: 'Garaad Quiz Bot v3' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_help_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
