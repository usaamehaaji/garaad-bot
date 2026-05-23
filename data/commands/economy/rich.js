const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData } = require('../../economy/econStore');
const { fmt }      = require('../../utils/helpers');

const BTC_ICON = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';

module.exports = async function richCmd(message) {
    const entries = Object.entries(econData)
        .filter(([, d]) => d && typeof d === 'object' && !d.__treasury__)
        .map(([uid, d]) => ({ uid, btc: d.btc || 0 }))
        .sort((a, b) => b.btc - a.btc)
        .slice(0, 10);

    const lines = await Promise.all(entries.map(async ({ uid, btc }, i) => {
        let name;
        try {
            const member = await message.guild.members.fetch(uid).catch(() => null);
            name = member?.displayName || `<@${uid}>`;
        } catch {
            name = `<@${uid}>`;
        }
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} ${name} — ₿ **₿: ${fmt(btc)}**`;
    }));

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_rich_${message.author.id}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('₿ TOP 10 — Richest Players')
            .setColor('#f39c12')
            .setThumbnail(BTC_ICON)
            .setDescription(lines.join('\n') || '_No data yet._')
            .setFooter({ text: 'Garaad Economy • BTC Leaderboard', iconURL: BTC_ICON }),
    ], components: [closeRow] });
};
