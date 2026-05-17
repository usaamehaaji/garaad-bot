const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { getPrice } = require('../../economy/market');
const { fmt } = require('../../utils/helpers');

const WIN_RATE   = 0.50;
const WIN_MULTI  = 0.90; // net win = 90% of stake (house keeps 10%)

const ASSET_LABELS = { usd: '💵 USD', btc: 'BTC', gold: '🥇 Gold' };
const VALID_ASSETS = Object.keys(ASSET_LABELS);

function assetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_cf_usd_${userId}`) .setLabel('💵 USD')     .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_btc_${userId}`) .setLabel('BTC')        .setStyle(ButtonStyle.Secondary),
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

    // Qaabka cusub: ?ef 100  ama  ?ef btc 100
    let asset, amount;
    if (args && args.length >= 2 && isNaN(parseFloat(args[0]))) {
        // ?ef btc 100
        asset  = args[0].toLowerCase();
        amount = parseFloat(args[1]);
    } else if (args && args.length >= 1 && !isNaN(parseFloat(args[0]))) {
        // ?ef 100 → default usd
        asset  = 'usd';
        amount = parseFloat(args[0]);
    }

    if (asset !== undefined) {
        if (!VALID_ASSETS.includes(asset))
            return message.reply(`⚠️ Asset saxda ah geli: **${VALID_ASSETS.join(', ')}**\nTusaale: \`?ef 100\` ama \`?ef btc 100\``);
        if (!amount || isNaN(amount) || amount <= 0)
            return message.reply('⚠️ Xaddad sax ah geli.\nTusaale: `?ef 100` ama `?ef btc 100`');
        if (d[asset] < amount)
            return message.reply(`⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${fmt(d[asset])}**`);

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

        const username = message.author.username;
        const newBal   = d[asset];
        const balNote  = newBal >= 100_000 ? 'Millionaire! 💎'
                       : newBal >= 50_000  ? 'Aad u sarreysaa! 🔥'
                       : newBal >= 10_000  ? '10k+ club! 🏆'
                       : newBal >= 5_000   ? 'Sii wad! 🚀'
                       : newBal >= 1_000   ? 'Sii wad! 💪'
                       : 'Isku day! 🎯';
        const balLabel  = `${fmt(newBal)} ${asset.toUpperCase()}`;
        const profitAmt = `${fmt(Math.floor(amount * WIN_MULTI))} ${asset.toUpperCase()}`;
        const lossAmt   = `${fmt(amount)} ${asset.toUpperCase()}`;

        const desc = win
            ? `Suuqa ayaa kuu shaqeeyay. 📈\n\n` +
              `💸 **Faa'iido:** +${profitAmt}\n` +
              `💰 **Balance Cusub:** ${balLabel}\n\n` +
              `🔄 Isticmaal \`?ef\` si aad u tijaabiso mar kale.\n\n` +
              `✨ **Garaad Economy**`
            : `Suuqa ayaa kaa hooseeyay. 📉\n\n` +
              `💸 **Khasaaro:** -${lossAmt}\n` +
              `💰 **Balance Cusub:** ${balLabel}\n\n` +
              `🔄 Isticmaal \`?ef\` si aad u isku daydo mar kale.\n\n` +
              `✨ **Garaad Economy**`;

        return flipMsg.edit({ embeds: [
            new EmbedBuilder()
                .setTitle(win ? '✅ Ecoflip: Guul ✅' : '❌ Ecoflip: Guuldarro ❌')
                .setColor(win ? '#2ecc71' : '#e74c3c')
                .setDescription(desc),
        ], components: [closeRow(userId)] });
    }

    // Button flow
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🎰 Ecoflip — 50/50')
            .setColor('#9b59b6')
            .setDescription(
                `**Asset dooro** ama qor toos:\n\`?ef 100\` ama \`?ef btc 100\`\n\n` +
                `💵 USD: **${fmt(d.usd)} USD**\n` +
                `BTC: **${fmt(d.btc)} BTC**\n` +
                `🥇 Gold: **${fmt(d.gold)} Gold**\n\n` +
                `🏆 **Win:** Stake × 1.9 | 💀 **Lose:** Stake dhan`
            )
            .setFooter({ text: '50/50 chance • Garaad Economy' }),
    ], components: [assetRow(userId)] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
module.exports.WIN_MULTI    = WIN_MULTI;
module.exports.closeRow     = closeRow;
