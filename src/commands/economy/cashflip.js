const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { getPrice } = require('../../economy/market');

const ASSET_LABELS = { usd: '💵 USD', btc: '₿ BTC', gold: '🥇 Gold', diamond: '💎 Diamond', ring: '💍 Ring' };
const VALID_ASSETS = Object.keys(ASSET_LABELS);

function assetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_cf_usd_${userId}`).setLabel('💵 USD').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_btc_${userId}`).setLabel('₿ BTC').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_gold_${userId}`).setLabel('🥇 Gold').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_diamond_${userId}`).setLabel('💎 Diamond').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_ring_${userId}`).setLabel('💍 Ring').setStyle(ButtonStyle.Secondary),
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

        if (!VALID_ASSETS.includes(asset)) {
            return message.reply(`⚠️ Asset saxda ah geli: **${VALID_ASSETS.join(', ')}**`);
        }
        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply('⚠️ Xaddad sax ah geli (tusaale: `?ecoflip usd 100`)');
        }
        if (d[asset] < amount) {
            return message.reply(`⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[asset]}**`);
        }

        const flipMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🪙 Ecoflip — La Raadinayaa...')
                    .setColor('#f39c12')
                    .setDescription(`🎰 **${amount} ${asset.toUpperCase()}** la ciyaarayaa...\n\n⏳ _Sugso xogtaada..._`)
                    .setFooter({ text: '35% win • Garaad Economy' }),
            ],
        });

        await new Promise(r => setTimeout(r, 1000));

        const win = Math.random() < 0.35;
        if (win) {
            d[asset] += amount;
            const usdWin = asset === 'usd' ? amount : Math.round(amount * (getPrice(asset) || 0));
            trackEarning(userId, usdWin);
        } else {
            d[asset] -= amount;
            const usdLoss = asset === 'usd' ? amount : Math.round(amount * (getPrice(asset) || 0));
            addToTreasury(usdLoss);
        }
        saveEcon();

        return flipMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(win ? '🏆 Ecoflip — Guul! Win!' : '😢 Ecoflip — Guuldaro | Loss')
                    .setColor(win ? '#2ecc71' : '#e74c3c')
                    .setDescription(
                        win
                            ? `✅ **+${amount} ${asset.toUpperCase()}** guul!\n${ASSET_LABELS[asset]}: **${d[asset]}**`
                            : `❌ **-${amount} ${asset.toUpperCase()}** guuldaro.\n${ASSET_LABELS[asset]}: **${d[asset]}**`
                    )
                    .setFooter({ text: '35% win • Garaad Economy' }),
            ],
            components: [closeRow(userId)],
        });
    }

    // Button flow (default)
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🎰 Ecoflip — 35% Win')
            .setColor('#9b59b6')
            .setDescription(
                `**Asset dooro** ama qor toos:\n\`?ecoflip usd 100\`\n\n` +
                `💵 USD: **$${d.usd.toLocaleString()}**\n` +
                `₿ BTC: **${d.btc}**\n` +
                `🥇 Gold: **${d.gold}**\n` +
                `💎 Diamond: **${d.diamond}**\n` +
                `💍 Ring: **${d.ring}**`
            )
            .setFooter({ text: '35% win • Garaad Economy' }),
    ], components: [assetRow(userId), closeRow(userId)] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
module.exports.closeRow     = closeRow;
