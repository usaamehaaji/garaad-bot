// =====================================================================
// ?admin help — Aqoon Commands Panel
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../../config');

function buildAdminAqoonEmbed() {
    return new EmbedBuilder()
        .setTitle('🧠 Admin — Aqoon Commands')
        .setColor('#3498db')
        .setDescription(
            `**IQ / Reset**\n` +
            `• \`${PREFIX}admin reward @user iq [qad]\` — sii IQ\n` +
            `• \`${PREFIX}admin reset @user\` — dib u dejii IQ, darajo\n\n` +

            `**Champion**\n` +
            `• \`${PREFIX}admin givechampion @user\` — sii 🏆 Champion\n` +
            `• \`${PREFIX}admin removechampion @user\` — ka qaad Champion\n\n` +

            `**Maamulka Admin-nada**\n` +
            `• \`${PREFIX}admin add @user\` — ku dar admin\n` +
            `• \`${PREFIX}admin remove @user\` — ka saar admin\n` +
            `• \`${PREFIX}admin list\` — liiska admin-nada\n\n` +

            `**Xiriirka**\n` +
            `• \`${PREFIX}admin dm @user [fariin]\` — DM qof gaar ah\n` +
            `• \`${PREFIX}adall [fariin]\` — DM dhammaan ciyaareyaasha\n` +
            `• \`${PREFIX}admin bugs\` — daawo ciladaha`
        );
}

function adminAqoonActionsRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_aq_giveiq_${uid}`).setLabel('🧠 Give IQ').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`admin_aq_champion_${uid}`).setLabel('🏆 Champion').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`admin_aq_dm_${uid}`).setLabel('💬 DM User').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_aq_reset_${uid}`).setLabel('🗑️ Reset').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`admin_aq_resetall_${uid}`).setLabel('♻️ Reset All').setStyle(ButtonStyle.Danger),
    );
}

function adminTabRow(uid, active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`admin_aqoon_${uid}`)
            .setLabel('🧠 Aqoon')
            .setStyle(active === 'aqoon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`admin_eco_${uid}`)
            .setLabel('💰 Economy')
            .setStyle(active === 'eco' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_admin_help_${uid}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function adminHelpPanel(message) {
    const uid = message.author.id;
    return message.reply({
        embeds:     [buildAdminAqoonEmbed()],
        components: [adminTabRow(uid, 'aqoon'), adminAqoonActionsRow(uid)],
    });
};

module.exports.buildAdminAqoonEmbed   = buildAdminAqoonEmbed;
module.exports.adminAqoonActionsRow   = adminAqoonActionsRow;
module.exports.adminTabRow            = adminTabRow;
