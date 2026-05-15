const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { getPrice } = require('../../economy/market');
const { fmt } = require('../../utils/helpers');

const WIN_MULTI  = 0.90;

const ASSET_LABELS = { usd: 'USD', btc: 'BTC', gold: 'Gold', diamond: 'Diamond', ring: 'Ring' };
const VALID_ASSETS = Object.keys(ASSET_LABELS);
const SIDES        = ['up', 'down'];
const SIDE_LABEL   = { up: 'Suuq Kor', down: 'Suuq Hoos' };

function pickRow(asset, amount, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_cf_pick_up_${asset}_${amount}_${userId}`)
            .setLabel('Suuq Kor')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`eco_cf_pick_down_${asset}_${amount}_${userId}`)
            .setLabel('Suuq Hoos')
            .setStyle(ButtonStyle.Success),
    );
}

function assetRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_cf_asset_usd_${userId}`)    .setLabel('USD')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_asset_btc_${userId}`)    .setLabel('BTC')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_asset_gold_${userId}`)   .setLabel('Gold')   .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_asset_diamond_${userId}`).setLabel('Diamond').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_cf_asset_ring_${userId}`)   .setLabel('Ring')   .setStyle(ButtonStyle.Secondary),
    );
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_cf_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function buildPickEmbed(asset, amount) {
    return new EmbedBuilder()
        .setTitle('Ecoflip')
        .setColor('#f39c12')
        .setDescription(
            `**${fmt(amount)} ${asset.toUpperCase()}** la ciyaarayaa\n\n` +
            `Suuqa miyuu kor u kici doonaa mise hoos?`
        )
        .setFooter({ text: 'Garaad Economy' });
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    if (args && args.length >= 2) {
        const asset  = args[0].toLowerCase();
        const amount = parseFloat(args[1]);

        if (!VALID_ASSETS.includes(asset))
            return message.reply(`Asset saxda ah geli: ${VALID_ASSETS.join(', ')}`);
        if (!amount || isNaN(amount) || amount <= 0)
            return message.reply('Xaddad sax ah geli — tusaale: ?ecoflip usd 100');
        if (d[asset] < amount)
            return message.reply(`${asset.toUpperCase()} kugu filna ma lihid. Haysataa: ${fmt(d[asset])}`);

        return message.reply({
            embeds:     [buildPickEmbed(asset, amount)],
            components: [pickRow(asset, amount, userId)],
        });
    }

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('Ecoflip')
            .setColor('#9b59b6')
            .setDescription(
                `Asset dooro ama qor toos: ?ecoflip usd 100\n\n` +
                `USD: **$${fmt(d.usd)}**\n` +
                `BTC: **${d.btc}**\n` +
                `Gold: **${d.gold}**\n` +
                `Diamond: **${d.diamond}**\n` +
                `Ring: **${d.ring}**`
            )
            .setFooter({ text: 'Garaad Economy' }),
    ], components: [assetRow(userId), closeRow(userId)] });
};

module.exports.handleEcoflipPick = async function handleEcoflipPick(interaction) {
    // eco_cf_pick_<side>_<asset>_<amount>_<userId>
    const parts   = interaction.customId.split('_');
    const side    = parts[3];
    const asset   = parts[4];
    const amount  = parseFloat(parts[5]);
    const ownerId = parts[6];

    if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: 'Ciyaartaada qoro!', flags: MessageFlags.Ephemeral });
    }

    checkEconUser(ownerId);
    const d = econData[ownerId];

    if (d[asset] < amount) {
        return interaction.update({
            embeds: [new EmbedBuilder()
                .setTitle('Ecoflip')
                .setColor('#e74c3c')
                .setDescription(`${asset.toUpperCase()} kugu filna ma lihid. Haysataa: ${fmt(d[asset])}`)
            ],
            components: [],
        });
    }

    const result = SIDES[Math.floor(Math.random() * 2)];
    const win    = result === side;
    const usdVal = asset === 'usd' ? amount : Math.round(amount * (getPrice(asset) || 0));

    if (win) {
        const profit = Math.floor(amount * WIN_MULTI);
        d[asset] += profit;
        const feeUsd = asset === 'usd' ? (amount - profit) : Math.round((amount - profit) * (getPrice(asset) || 0));
        addToTreasury(feeUsd);
        trackEarning(ownerId, Math.round(profit * (asset === 'usd' ? 1 : (getPrice(asset) || 0))));
    } else {
        d[asset] -= amount;
        addToTreasury(usdVal);
    }
    saveEcon();

    return interaction.update({
        embeds: [new EmbedBuilder()
            .setTitle(win ? 'Ecoflip — Guul' : 'Ecoflip — Khasaaro')
            .setColor(win ? '#2ecc71' : '#e74c3c')
            .setDescription(
                `Suuqa: **${SIDE_LABEL[result]}**\n` +
                `Adiga: **${SIDE_LABEL[side]}**\n\n` +
                `${win ? `+${fmt(Math.floor(amount * WIN_MULTI))}` : `-${fmt(amount)}`} **${asset.toUpperCase()}**`
            )
            .setFooter({ text: 'Garaad Economy' })
        ],
        components: [],
    });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
module.exports.WIN_MULTI    = WIN_MULTI;
module.exports.closeRow     = closeRow;
