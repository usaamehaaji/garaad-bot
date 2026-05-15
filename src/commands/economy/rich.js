const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData }    = require('../../economy/econStore');
const { getPrice }    = require('../../economy/market');

module.exports = async function richCmd(message) {
    const prices = {
        btc:  getPrice('btc'),
        gold: getPrice('gold'),
    };

    const entries = Object.entries(econData).map(([uid, d]) => {
        const net = (d.usd || 0)
            + (d.btc  || 0) * prices.btc
            + (d.gold || 0) * prices.gold
            + (d.banks?.mandeeq || 0)
            + (d.banks?.garaad  || 0);
        return { uid, net };
    });

    entries.sort((a, b) => b.net - a.net);
    const top10 = entries.slice(0, 10);

    const lines = await Promise.all(top10.map(async ({ uid, net }, i) => {
        let name;
        try {
            const member = await message.guild.members.fetch(uid).catch(() => null);
            name = member?.displayName || `<@${uid}>`;
        } catch {
            name = `<@${uid}>`;
        }
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} ${name} — $${Math.round(net).toLocaleString()}`;
    }));

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_rich_${message.author.id}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('💰 TOP 10 — Ugu Taajirta')
            .setColor('#f39c12')
            .setDescription(lines.join('\n') || '_Wali xog ma jirto._')
            .setFooter({ text: 'Garaad Economy • Net Worth (USD equivalent)' }),
    ], components: [closeRow] });
};
