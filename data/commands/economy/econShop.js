const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ECON_TITLES = {
    master:        { label: 'Master 🎓',          price:  5_000, currency: 'btc', type: 'title' },
    phd:           { label: 'PhD 📚',             price:  6_000, currency: 'btc', type: 'title' },
    professor:     { label: 'Professor 🏛️',      price:  7_000, currency: 'btc', type: 'title' },
    director:      { label: 'Director 📋',        price:  8_000, currency: 'btc', type: 'title' },
    theboss:       { label: 'The Boss 🕴️',        price: 10_000, currency: 'btc', type: 'title' },
    businesswomen: { label: 'Business Women 💼👩', price: 11_000, currency: 'btc', type: 'title' },
    ceo:           { label: 'CEO 🏢',             price: 12_000, currency: 'btc', type: 'title' },
    custom:        { label: 'Custom Name ✍️',     price: 20_000, currency: 'btc', type: 'custom' },
};

const SHOP_ITEMS = {
    safety:    { label: '🛡️ Safety Shield', price: 500, currency: 'btc', type: 'timed_item', desc: 'Blocks all robbery attempts for 3 days' },
    robticket: { label: '🎫 Rob Ticket',    price: 500, currency: 'btc', type: 'timed_item', desc: 'Required to use ?rob (2 days active)' },
    ...ECON_TITLES,
};

function priceTag(p) {
    if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M BTC`;
    if (p >= 1_000)     return `${(p / 1_000).toFixed(1)}k BTC`.replace('.0k BTC', 'k BTC');
    return `₿: ${p}`;
}

module.exports = async function econShopCmd(message) {
    const userId = message.author.id;

    // Row 1: Shield | Rob Ticket | Master
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_safety')    .setLabel('🛡️ Shield  500 BTC') .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('eco_shop_robticket') .setLabel('🎫 Rob Ticket 500 BTC').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('eco_shop_master')    .setLabel('Master  5k BTC')      .setStyle(ButtonStyle.Primary),
    );

    // Row 2: PhD | Professor | Director
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_phd')       .setLabel('PhD  6k BTC')    .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_professor') .setLabel('Prof  7k BTC')   .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_director')  .setLabel('Dir  8k BTC')    .setStyle(ButtonStyle.Primary),
    );

    // Row 3: The Boss | CEO | Custom
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_theboss')       .setLabel('Boss  10k BTC')   .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco_shop_ceo')           .setLabel('CEO  12k BTC')    .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco_shop_custom')        .setLabel('Custom  20k BTC') .setStyle(ButtonStyle.Secondary),
    );

    // Row 4: Business Women | Close
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_businesswomen').setLabel('Business Women  11k BTC').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`close_shop_${userId}`)  .setLabel('✖ Close')               .setStyle(ButtonStyle.Danger),
    );

    const titleLines = Object.entries(ECON_TITLES)
        .map(([, it]) => `${it.label} — **${priceTag(it.price)}**`)
        .join('\n');

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🛒 Garaad Economy Shop')
            .setColor('#9b59b6')
            .addFields(
                {
                    name: '🧰 Items',
                    value:
                        `🛡️ **Safety Shield** — 500 BTC _(blocks one robbery, 2 days active)_\n` +
                        `🎫 **Rob Ticket** — 500 BTC _(required for ?rob, 2 days active)_`,
                    inline: false,
                },
                {
                    name: '🏷️ Economy Titles',
                    value: titleLines,
                    inline: false,
                },
            )
            .setFooter({ text: 'Garaad Economy • ?etitle <key> to equip • Custom = your own name' }),
    ], components: [row1, row2, row3, row4] });
};

module.exports.SHOP_ITEMS  = SHOP_ITEMS;
module.exports.ECON_TITLES = ECON_TITLES;
