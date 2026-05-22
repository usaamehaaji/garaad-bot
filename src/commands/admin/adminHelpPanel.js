const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, getTreasury } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

const OWNER_ID = '1191096205955055690';

function buildAdminEmbed(uid) {
    const users = Object.entries(econData).filter(([k]) => !k.startsWith('__'));
    const t     = getTreasury();
    let totalBtc = 0, activeLoans = 0;
    for (const [, d] of users) {
        totalBtc   += d.btc || 0;
        if (d.loan?.owed > 0) activeLoans++;
    }
    const isOwner = uid === OWNER_ID;

    return new EmbedBuilder()
        .setTitle('⚙️ Admin Panel')
        .setColor('#8e44ad')
        .setDescription(
            `**🏛️ Treasury:** ${fmt(t.balance)} BTC\n` +
            `**👥 Players:** ${users.length} | **₿ Circulation:** ${fmt(totalBtc)} BTC\n` +
            `**💳 Active Loans:** ${activeLoans}\n\n` +
            `**Actions available:**\n` +
            `🧠 Give IQ  •  ₿ Give BTC  •  🏆 Champion  •  💬 DM\n` +
            `👥 Players  •  💳 Loans` +
            (isOwner ? `  •  🏛️ Top-up  •  💸 Tax\n🗑️ Reset User  •  ♻️ Reset All IQ  •  ♻️ Reset All Eco` : '')
        )
        .setFooter({ text: 'Garaad Admin' });
}

// Row 1: Give | Champion | DM User  (all admins)
function adminRow1(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_give_${uid}`)       .setLabel('🎁 Give')    .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`admin_aq_champion_${uid}`).setLabel('🏆 Champion').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`admin_aq_dm_${uid}`)      .setLabel('💬 DM User') .setStyle(ButtonStyle.Secondary),
    );
}

// Row 2: Players | [Top-up owner] | Loans | [Tax owner]
function adminRow2(uid) {
    const isOwner = uid === OWNER_ID;
    const btns = [
        new ButtonBuilder().setCustomId(`admin_eco_allplayers_${uid}`).setLabel('👥 Players').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_eco_loans_${uid}`)     .setLabel('💳 Loans')  .setStyle(ButtonStyle.Secondary),
    ];
    if (isOwner) {
        btns.splice(1, 0, new ButtonBuilder().setCustomId(`admin_eco_topup_${uid}`).setLabel('🏛️ Top-up').setStyle(ButtonStyle.Primary));
        btns.push(new ButtonBuilder().setCustomId(`admin_eco_tax_${uid}`).setLabel('💸 Tax').setStyle(ButtonStyle.Danger));
    }
    return new ActionRowBuilder().addComponents(...btns);
}

// Row 3: [Reset User owner] | [Reset All IQ owner] | [Reset All Eco owner] | Close
function adminRow3(uid) {
    const isOwner = uid === OWNER_ID;
    const btns = [
        new ButtonBuilder().setCustomId(`close_admin_help_${uid}`).setLabel('✖ Close').setStyle(ButtonStyle.Danger),
    ];
    if (isOwner) {
        btns.unshift(
            new ButtonBuilder().setCustomId(`admin_eco_reset_${uid}`)    .setLabel('🗑️ Reset User')  .setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`admin_aq_reset_${uid}`)     .setLabel('♻️ Reset All IQ') .setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`admin_eco_resetall_${uid}`) .setLabel('♻️ Reset All Eco').setStyle(ButtonStyle.Danger),
        );
    }
    return new ActionRowBuilder().addComponents(...btns);
}

function getRows(uid) {
    return [adminRow1(uid), adminRow2(uid), adminRow3(uid)];
}

module.exports = async function adminHelpPanel(message) {
    const uid = message.author.id;
    return message.reply({
        embeds:     [buildAdminEmbed(uid)],
        components: getRows(uid),
    });
};

module.exports.buildAdminEmbed        = buildAdminEmbed;
module.exports.getRows                = getRows;
module.exports.adminRow1              = adminRow1;
module.exports.adminRow2              = adminRow2;
module.exports.adminRow3              = adminRow3;
// Legacy exports used by interaction handler
module.exports.buildAdminAqoonEmbed   = buildAdminEmbed;
module.exports.adminAqoonMainRow      = adminRow1;
module.exports.adminAqoonMidRow       = adminRow2;
module.exports.adminAqoonFooterRow    = adminRow3;
