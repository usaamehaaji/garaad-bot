// =====================================================================
// AMARKA: ?shop — Garaad Economy Shop (USD titles + items)
// Titles: Master → CEO ($5k–$10k) + Custom Name ($20k)
// Items: Safety Shield ($500) + Rob Ticket ($9k)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ECON_TITLES = {
    master:        { label: 'Master 🎓',          price:  5_000, currency: 'btc', type: 'title' },
    phd:           { label: 'PhD 📚',             price:  5_500, currency: 'btc', type: 'title' },
    professor:     { label: 'Professor 🏛️',      price:  6_000, currency: 'btc', type: 'title' },
    director:      { label: 'Director 📋',        price:  7_000, currency: 'btc', type: 'title' },
    theboss:       { label: 'The Boss 🕴️',        price:  8_000, currency: 'btc', type: 'title' },
    businesswomen: { label: 'Business Women 💼👩', price:  9_000, currency: 'btc', type: 'title' },
    ceo:           { label: 'CEO 🏢',             price: 10_000, currency: 'btc', type: 'title' },
    custom:        { label: 'Custom Name ✍️',     price: 20_000, currency: 'btc', type: 'custom' },
};

const SHOP_ITEMS = {
    safety:    { label: '🛡️ Safety Shield', price:   500, currency: 'btc', type: 'item', desc: 'Ku difaac rob mid ah' },
    robticket: { label: '🎫 Rob Ticket',    price: 9_000, currency: 'btc', type: 'item', desc: 'U baahan tahay ?rob isticmaalista' },
    ...ECON_TITLES,
};

function priceTag(p) {
    if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M BTC`;
    if (p >= 1_000)     return `${(p / 1_000).toFixed(1)}k BTC`.replace('.0k BTC', 'k BTC');
    return `${p} BTC`;
}

module.exports = async function econShopCmd(message) {
    const userId = message.author.id;

    // Row 1: Shield | Rob | Master
    const titleRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_safety')    .setLabel(`🛡️ Shield 500 BTC`) .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('eco_shop_robticket') .setLabel(`🎫 Rob 9k BTC`)     .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('eco_shop_master')    .setLabel(`Master 5k BTC`)     .setStyle(ButtonStyle.Primary),
    );

    // Row 2: PhD | Prof | Boss
    const titleRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_phd')       .setLabel(`PhD 5.5k BTC`) .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_professor') .setLabel(`Prof 6k BTC`)  .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_theboss')   .setLabel(`Boss 8k BTC`)  .setStyle(ButtonStyle.Primary),
    );

    // Row 3: Boss Lady | CEO | Custom
    const titleRow3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_businesswomen') .setLabel(`Boss Lady 9k BTC`) .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco_shop_ceo')           .setLabel(`CEO 10k BTC`)      .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco_shop_custom')        .setLabel(`Custom 20k BTC`)   .setStyle(ButtonStyle.Secondary),
    );

    // Row 4: Iska xir
    const itemRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_shop_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
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
                        `🛡️ **Safety Shield** — 500 BTC _(ku difaac rob)_\n` +
                        `🎫 **Rob Ticket** — 9,000 BTC _(u baahan tahay ?rob)_`,
                    inline: false,
                },
                {
                    name: '🏷️ Titles — BTC ku iibso',
                    value: titleLines,
                    inline: false,
                },
            )
            .setFooter({ text: 'Garaad Economy • ?etitle <key> si aad u dhigto • Custom Name = magacaaga kuu gaar ah' }),
    ], components: [titleRow1, titleRow2, titleRow3, itemRow] });
};

module.exports.SHOP_ITEMS  = SHOP_ITEMS;
module.exports.ECON_TITLES = ECON_TITLES;
