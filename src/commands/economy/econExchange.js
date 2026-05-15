const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');
const { getPrice }                          = require('../../economy/market');

const VALID_ASSETS = ['usd', 'btc', 'gold'];

module.exports = async function econExchangeCmd(message, args) {
    const userId = message.author.id;

    if (!args[0] || !args[1] || !args[2]) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription('**Sarrifka:** `?exchange <from> <xaddad> <to>`\nTusaale: `?exchange usd 1000 btc`')
                .setColor('#3498db'),
        ]});
    }

    const from   = args[0].toLowerCase();
    const amount = parseFloat(args[1]);
    const to     = args[2].toLowerCase();

    if (!VALID_ASSETS.includes(from) || !VALID_ASSETS.includes(to)) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ Assets: ${VALID_ASSETS.join(', ')}`)
                .setColor('#e74c3c'),
        ]});
    }

    if (from === to) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription('⚠️ Assets waa isku mid.').setColor('#e74c3c'),
        ]});
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
        return message.reply({ embeds: [
            new EmbedBuilder().setDescription('⚠️ Xaddadka saxda ah geli.').setColor('#e74c3c'),
        ]});
    }

    checkEconUser(userId);
    const d = econData[userId];

    if (d[from] < amount) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setDescription(`⚠️ ${from.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[from]}**`)
                .setColor('#e74c3c'),
        ]});
    }

    const fromPrice = from === 'usd' ? 1 : getPrice(from);
    const toPrice   = to   === 'usd' ? 1 : getPrice(to);
    const usdValue  = amount * fromPrice;
    const received  = usdValue / toPrice;

    d[from] -= amount;
    d[to]   += received;
    saveEcon();

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🔄 Sarrifka Assets')
            .setColor('#2ecc71')
            .setDescription(
                `✅ **${amount} ${from.toUpperCase()}** → **${received.toFixed(6)} ${to.toUpperCase()}**\n\n` +
                `Qiimaha USD: ~$${Math.round(usdValue).toLocaleString()}`
            )
            .setFooter({ text: 'Garaad Economy' }),
    ]});
};
