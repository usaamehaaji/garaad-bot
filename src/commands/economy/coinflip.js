const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

const WIN_MULTI = 0.90; // net win = 90% of stake
const SIDES     = ['up', 'down'];
const SIDE_LABEL = { up: '⬆️ Kor', down: '⬇️ Hoose' };

function buildPickEmbed(amount, d) {
    return new EmbedBuilder()
        .setTitle('🪙 Coin Flip')
        .setColor('#f39c12')
        .setDescription(
            `**Dooro dhinacaaga:**\n\n` +
            `💵 Bahaalinta: **$${fmt(amount)}**\n` +
            `💰 Jeebka: **$${fmt(d.usd)}**\n\n` +
            `🏆 Guul: **+$${fmt(Math.floor(amount * WIN_MULTI))}** · ❌ Khasaaro: **-$${fmt(amount)}**`
        )
        .setFooter({ text: '50/50 • Garaad Economy' });
}

function pickRow(amount, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`cf_pick_up_${amount}_${userId}`)
            .setLabel('⬆️ Kor')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`cf_pick_down_${amount}_${userId}`)
            .setLabel('⬇️ Hoose')
            .setStyle(ButtonStyle.Success),
    );
}

module.exports = async function coinflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    const amount = parseFloat(args[0]);
    if (!amount || isNaN(amount) || amount <= 0)
        return message.reply('⚠️ Xaddad sax ah geli — tusaale: `?cf 500`');
    if (amount > d.usd)
        return message.reply(`⚠️ USD kugu filna ma lihid. Haysataa: **$${fmt(d.usd)}**`);

    return message.reply({
        embeds:     [buildPickEmbed(amount, d)],
        components: [pickRow(amount, userId)],
    });
};

// ── Button handler — called from interactionHandler ──────────────────
module.exports.handleCoinflipPick = async function handleCoinflipPick(interaction) {
    const parts  = interaction.customId.split('_');
    // cf_pick_<side>_<amount>_<userId>
    const side   = parts[2];           // 'up' or 'down'
    const amount = parseFloat(parts[3]);
    const ownerId = parts[4];

    if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: '⚠️ Ciyaartaada qoro!', flags: MessageFlags.Ephemeral });
    }

    checkEconUser(ownerId);
    const d = econData[ownerId];

    if (amount > d.usd) {
        return interaction.update({
            embeds: [new EmbedBuilder()
                .setTitle('🪙 Coin Flip')
                .setColor('#e74c3c')
                .setDescription(`❌ USD kugu filna ma lihid. Haysataa: **$${fmt(d.usd)}**`)
            ],
            components: [],
        });
    }

    // Flip
    const result = SIDES[Math.floor(Math.random() * 2)];
    const win    = result === side;

    if (win) {
        const profit = Math.floor(amount * WIN_MULTI);
        d.usd += profit;
        const fee = amount - profit;
        addToTreasury(fee);
        trackEarning(ownerId, profit);
    } else {
        d.usd -= amount;
        addToTreasury(amount);
    }
    saveEcon();

    const embed = new EmbedBuilder()
        .setTitle(`🪙 Coin Flip — ${win ? '🏆 GUUL!' : '💸 KHASAARO!'}`)
        .setColor(win ? '#2ecc71' : '#e74c3c')
        .setDescription(
            `${win ? '✅' : '❌'} **${win ? 'GUUL' : 'KHASAARO'}**\n\n` +
            `🔄 Coinka: **${SIDE_LABEL[result]}**\n` +
            `🎯 Adiga: **${SIDE_LABEL[side]}**\n\n` +
            `${win ? `+$${fmt(Math.floor(amount * WIN_MULTI))}` : `-$${fmt(amount)}`} **USD**\n` +
            `💵 Wallet cusub: **$${fmt(d.usd)}**`
        )
        .setFooter({ text: '50/50 • Garaad Economy' });

    return interaction.update({ embeds: [embed], components: [] });
};
