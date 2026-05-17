const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { getPrice } = require('../../economy/market');
const { fmt } = require('../../utils/helpers');

const WIN_RATE   = 0.50;
const WIN_MULTI  = 0.90;

const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };
const VALID_ASSETS = Object.keys(ASSET_LABELS);

function assetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_cf_btc_${userId}`) .setLabel('₿ BTC')      .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_gold_${userId}`).setLabel('🥇 Gold')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_cf_${userId}`)   .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
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

    // ?ef 100 → default btc | ?ef gold 100 → gold
    let asset, amount;
    if (args && args.length >= 2 && isNaN(parseFloat(args[0]))) {
        asset  = args[0].toLowerCase();
        amount = parseFloat(args[1]);
    } else if (args && args.length >= 1 && !isNaN(parseFloat(args[0]))) {
        asset  = 'btc';
        amount = parseFloat(args[0]);
    }

    if (asset !== undefined) {
        if (!VALID_ASSETS.includes(asset))
            return message.reply(`⚠️ Asset saxda ah geli: **${VALID_ASSETS.join(', ')}**\nTusaale: \`?ef 100\` ama \`?ef gold 100\``);
        if (!amount || isNaN(amount) || amount <= 0)
            return message.reply('⚠️ Xaddad sax ah geli.\nTusaale: `?ef 100` ama `?ef gold 100`');
        if ((d[asset] || 0) < amount)
            return message.reply(`⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${fmt(d[asset] || 0)} ${asset.toUpperCase()}**`);

        const flipMsg = await message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🎰 ECONOMY FLIP')
                .setColor('#f39c12')
                .setDescription(`**La Raadinayaa...**\n\n⏳ **${fmt(amount)} ${asset.toUpperCase()}** la ciyaarayaa...\n_Sugso natiijahaaga..._`),
        ]});

        await new Promise(r => setTimeout(r, 1500));

        const win    = Math.random() < WIN_RATE;
        const usdVal = asset === 'usd' ? amount : Math.round(amount * (getPrice(asset) || 0));

        if (win) {
            const profit = Math.floor(amount * WIN_MULTI);
            d[asset] = (d[asset] || 0) + profit;
            const fee    = amount - profit;
            const feeUsd = Math.round(fee * (getPrice(asset) || 0));
            addToTreasury(feeUsd);
            trackEarning(userId, Math.round(profit * (getPrice(asset) || 0)));
        } else {
            d[asset] = (d[asset] || 0) - amount;
            addToTreasury(usdVal);
        }
        saveEcon();

        const newBal    = d[asset] || 0;
        const assetUp   = asset.toUpperCase();
        const profitAmt = `${fmt(Math.floor(amount * WIN_MULTI))} ${assetUp}`;
        const lossAmt   = `${fmt(amount)} ${assetUp}`;
        const balLabel  = `${fmt(newBal)} ${assetUp}`;

        const resultEmbed = win
            ? new EmbedBuilder()
                .setTitle('✅ ECONOMY FLIP ✅')
                .setColor('#2ecc71')
                .setDescription(`─────── **GUUL!** ───────\n\n📈 **Suuqa ayaa kuu shaqeeyay.**`)
                .addFields(
                    { name: '🪙 Faa\'iido',     value: `**+${profitAmt}**`, inline: true },
                    { name: '🪙 Balance Cusub', value: `**${balLabel}**`,   inline: true },
                )
                .setFooter({ text: `🔄 ?ef si aad u tijaabiso mar kale  •  ✨ Garaad Economy` })
            : new EmbedBuilder()
                .setTitle('❌ ECONOMY FLIP ❌')
                .setColor('#e74c3c')
                .setDescription(`─────── **QASAARO!** ───────\n\n📉 **Suuqa ayaa kaa hooseeyay.**`)
                .addFields(
                    { name: '🪙 Khasaaro',      value: `**-${lossAmt}**`,  inline: true },
                    { name: '🪙 Balance Cusub', value: `**${balLabel}**`,   inline: true },
                )
                .setFooter({ text: `🔄 ?ef si aad u isku daydo mar kale  •  ✨ Garaad Economy` });

        return flipMsg.edit({ embeds: [resultEmbed], components: [closeRow(userId)] });
    }

    // Button flow — menu
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🎰 ECONOMY FLIP — 50/50')
            .setColor('#9b59b6')
            .setDescription(
                `**Asset dooro** ama qor toos:\n\`?ef 100\` ama \`?ef gold 100\`\n\n` +
                `₿ BTC: **${fmt(d.btc || 0)} BTC**\n` +
                `🥇 Gold: **${fmt(d.gold || 0)} Gold**\n\n` +
                `🏆 **Win:** Stake × 1.9 | 💀 **Lose:** Stake dhan`
            )
            .setFooter({ text: '50/50 chance • Garaad Economy' }),
    ], components: [assetRow(userId)] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
module.exports.WIN_MULTI    = WIN_MULTI;
module.exports.closeRow     = closeRow;
