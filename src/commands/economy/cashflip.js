const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { getPrice } = require('../../economy/market');
const { fmt } = require('../../utils/helpers');

const WIN_RATE   = 0.50;
const WIN_MULTI  = 0.90; // net win = 90% of stake (house keeps 10%)

const ASSET_LABELS = { usd: '💵 USD', btc: '₿ BTC', gold: '🥇 Gold', diamond: '💎 Diamond', ring: '💍 Ring' };
const VALID_ASSETS = Object.keys(ASSET_LABELS);

function assetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_cf_usd_${userId}`)    .setLabel('💵 USD')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_btc_${userId}`)    .setLabel('₿ BTC')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_gold_${userId}`)   .setLabel('🥇 Gold')  .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_diamond_${userId}`).setLabel('💎 Diamond').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_ring_${userId}`)   .setLabel('💍 Ring')  .setStyle(ButtonStyle.Secondary),
    );
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_cf_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    // Direct: ?ecoflip usd 100
    if (args && args.length >= 2) {
        const asset  = args[0].toLowerCase();
        const amount = parseFloat(args[1]);

        if (!VALID_ASSETS.includes(asset))
            return message.reply(`⚠️ Asset saxda ah geli: **${VALID_ASSETS.join(', ')}**`);
        if (!amount || isNaN(amount) || amount <= 0)
            return message.reply('⚠️ Xaddad sax ah geli (tusaale: `?ecoflip usd 100`)');
        if (d[asset] < amount)
            return message.reply(`⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[asset]}**`);

        const flipMsg = await message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🪙 Ecoflip — La Raadinayaa...')
                .setColor('#f39c12')
                .setDescription(`🎰 **${fmt(amount)} ${asset.toUpperCase()}** la ciyaarayaa...\n\n⏳ _Sugso natiijahaaga..._`)
                .setFooter({ text: '50/50 • 1.9x win • Garaad Economy' }),
        ]});

        await new Promise(r => setTimeout(r, 1200));

        const win    = Math.random() < WIN_RATE;
        const usdVal = asset === 'usd' ? amount : Math.round(amount * (getPrice(asset) || 0));

        if (win) {
            const profit = Math.floor(amount * WIN_MULTI);
            d[asset] += profit;
            const fee = amount - profit;
            const feeUsd = asset === 'usd' ? fee : Math.round(fee * (getPrice(asset) || 0));
            addToTreasury(feeUsd);
            trackEarning(userId, Math.round(profit * (asset === 'usd' ? 1 : (getPrice(asset) || 0))));
        } else {
            d[asset] -= amount;
            addToTreasury(usdVal);
        }
        saveEcon();

        return flipMsg.edit({ embeds: [
            new EmbedBuilder()
                .setTitle(win ? '🏆 Ecoflip — Guul!' : '😢 Ecoflip — Guuldaro')
                .setColor(win ? '#2ecc71' : '#e74c3c')
                .setDescription(
                    win
                        ? `✅ **+${fmt(Math.floor(amount * WIN_MULTI))} ${asset.toUpperCase()}** guul!\n${ASSET_LABELS[asset]}: **${fmt(d[asset])}**`
                        : `❌ **-${fmt(amount)} ${asset.toUpperCase()}** guuldaro.\n${ASSET_LABELS[asset]}: **${fmt(d[asset])}**`
                )
                .setFooter({ text: '50/50 • 1.9x win • Garaad Economy' }),
        ], components: [closeRow(userId)] });
    }

    // Button flow
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🎰 Ecoflip — 50/50')
            .setColor('#9b59b6')
            .setDescription(
                `**Asset dooro** ama qor toos:\n\`?ecoflip usd 100\`\n\n` +
                `💵 USD: **$${fmt(d.usd)}**\n` +
                `₿ BTC: **${d.btc}**\n` +
                `🥇 Gold: **${d.gold}**\n` +
                `💎 Diamond: **${d.diamond}**\n` +
                `💍 Ring: **${d.ring}**\n\n` +
                `🏆 **Win:** Stake × 1.9 | 💀 **Lose:** Stake dhan`
            )
            .setFooter({ text: '50/50 chance • Garaad Economy' }),
    ], components: [assetRow(userId), closeRow(userId)] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
module.exports.WIN_MULTI    = WIN_MULTI;
module.exports.closeRow     = closeRow;
