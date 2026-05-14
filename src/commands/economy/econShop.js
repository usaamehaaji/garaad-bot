// =====================================================================
// AMARKA: ?shop — Garaad Economy Shop (USD titles + items)
// Titles: Master → CEO ($5k–$10k) + Custom Name ($20k)
// Items: Safety Shield ($500) + Rob Ticket ($9k)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ECON_TITLES = {
    master:        { label: 'Master 🎓',          price:  5_000, currency: 'usd', type: 'title' },
    phd:           { label: 'PhD 📚',             price:  5_500, currency: 'usd', type: 'title' },
    professor:     { label: 'Professor 🏛️',      price:  6_000, currency: 'usd', type: 'title' },
    director:      { label: 'Director 📋',        price:  7_000, currency: 'usd', type: 'title' },
    theboss:       { label: 'The Boss 🕴️',        price:  8_000, currency: 'usd', type: 'title' },
    businesswomen: { label: 'Business Women 💼👩', price:  9_000, currency: 'usd', type: 'title' },
    ceo:           { label: 'CEO 🏢',             price: 10_000, currency: 'usd', type: 'title' },
    custom:        { label: 'Custom Name ✍️',     price: 20_000, currency: 'usd', type: 'custom' },
};

const SHOP_ITEMS = {
    safety:    { label: '🛡️ Safety Shield', price:   500, currency: 'usd', type: 'item', desc: 'Ku difaac rob mid ah' },
    robticket: { label: '🎫 Rob Ticket',    price: 9_000, currency: 'usd', type: 'item', desc: 'U baahan tahay ?rob isticmaalista' },
    ...ECON_TITLES,
};

function priceTag(p) {
    if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(1)}M`;
    if (p >= 1_000)     return `$${(p / 1_000).toFixed(1)}k`.replace('.0k', 'k');
    return `$${p}`;
}

module.exports = async function econShopCmd(message) {
    const userId = message.author.id;

    // Row 1: Items
    const itemRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_safety')            .setLabel(`🛡️ Shield ${priceTag(500)}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('eco_shop_robticket')         .setLabel(`🎫 Rob Ticket ${priceTag(9_000)}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`close_shop_${userId}`)       .setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );

    // Row 2: Titles tier-1 (5 titles)
    const titleRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_master')       .setLabel(`Master 🎓 $5k`)       .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_phd')          .setLabel(`PhD 📚 $5.5k`)        .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_professor')    .setLabel(`Professor 🏛️ $6k`)    .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_director')     .setLabel(`Director 📋 $7k`)     .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('eco_shop_theboss')      .setLabel(`The Boss 🕴️ $8k`)     .setStyle(ButtonStyle.Primary),
    );

    // Row 3: Titles tier-2 + Custom
    const titleRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eco_shop_businesswomen').setLabel(`Business Women 💼 $9k`).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco_shop_ceo')          .setLabel(`CEO 🏢 $10k`)         .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('eco_shop_custom')       .setLabel(`Custom Name ✍️ $20k`) .setStyle(ButtonStyle.Secondary),
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
                        `🛡️ **Safety Shield** — $500 _(ku difaac rob)_\n` +
                        `🎫 **Rob Ticket** — $9,000 _(u baahan tahay ?rob)_`,
                    inline: false,
                },
                {
                    name: '🏷️ Titles — USD ku iibso',
                    value: titleLines,
                    inline: false,
                },
            )
            .setFooter({ text: 'Garaad Economy • ?etitle <key> si aad u dhigto • Custom Name = magacaaga kuu gaar ah' }),
    ], components: [itemRow, titleRow1, titleRow2] });
};

module.exports.SHOP_ITEMS  = SHOP_ITEMS;
module.exports.ECON_TITLES = ECON_TITLES;
