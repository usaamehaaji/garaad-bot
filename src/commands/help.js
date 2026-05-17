// =====================================================================
// AMARKA: ?caawin / ?help
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../config');
const { isUserBusy } = require('../store');

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
        ? `\n🟢 **Hadda ciyaarahaaga: ${GAME_LABELS[activeGame] || activeGame}**\n`
        : `\n⚪ Hadda game ma ciyaaraysid\n`;

    return new EmbedBuilder()
        .setTitle('🎓 Education — Ciyaaraha & Amarrada')
        .setColor('#2ecc71')
        .setDescription(
            statusLine +
            `\n**🎮 Ciyaaraha**\n` +
            `**\`${PREFIX}solo\`** — Su'aal kuu yimaada, jawaab si degdeg ah\n` +
            `**\`${PREFIX}duel @qof\`** — La ciyaar qof, IQ ayaa danbeeysa\n` +
            `**\`${PREFIX}deul 2v2 usd 10000\`** — Team duel: 1v1/2v2/3v3\n` +
            `**\`${PREFIX}quiz\`** — Koox la ciyaar, waa la tartamaa\n\n` +

            `**🏆 Tartan (Tournament)**\n` +
            `**\`${PREFIX}tartan\`** — ⚙️ \`Admin\` Bilow tartan cusub\n` +
            `**\`${PREFIX}tartan_bilow\`** — ⚙️ \`Admin\` Degdeg u fur wareegga\n` +
            `**\`${PREFIX}tartan_jooji\`** — ⚙️ \`Admin\` Tartan jooji\n` +
            `**\`${PREFIX}tartan_status\`** — Xaaladda tartanka hadda\n` +
            `**\`${PREFIX}isdiiwaangeli\`** — Ku diiwaangeli tartanka\n` +
            `**\`${PREFIX}gal CODE\`** — Game ku biir (code-ka DM-kaaga)\n\n` +

            `**📊 Dhibcaha & IQ**\n` +
            `**\`${PREFIX}today\`** — Maalin kasta nasiib ku hel\n` +
            `**\`${PREFIX}exchange\`** — Dhibcaha IQ ku badal\n\n` +

            `**👤 Profile**\n` +
            `**\`${PREFIX}profile\`** — IQ, level iyo dhibcahaaga\n` +
            `**\`${PREFIX}top\`** — Liiska 15-ka ugu IQ sarreeya\n` +
            `**\`${PREFIX}statistics\`** — Tirakoobkaaga guud\n\n` +

            `**💬 Kale**\n` +
            `**\`${PREFIX}dm <fariin>\`** — Admin u dir fikrad ama talo\n` +
            `**\`${PREFIX}cilada [fariin]\`** — Cilad soo sheeg`
        )
        .setFooter({ text: `Prefix: ${PREFIX} • ⚙️ = Admin kaliya` });
}

function buildEcoEmbed() {
    return new EmbedBuilder()
        .setTitle('💰 Economy — Dhaqaalaha')
        .setColor('#f39c12')
        .setDescription(
            `👤 **Personal**\n` +
            `**\`${PREFIX}jeeb\`** — Wallet, Banks, iyo Assets-kaaga\n` +
            `**\`${PREFIX}shaqo\`** — Shaqeyso 250 Gold hel (9 saacadood)\n` +
            `**\`${PREFIX}today\`** — Maalin kasta 250 BTC + IQ hel\n\n` +

            `🏦 **Bangiga & Deen**\n` +
            `**\`${PREFIX}ebank\`** — Garaad Bank (deposit 1%/maalin) + Deen (Khamiis–Jimce)\n` +
            `**\`${PREFIX}list\`** — Dadka lacagaha bankiga ku haya\n\n` +

            `🎮 **Ciyaarta**\n` +
            `**\`${PREFIX}trade\`** — Suuqa live: saadaal UP/DOWN, iibso, iib assets\n` +
            `**\`${PREFIX}ef\`** — 50/50 gamar — guul +90%, khasaaro −100%\n` +
            `**\`${PREFIX}shop\`** — Dukaanka economy (xirfad titles)\n` +
            `**\`${PREFIX}etitle [key]\`** — Xirfadahaaga arag / dhig\n\n` +

            `🤝 **Bulshada**\n` +
            `**\`${PREFIX}give @user\`** — Lacag u dir (max $5,000/maalin)\n` +
            `**\`${PREFIX}rob @user\`** — Lacag ka xad\n` +
            `**\`${PREFIX}rich\`** — TOP 10 ugu taajirta`
        )
        .setFooter({ text: `Garaad Economy` });
}


module.exports = async function helpCommand(message) {
    const userId = message.author.id;
    return message.reply({ embeds: [buildEduEmbed(userId)], components: [helpRow(userId, 'edu')] });
};

module.exports.buildEduEmbed = buildEduEmbed;
module.exports.buildEcoEmbed = buildEcoEmbed;
module.exports.helpRow       = helpRow;
