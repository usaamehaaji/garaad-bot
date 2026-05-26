// =====================================================================
// AMARKA: ?caawin / ?help
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../../src/config');
const { isUserBusy } = require('../../src/store');

function helpRow(userId, active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`help_edu_${userId}`)
            .setLabel('🎓 Education')
            .setStyle(active === 'edu' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`help_eco_${userId}`)
            .setLabel('💰 Economy')
            .setStyle(active === 'eco' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_help_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

const GAME_LABELS = { solo: '🎯 Solo', duel: '⚔️ Duel', quiz: '📝 Quiz', tournament: '🏆 Tartan' };

function buildEduEmbed(userId) {
    const activeGame = userId ? isUserBusy(userId) : null;
    const statusLine = activeGame
        ? `\n🟢 **Ciyaarahaaga hadda: ${GAME_LABELS[activeGame] || activeGame}**\n`
        : `\n⚪ Hadda game ma ciyaaraysid\n`;

    return new EmbedBuilder()
        .setTitle('🎓 Education — Ciyaaraha & Amarrada')
        .setColor('#2ecc71')
        .setDescription(
            statusLine +
            `\n**🎮 Ciyaaraha**\n` +
            `**\`${PREFIX}solo\`** — Su'aal kuu yimaada, jawaab degdeg\n` +
            `**\`${PREFIX}duel @qof\`** — Tartam qof, IQ ayaa danbeeysa\n` +
            `**\`${PREFIX}deul 2v2\`** — Team duel (1v1 / 2v2 / 3v3)\n` +
            `**\`${PREFIX}quiz\`** — Koox la ciyaar, tartam\n\n` +

            `**🏆 Tartan**\n` +
            `**\`${PREFIX}tartan\`** — ⚙️ Admin: Bilow tartan cusub\n` +
            `**\`${PREFIX}isdiiwaangeli\`** — Ku diiwaangeli tartanka\n` +
            `**\`${PREFIX}tartan_status\`** — Xaaladda tartanka hadda\n` +
            `**\`${PREFIX}gal CODE\`** — Game ku biir (code DM-kaaga)\n\n` +

            `**👤 Profile**\n` +
            `**\`${PREFIX}profile\`** — IQ, level iyo statskaaga\n` +
            `**\`${PREFIX}top\`** — Top 15 IQ\n` +
            `\n` +

            `**💬 Kale**\n` +
            `**\`${PREFIX}dm <fariin>\`** — Admin u dir fikrad ama talo\n` +
            `**\`${PREFIX}cilada [fariin]\`** — Cilad soo sheeg`
        )
        .setFooter({ text: `Prefix: ${PREFIX} • ⚙️ = Admin kaliya` });
}

function buildEcoEmbed() {
    return new EmbedBuilder()
        .setTitle('💰 Economy — Bitcoin System')
        .setColor('#f39c12')
        .setDescription(
            `**👤 Lacagta**\n` +
            `**\`${PREFIX}jeeb\`** — Jeebkaaga, bank iyo deynta\n` +
            `**\`${PREFIX}shaqo\`** — Shaqo 8h mar → +150 BTC\n` +
            `**\`${PREFIX}today\`** — Maalin kasta: +250 BTC + 3 IQ (24h)\n\n` +

            `**🏦 Bank & Deyn**\n` +
            `**\`${PREFIX}ebank\`** — Garaad Bank (1%/day) + Deyn (Khamiis–Jimce)\n` +
            `**\`${PREFIX}list\`** — Liiska bank iyo deynta firfircoon\n\n` +

            `**🎮 Ciyaaraha**\n` +
            `**\`${PREFIX}trade\`** — Suuqa: BTC UP/DOWN saadaal\n` +
            `**\`${PREFIX}ef 300 up\`** ama **\`down\`** — 50/50: WIN 2× ama LOSS\n\n` +

            `**🤝 Bulshada**\n` +
            `**\`${PREFIX}give @user btc 200\`** — BTC u dir player\n` +
            `**\`${PREFIX}rich\`** — Top 10 qof ugu hantida badan dhaqaalaha`
        )
        .setFooter({ text: `Garaad Economy • Bitcoin kaliya` });
}


module.exports = async function helpCommand(message) {
    const userId = message.author.id;
    return message.reply({ embeds: [buildEduEmbed(userId)], components: [helpRow(userId, 'edu')] });
};

module.exports.buildEduEmbed = buildEduEmbed;
module.exports.buildEcoEmbed = buildEcoEmbed;
module.exports.helpRow       = helpRow;
