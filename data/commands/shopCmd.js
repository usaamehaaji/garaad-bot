// =====================================================================
// ?shop [frames|boosters|loot|titles] — Unified Shop
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { econData, saveEcon }  = require('../../src/economy/econStore');
const { checkUser } = require('../../src/utils/helpers');
const { FRAMES, BADGES, BOOSTERS, LOOT_BOXES, RINGS } = require('../../src/utils/itemDefs');
const { ECON_TITLES } = require('./economy/econShop');

const RARITY_EMOJI = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴' };

function fmtBtc(n) {
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M BTC`;
    if (n >= 1_000)     return `${(n/1_000).toFixed(0)}k BTC`;
    return `${n} BTC`;
}

function shopEmbed(section, userId) {
    const d  = userData[userId] || {};
    const ec = econData[userId] || {};
    const balance = (ec.btc || 0) + (ec.banks?.garaad || 0);

    if (section === 'frames') {
        const lines = Object.entries(FRAMES)
            .filter(([, f]) => !f.lootOnly)
            .map(([k, f]) => {
                const owned = (d.ownedFrames || []).includes(k);
                return `${RARITY_EMOJI[f.rarity] || '⚪'} ${f.emoji} **${f.name}** — ${fmtBtc(f.price)}${owned ? ' ✅' : ''}`;
            });
        return new EmbedBuilder()
            .setTitle('🖼️ Frame Shop')
            .setColor('#9b59b6')
            .setDescription(lines.join('\n'))
            .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
            .setFooter({ text: 'Iibso: ?buy frame <key>  •  Mythic = Loot Box kaliya' });
    }

    if (section === 'boosters') {
        const lines = Object.entries(BOOSTERS).map(([k, b]) => {
            const now = Date.now();
            const active = (k === 'iq_shield')
                ? (d.boosters?.iqShields > 0 ? ` (×${d.boosters.iqShields} owned)` : '')
                : ((d.boosters?.[k.replace('_', '')] || 0) > now ? ' ✅ Active' : '');
            return `${b.emoji} **${b.name}** — ${fmtBtc(b.price)}\n  ↳ ${b.desc}${active}`;
        });
        return new EmbedBuilder()
            .setTitle('⚡ Booster Shop')
            .setColor('#f39c12')
            .setDescription(lines.join('\n\n'))
            .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
            .setFooter({ text: 'Iibso: ?buy booster <key>' });
    }

    if (section === 'loot') {
        const lootInv = d.lootBoxes || {};
        const lines = Object.entries(LOOT_BOXES).map(([k, b]) => {
            return `${b.emoji} **${b.name}** — ${fmtBtc(b.price)}\n  ↳ Haysataa: **${lootInv[k] || 0}**`;
        });
        return new EmbedBuilder()
            .setTitle('📦 Loot Box Shop')
            .setColor('#e74c3c')
            .setDescription(lines.join('\n\n'))
            .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
            .setFooter({ text: 'Iibso: ?buy loot <common|rare|legendary>  •  Fur: ?open <type>' });
    }

    if (section === 'titles') {
        const econLines = Object.entries(ECON_TITLES).map(([k, t]) => {
            const owned = (ec.econTitles || []).includes(k);
            return `${t.label} — ${fmtBtc(t.price)}${owned ? ' ✅' : ''}`;
        });
        return new EmbedBuilder()
            .setTitle('🏷️ Title Shop')
            .setColor('#2ecc71')
            .setDescription(econLines.join('\n'))
            .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
            .setFooter({ text: 'Iibso: ?buy title <key>  •  Xidh: ?equip title <key>' });
    }

    if (section === 'economy') {
        const inv = ec.inventory || {};
        const shieldActive = (inv.safetyExpiry || 0) > Date.now();
        const shieldHours  = shieldActive ? Math.ceil((inv.safetyExpiry - Date.now()) / 3600000) : 0;
        return new EmbedBuilder()
            .setTitle('💰 Economy Shop')
            .setColor('#e67e22')
            .setDescription(
                `🔫 **Rob Ticket** — ₿1,500\n  ↳ ?rob isticmaali karo (24 saac)\n\n` +
                `🛡️ **Safety Shield** — ₿300\n  ↳ Rob-ka kaaga ilaaliya 24h\n  ${shieldActive ? `✅ Active — ${shieldHours}h haray` : '❌ Active ma aha'}`
            )
            .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
            .setFooter({ text: 'Iibso: ?buy rob_ticket  ama  ?buy safety_shield' });
    }

    if (section === 'rings') {
        const owned = (userData[userId]?.ownedRings) || {};
        const lines = Object.entries(RINGS).map(([k, r]) => {
            const count = owned[k] || 0;
            return `${r.emoji} **${r.name}** — ₿${r.price.toLocaleString()}${count > 0 ? ` ✅ ×${count}` : ''}`;
        });
        return new EmbedBuilder()
            .setTitle('💍 Ring Shop')
            .setColor('#e91e8c')
            .setDescription(lines.join('\n\n') + `\n\n_Ring waxaa loo baahan yahay ?propose si aad u guursan_`)
            .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
            .setFooter({ text: 'Iibso: ?buy ring silver  |  diamond  |  royal  |  somali' });
    }

    // Default: main menu
    return new EmbedBuilder()
        .setTitle('🛒 Garaad Bot — Shop')
        .setColor('#9b59b6')
        .setDescription(
            `🖼️ **Frames** — qurxinta profile-kaaga\n` +
            `⚡ **Boosters** — IQ/XP/BTC 2x\n` +
            `📦 **Loot Boxes** — abaalmarintyo random ah\n` +
            `🏷️ **Titles** — cinwaanno aad isticmaali\n` +
            `💰 **Economy** — Rob Ticket & Safety Shield\n` +
            `💍 **Rings** — guurka loogu baahan yahay\n\n` +
            `Isticmaal badhanka hoose ama:\n` +
            `\`?shop frames\` \`?shop boosters\` \`?shop loot\` \`?shop titles\` \`?shop economy\` \`?shop rings\``
        )
        .addFields({ name: '💰 Haraagaaga', value: `₿ ${balance.toLocaleString()}`, inline: true })
        .setFooter({ text: 'Garaad Bot • Shop' });
}

function shopRows(section) {
    if (section === 'frames') {
        const buyable = Object.entries(FRAMES).filter(([, f]) => !f.lootOnly);
        const rows = [];
        for (let i = 0; i < buyable.length; i += 4) {
            const chunk = buyable.slice(i, i + 4);
            rows.push(new ActionRowBuilder().addComponents(
                chunk.map(([k, f]) => new ButtonBuilder()
                    .setCustomId(`shop_buy_frame_${k}`)
                    .setLabel(`${f.emoji} ${f.name}`)
                    .setStyle(f.rarity === 'Legendary' ? ButtonStyle.Danger : f.rarity === 'Epic' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                )
            ));
            if (rows.length >= 4) break;
        }
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
        ));
        return rows;
    }

    if (section === 'boosters') {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy_booster_double_iq') .setLabel('🧠 Double IQ  3k BTC') .setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('shop_buy_booster_double_xp') .setLabel('⭐ Double XP  2k BTC') .setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('shop_buy_booster_double_btc').setLabel('₿ Double BTC 2.5k BTC').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('shop_buy_booster_iq_shield') .setLabel('🛡️ IQ Shield  1.5k BTC').setStyle(ButtonStyle.Danger),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
        ];
    }

    if (section === 'loot') {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy_loot_common')   .setLabel('📦 Common  2k BTC')    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('shop_buy_loot_rare')     .setLabel('🎁 Rare  5k BTC')      .setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('shop_buy_loot_legendary').setLabel('💎 Legendary  15k BTC').setStyle(ButtonStyle.Danger),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
        ];
    }

    if (section === 'titles') {
        const rows = [];
        const entries = Object.keys(ECON_TITLES);
        for (let i = 0; i < entries.length; i += 3) {
            const chunk = entries.slice(i, i + 3);
            rows.push(new ActionRowBuilder().addComponents(
                chunk.map(k => {
                    const t = ECON_TITLES[k];
                    return new ButtonBuilder()
                        .setCustomId(`shop_buy_title_${k}`)
                        .setLabel(`${t.label.slice(0, 20)} ${(t.price/1000).toFixed(0)}k`)
                        .setStyle(ButtonStyle.Primary);
                })
            ));
            if (rows.length >= 3) break;
        }
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
        ));
        return rows;
    }

    if (section === 'economy') {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy_rob_ticket')    .setLabel('🔫 Rob Ticket  1.5k BTC').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('shop_buy_safety_shield') .setLabel('🛡️ Safety Shield  300 BTC').setStyle(ButtonStyle.Primary),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
        ];
    }

    if (section === 'rings') {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy_ring_silver') .setLabel('💍 Silver  5k BTC')  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('shop_buy_ring_diamond').setLabel('💎 Diamond  15k BTC').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('shop_buy_ring_royal')  .setLabel('👑 Royal  30k BTC')  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('shop_buy_ring_somali') .setLabel('🇸🇴 Somali  50k BTC') .setStyle(ButtonStyle.Danger),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
        ];
    }

    // Main menu
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_section_frames')  .setLabel('🖼️ Frames')  .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('shop_section_boosters').setLabel('⚡ Boosters').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('shop_section_loot')    .setLabel('📦 Loot')    .setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('shop_section_titles')  .setLabel('🏷️ Titles')  .setStyle(ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_section_economy') .setLabel('💰 Economy') .setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('shop_section_rings')   .setLabel('💍 Rings')   .setStyle(ButtonStyle.Primary),
        ),
    ];
}

module.exports = async function shopCmd(message, args) {
    const userId  = message.author.id;
    checkUser(userId);
    const section = (args[0] || '').toLowerCase();
    const valid   = ['frames', 'boosters', 'loot', 'titles', 'economy', 'rings', ''];
    const sec     = valid.includes(section) ? section : '';

    return message.reply({ embeds: [shopEmbed(sec, userId)], components: shopRows(sec) });
};

module.exports.shopEmbed = shopEmbed;
module.exports.shopRows  = shopRows;
