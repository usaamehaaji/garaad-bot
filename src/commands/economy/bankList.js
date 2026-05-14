const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

module.exports = async function bankListCmd(message) {
    const userId = message.author.id;

    // Bank deposits
    const bankEntries = Object.entries(econData)
        .filter(([k, d]) => !k.startsWith('__') && d && typeof d === 'object' && (d.banks?.garaad || 0) > 0)
        .map(([uid, d]) => ({ uid, garaad: d.banks.garaad }))
        .sort((a, b) => b.garaad - a.garaad);

    const grandGaraad = bankEntries.reduce((s, e) => s + e.garaad, 0);

    const bankLines = bankEntries.slice(0, 15).map((e, i) => {
        const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${rank} <@${e.uid}> — **$${fmt(e.garaad)}**`;
    });

    // Active loans
    const loanEntries = Object.entries(econData)
        .filter(([k, d]) => !k.startsWith('__') && d && d.loan && d.loan.owed > 0)
        .map(([uid, d]) => {
            const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - d.loan.takenAt) / 86400000));
            return { uid, owed: d.loan.owed, daysLeft };
        })
        .sort((a, b) => b.owed - a.owed);

    const loanLines = loanEntries.map((e, i) => {
        const urgency = e.daysLeft === 0 ? '🔴' : e.daysLeft === 1 ? '⚠️' : '💳';
        const timeStr = e.daysLeft > 0 ? `${e.daysLeft}m hadhay` : 'la jarayo!';
        return `${urgency} <@${e.uid}> — **$${fmt(e.owed)}** bixin | ${timeStr}`;
    });

    const embed = new EmbedBuilder()
        .setTitle('🏦 Garaad Bank — Liiska')
        .setColor('#3498db');

    let desc = '';
    if (bankLines.length > 0) {
        desc += `**🏦 Garaad Bank Macaamiisha:**\n${bankLines.join('\n')}\n\n`;
        desc += `💰 **Wadarta dhiggan:** $${fmt(grandGaraad)}\n\n`;
    } else {
        desc += '_Cidna lacag Garaad Bank kuma dhigin._\n\n';
    }

    if (loanLines.length > 0) {
        desc += `**💳 Deen Socda (${loanEntries.length} qof):**\n${loanLines.join('\n')}`;
    } else {
        desc += '_Cidna deen haatan kama qaatin._';
    }

    embed.setDescription(desc);
    embed.setFooter({ text: `${bankEntries.length} macaamiil • ${loanEntries.length} deen • Garaad Economy` });

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_banklist_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [closeRow] });
};
