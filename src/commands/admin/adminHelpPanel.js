// =====================================================================
// ?admin help — picker labo button (Aqoon / Dhaqaale)
// Embed ma soo baxdo ilaa la doorto
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../../config');

function buildAdminAqoonEmbed() {
    return new EmbedBuilder()
        .setTitle('🧠 Admin — Aqoon Commands')
        .setColor('#3498db')
        .setDescription(
            `**IQ / XP / Reset:**\n` +
            `\`${PREFIX}admin reward @user iq [qad]\` — sii IQ\n` +
            `\`${PREFIX}admin reward @user xp [qad]\` — sii XP\n` +
            `\`${PREFIX}admin reset @user\` — dib u dejii IQ, XP, darajo\n\n` +

            `**Champion:**\n` +
            `\`${PREFIX}admin givechampion @user\` — siin 🏆 Champion\n` +
            `\`${PREFIX}admin removechampion @user\` — ka qaad Champion\n\n` +

            `**Tartan:**\n` +
            `\`${PREFIX}tartan_bilow\` — fur channel tartanka\n` +
            `\`${PREFIX}admin stop\` — jooji tartanka\n` +
            `\`${PREFIX}isdiiwaangeli\` — qofka: hel code DM\n` +
            `\`${PREFIX}gal CODE\` — gal channel tartanka\n` +
            `\`${PREFIX}admin_next\` — bilow wareeg / xiga\n\n` +

            `**Maamulka Admin-nada:**\n` +
            `\`${PREFIX}admin add @user\` — ku dar admin\n` +
            `\`${PREFIX}admin remove @user\` — ka saar admin\n` +
            `\`${PREFIX}admin list\` — liiska admin-nada\n\n` +

            `**Xiriirka:**\n` +
            `\`${PREFIX}admin dm @user [fariin]\` — DM qof gaar ah\n` +
            `\`${PREFIX}adall [fariin]\` — DM dhammaan ciyaareyaasha\n` +
            `\`${PREFIX}admin bugs\` — daawada ciladaha`
        )
        .setFooter({ text: 'Kaliya admin — Riix 💰 Dhaqaale si aad u aragto economy commands' });
}

function buildAdminDhaqaaleEmbed() {
    return new EmbedBuilder()
        .setTitle('💰 Admin — Dhaqaale Commands')
        .setColor('#e74c3c')
        .setDescription(
            `**Siinta Assets:**\n` +
            `\`${PREFIX}admin give cash @user <qad>\` — sii USD cash\n` +
            `\`${PREFIX}admin give btc @user <qad>\` — sii Bitcoin\n` +
            `\`${PREFIX}admin give eur @user <qad>\` — sii Euro\n` +
            `\`${PREFIX}admin give gold @user <qad>\` — sii Gold\n` +
            `\`${PREFIX}admin give sos @user <qad>\` — sii Shilinka Soomali\n\n` +

            `**Qaadista Assets:**\n` +
            `\`${PREFIX}admin take <asset> @user <qad>\` — ka qaad asset\n\n` +

            `**Maamulka Users:**\n` +
            `\`${PREFIX}admin info @user\` — xogta dhaqaalaha user\n` +
            `\`${PREFIX}admin users [bog]\` — liiska users-ka (cash)\n` +
            `\`${PREFIX}admin ereset @user\` — dib u dejii ($500 + 0 hanti)\n` +
            `\`${PREFIX}admin shield @user\` — toggle shield (7 maalmood)`
        )
        .setFooter({ text: 'Kaliya admin — Riix 🧠 Aqoon si aad u aragto quiz commands' });
}

module.exports = async function adminHelpPanel(message) {
    const uid = message.author.id;

    const pickerEmbed = new EmbedBuilder()
        .setTitle('👑 Admin Panel — Doorasho')
        .setDescription('**Maxaad rabtaa inaad maamusho?**\n\nRiix badhanka ku habboon.')
        .setColor('#e67e22');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`admin_aqoon_${uid}`)
            .setLabel('🧠 Aqoon')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`admin_dhaqaale_${uid}`)
            .setLabel('💰 Dhaqaale')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`close_admin_help_${uid}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [pickerEmbed], components: [row] });
};

module.exports.buildAdminAqoonEmbed    = buildAdminAqoonEmbed;
module.exports.buildAdminDhaqaaleEmbed = buildAdminDhaqaaleEmbed;
