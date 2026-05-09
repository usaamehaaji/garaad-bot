// =====================================================================
// AMARKA: ?caawin / ?help
// Labo button: Aqoon / Dhaqaale
// Dhaqaalaha: "Update socda — dhami la saaray"
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../config');

function buildAqoonEmbed() {
    return new EmbedBuilder()
        .setTitle('🧠 Garaad — Ciyaaraha Aqoonta')
        .setColor('#3498db')
        .setDescription(
            `🎮 **CIYAARAHA**\n\n` +
            `\`${PREFIX}solo\` — Ciyaar kaligaa\n` +
            `  ⚡ < 5s = **40 dhibcood** · 18s = **5 dhibcood**\n` +
            `  🔥 Streak: jawaabo si joogta ah → **bonus dhibcood!**\n\n` +
            `\`${PREFIX}duel @user\` — La tartan qof: labadu dhigaan **5 IQ**, guuleystaha **+10 IQ**\n` +
            `\`${PREFIX}quiz\` — Tartanka kooxda; dhibcaha u badal XP/IQ\n` +
            `\`${PREFIX}blitz\` — ⚡ Kii ugu horeeyaa ee sax u jawaaba ayaa dhibco helaya!\n\n` +

            `🏆 **TARTAN (Tournament)**\n\n` +
            `\`${PREFIX}tartan\` — Dhawaaqid + Register button\n` +
            `\`${PREFIX}isdiiwaangeli\` — Hel code tartanka (DM)\n` +
            `\`${PREFIX}gal CODE\` — Ku biir tartanka marka la furo\n` +
            `\`${PREFIX}tartan_status\` — Xaaladda tartanka hadda socda\n\n` +
            `**Wareegyada:** R1=25 · R2=20 · Final=15 su'aalood\n\n` +

            `👤 **PROFILE**\n\n` +
            `\`${PREFIX}profile [@user]\` — IQ, XP, darajadaada\n` +
            `\`${PREFIX}top\` — 15-ka ugu IQ-da sarreeya\n` +
            `\`${PREFIX}today\` — **+5 IQ + 100 XP** maalin kasta\n` +
            `\`${PREFIX}exchange xp\` / \`${PREFIX}exchange iq\` — Badal dhibcaha quiz\n\n` +

            `🏷️ **DARAJOOYINKA**\n\n` +
            `\`${PREFIX}titles\` — Dhammaan darajooyinka aad haysato\n\n` +

            `🛠️ **KALE**\n\n` +
            `\`${PREFIX}cilada [fariin]\` — Soo sheeg cilad`
        )
        .setFooter({ text: `Garaad Quiz • Prefix: ${PREFIX}` });
}

function buildDhaqaaleEmbed() {
    return new EmbedBuilder()
        .setTitle('💰 Garaad Markets v2')
        .setColor('#f39c12')
        .setDescription(
            `System dhaqaale cusub ayaa lagu dhisayaa Garaad Bot.\n` +
            `Wax weyn ayaa soo socda. 🚀\n\n` +
            `**🔮 Soon:**\n` +
            `💵 Markets\n` +
            `🏦 Bank\n` +
            `🛒 Trading\n` +
            `📈 Companies\n` +
            `💎 Rare Assets\n\n` +
            `⏳ Economy-ga hadda waa xiran yahay inta update-ku socdo.\n\n` +
            `\`${PREFIX}solo\` · \`${PREFIX}duel\` · \`${PREFIX}quiz\` · \`${PREFIX}tartan\``
        )
        .setFooter({ text: 'Garaad Markets v2 — Coming Soon' });
}

module.exports = async function helpCommand(message) {
    const userId = message.author.id;

    const pickerEmbed = new EmbedBuilder()
        .setTitle('📚 Garaad — Caawimaad')
        .setDescription('**Maxaad rabtaa inaad aragto?**\n\nRiix badhanka ku habboon.')
        .setColor('#2c3e50');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`help_aqoon_${userId}`)
            .setLabel('🧠 Aqoon')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`help_dhaqaale_${userId}`)
            .setLabel('💰 Dhaqaale')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_help_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [pickerEmbed], components: [row] });
};

module.exports.buildAqoonEmbed    = buildAqoonEmbed;
module.exports.buildDhaqaaleEmbed = buildDhaqaaleEmbed;
