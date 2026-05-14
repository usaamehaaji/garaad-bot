const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData } = require('../../economy/econStore');

module.exports = async function bankListCmd(message) {
    const entries = Object.entries(econData)
        .map(([uid, d]) => ({
            uid,
            mandeeq: d.banks?.mandeeq || 0,
            garaad:  d.banks?.garaad  || 0,
            total:   (d.banks?.mandeeq || 0) + (d.banks?.garaad || 0),
        }))
        .filter(e => e.total > 0)
        .sort((a, b) => b.total - a.total);

    if (entries.length === 0) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🏦 Banks — Liiska Macaamiisha')
                .setColor('#7f8c8d')
                .setDescription('_Cidna lacag bank kuma dhigin._')
                .setFooter({ text: 'Garaad Economy' }),
        ]});
    }

    const grandMandeeq = entries.reduce((s, e) => s + e.mandeeq, 0);
    const grandGaraad  = entries.reduce((s, e) => s + e.garaad,  0);
    const grandTotal   = grandMandeeq + grandGaraad;

    const lines = entries.slice(0, 20).map((e, i) => {
        const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const parts = [];
        if (e.mandeeq > 0) parts.push(`M: $${e.mandeeq.toLocaleString()}`);
        if (e.garaad  > 0) parts.push(`G: $${e.garaad.toLocaleString()}`);
        return `${rank} <@${e.uid}> — **$${e.total.toLocaleString()}** (${parts.join(' | ')})`;
    });

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_banklist_${message.author.id}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🏦 Banks — Liiska Macaamiisha')
            .setColor('#3498db')
            .setDescription(lines.join('\n'))
            .addFields({
                name: '📊 Wadarta Guud',
                value:
                    `🏦 Mandeeq: **$${grandMandeeq.toLocaleString()}**\n` +
                    `🏦 Garaad:  **$${grandGaraad.toLocaleString()}**\n` +
                    `💰 Total:   **$${grandTotal.toLocaleString()}**`,
                inline: false,
            })
            .setFooter({ text: `${entries.length} macaamiil • Garaad Economy` }),
    ], components: [closeRow] });
};
