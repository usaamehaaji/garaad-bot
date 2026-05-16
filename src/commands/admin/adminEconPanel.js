const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury, addToTreasury, topUpTreasury, deductFromTreasury } = require('../../economy/econStore');
const { getPrice } = require('../../economy/market');
const { ECON_TITLES } = require('../economy/econShop');
const { fmt } = require('../../utils/helpers');
const { PREFIX } = require('../../config');

// ── Stats snapshot ─────────────────────────────────────────────────

function getEconStats() {
    const users = Object.entries(econData).filter(([k]) => !k.startsWith('__'));
    const t     = getTreasury();

    let totalUsd = 0, totalGaraad = 0, totalBtc = 0, totalGold = 0;
    let activeLoans = 0, totalOwed = 0, overdueLoans = 0;

    for (const [, d] of users) {
        totalUsd     += d.usd     || 0;
        totalGaraad  += d.banks?.garaad  || 0;
        totalBtc     += d.btc     || 0;
        totalGold    += d.gold    || 0;
        if (d.loan && d.loan.owed > 0) {
            activeLoans++;
            totalOwed += d.loan.owed;
            if (Date.now() - d.loan.takenAt > 3 * 86400000) overdueLoans++;
        }
    }

    const btcPrice     = getPrice('btc')     || 0;
    const goldPrice    = getPrice('gold')    || 0;
    const assetsUsd    = Math.floor(totalBtc * btcPrice + totalGold * goldPrice);

    const totalWealth = totalUsd + totalGaraad + assetsUsd;

    return { users: users.length, totalUsd, totalGaraad, assetsUsd, totalWealth, t, activeLoans, totalOwed, overdueLoans };
}

// ── Main embed ─────────────────────────────────────────────────────

function buildAdminEconEmbed() {
    const s = getEconStats();
    return new EmbedBuilder()
        .setTitle('💰 Admin — Economy Dashboard')
        .setColor('#f39c12')
        .setDescription(
            `**🏛️ Treasury**\n` +
            `💰 Balance: **$${fmt(s.t.balance)}** | 📥 Total in: **$${fmt(s.t.totalIn)}**\n\n` +
            `**📊 Circulation** _(${s.users} qof)_\n` +
            `💵 USD: **$${fmt(s.totalUsd)}**\n` +
            `🏦 Garaad Bank: **$${fmt(s.totalGaraad)}**\n` +
            `🪙 Assets (USD): **$${fmt(s.assetsUsd)}**\n` +
            `💎 **Wadarta dhammaan: $${fmt(s.totalWealth)}**\n\n` +
            `**💳 Deynta**\n` +
            `Active: **${s.activeLoans}** | Owed: **$${fmt(s.totalOwed)}** | 🔴 Overdue: **${s.overdueLoans}**`
        )
        .setFooter({ text: 'Garaad Admin • Economy' });
}

// ── All players embed ──────────────────────────────────────────────

function buildAllPlayersEmbed(page = 0) {
    const PER_PAGE = 10;
    const btcPrice     = getPrice('btc')     || 0;
    const goldPrice    = getPrice('gold')    || 0;

    const players = Object.entries(econData)
        .filter(([k]) => !k.startsWith('__'))
        .map(([uid, d]) => {
            const assetsUsd = Math.floor(
                (d.btc || 0) * btcPrice + (d.gold || 0) * goldPrice
            );
            const net = (d.usd || 0) + (d.banks?.garaad || 0) + assetsUsd;
            return { uid, usd: d.usd || 0, bank: d.banks?.garaad || 0, assetsUsd, net, loan: d.loan?.owed || 0 };
        })
        .sort((a, b) => b.net - a.net);

    const totalPages = Math.ceil(players.length / PER_PAGE);
    const slice = players.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

    const lines = slice.map((p, i) => {
        const rank = page * PER_PAGE + i + 1;
        const loan = p.loan > 0 ? ` 💳$${fmt(p.loan)}` : '';
        const bank = p.bank > 0 ? ` 🏦$${fmt(p.bank)}` : '';
        const ast  = p.assetsUsd > 0 ? ` 🪙$${fmt(p.assetsUsd)}` : '';
        return `**${rank}.** <@${p.uid}> — **$${fmt(p.net)}** | 💵$${fmt(p.usd)}${bank}${ast}${loan}`;
    });

    return new EmbedBuilder()
        .setTitle(`👥 Economy — Dhammaan Dadka (${players.length})`)
        .setColor('#3498db')
        .setDescription(lines.join('\n') || '_Cidna jiro._')
        .setFooter({ text: `Page ${page + 1}/${totalPages} • Wadarta: ${players.length} qof` });
}

// ── Rows ───────────────────────────────────────────────────────────

function adminTabRow(uid, active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_aqoon_${uid}`).setLabel('🧠 Aqoon').setStyle(active === 'aqoon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_eco_${uid}`).setLabel('💰 Economy').setStyle(active === 'eco' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_admin_help_${uid}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

function adminEconActionsRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_eco_giveusd_${uid}`).setLabel('💵 Give USD').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`admin_eco_allplayers_${uid}`).setLabel('👥 Dadka').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_eco_loans_${uid}`).setLabel('💳 Deynta').setStyle(ButtonStyle.Secondary),
    );
}

function adminEconActionsRow2(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_eco_topup_${uid}`).setLabel('🏛️ Top-up').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`admin_eco_reset_${uid}`).setLabel('🗑️ Reset').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`admin_eco_resetall_${uid}`).setLabel('♻️ Reset All').setStyle(ButtonStyle.Danger),
    );
}

// Row 1 (3): Aqoon | Economy | Give USD
function adminEcoMainRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_aqoon_${uid}`)         .setLabel('🧠 Aqoon')      .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_eco_${uid}`)           .setLabel('💰 Economy')    .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`admin_eco_giveusd_${uid}`)   .setLabel('💵 Give USD')   .setStyle(ButtonStyle.Success),
    );
}

// Row 2 (3): Give Asset | Dadka | Top-up
function adminEcoMidRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_eco_giveasset_${uid}`)  .setLabel('🪙 Give Asset') .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`admin_eco_allplayers_${uid}`) .setLabel('👥 Dadka')      .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_eco_topup_${uid}`)      .setLabel('🏛️ Top-up')    .setStyle(ButtonStyle.Primary),
    );
}

// Row 3 (3): Deynta | Reset | Reset All
function adminEcoFooterRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`admin_eco_loans_${uid}`)    .setLabel('💳 Deynta')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`admin_eco_reset_${uid}`)    .setLabel('🗑️ Reset')    .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`admin_eco_resetall_${uid}`) .setLabel('♻️ Reset All').setStyle(ButtonStyle.Danger),
    );
}

// Row 4 (1): Iska xir
function adminEcoCloseRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_admin_help_${uid}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
}

// ── Command ────────────────────────────────────────────────────────

module.exports = async function adminEconCmd(message, args) {
    const userId = message.author.id;
    const sub    = (args[0] || '').toLowerCase();
    const target = message.mentions.users.first();

    if (!sub || sub === 'help') {
        return message.reply({
            embeds:     [buildAdminEconEmbed()],
            components: [adminEcoMainRow(userId), adminEcoMidRow(userId), adminEcoFooterRow(userId), adminEcoCloseRow(userId)],
        });
    }

    // ?admin econ give @user <asset> [amount]
    if (sub === 'give') {
        const rest   = args.filter(a => !/<@!?\d+>/.test(a));
        const asset  = (rest[1] || '').toLowerCase();
        const amount = parseFloat(rest[2]);
        if (!asset || isNaN(amount) || amount <= 0)
        checkEconUser(target.id);
        const d = econData[target.id];
        if (asset === 'usd') {
            d.usd += amount;
        } else if (asset === 'garaad') {
            d.banks.garaad = (d.banks.garaad || 0) + amount;
            d[asset] = (d[asset] || 0) + amount;
        } else {
        }
        saveEcon();
        const val = asset === 'garaad' ? d.banks.garaad : d[asset];
        return message.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
            .setDescription(`✅ **${fmt(amount)} ${asset.toUpperCase()}** waxaad u diray <@${target.id}>.\nHadda: **${fmt(val)}**`)] });
    }

    // ?admin econ title @user <key>
    if (sub === 'title') {
        if (!target) return message.reply('⚠️ `?admin econ title @user <key>`');
        const rest = args.filter(a => !/<@!?\d+>/.test(a));
        const key  = (rest[1] || '').toLowerCase();
        const info = ECON_TITLES[key];
        if (!info) return message.reply(`⚠️ Title la garanwaayo: \`${key}\``);
        checkEconUser(target.id);
        const d = econData[target.id];
        if (!d.econTitles.includes(key)) d.econTitles.push(key);
        d.activeEconTitle = key;
        saveEcon();
        return message.reply({ embeds: [new EmbedBuilder().setColor('#9b59b6')
            .setDescription(`✅ <@${target.id}> waxaa la siiyay: **${info.label}**`)] });
    }

    // ?admin econ treasury [view|distribute|give|topup]
    if (sub === 'treasury') {
        const action = (args[1] || '').toLowerCase();
        const t      = getTreasury();

        if (!action || action === 'view') {
            return message.reply({ embeds: [new EmbedBuilder().setTitle('🏛️ Treasury').setColor('#8e44ad')
                .setDescription(
                    `💰 **Balance:** $${fmt(t.balance)}\n` +
                    `📥 **Total in:** $${fmt(t.totalIn)}\n` +
                    `📤 **Spent:** $${fmt((t.totalIn || 0) - (t.balance || 0))}`
                )] });
        }

        if (action === 'topup') {
            const amount = parseFloat(args[2]);
            if (isNaN(amount) || amount <= 0) return message.reply('⚠️ `?admin econ treasury topup [xad]`');
            topUpTreasury(amount);
            saveEcon();
            return message.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
                .setDescription(`✅ **$${fmt(amount)}** khaznadda lagu daray.\n🏛️ Hadda: **$${fmt(t.balance)}**`)] });
        }

        if (action === 'distribute') {
            const amount = parseFloat(args[2]);
            if (isNaN(amount) || amount <= 0) return message.reply('⚠️ `?admin econ treasury distribute [xad]`');
            const users   = Object.keys(econData).filter(k => !k.startsWith('__'));
            const perUser = Math.floor(amount / users.length);
            if (perUser < 1) return message.reply('⚠️ Xaddadka aad yar.');
            if (!deductFromTreasury(amount)) return message.reply(`⚠️ Khaznadda ma filna. Hadda: **$${fmt(t.balance)}**`);
            for (const uid of users) { checkEconUser(uid); econData[uid].usd += perUser; }
            saveEcon();
            return message.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
                .setDescription(`✅ **$${fmt(perUser)}** × **${users.length}** qof.\n🏛️ Hadhay: **$${fmt(t.balance)}**`)] });
        }

        if (action === 'give') {
            if (!target) return message.reply('⚠️ `?admin econ treasury give @user [xad]`');
            const amount = parseFloat(args.filter(a => !/<@!?\d+>/.test(a))[2]);
            if (isNaN(amount) || amount <= 0) return message.reply('⚠️ Xaddad sax ah geli.');
            if (!deductFromTreasury(amount)) return message.reply(`⚠️ Khaznadda ma filna. Hadda: **$${fmt(t.balance)}**`);
            checkEconUser(target.id);
            econData[target.id].usd += amount;
            saveEcon();
            return message.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
                .setDescription(`✅ **$${fmt(amount)}** waxaa laga siiyay <@${target.id}>.\n🏛️ Hadhay: **$${fmt(t.balance)}**`)] });
        }
    }

    // ?admin econ reset @user
    if (sub === 'reset') {
        if (!target) return message.reply('⚠️ `?admin econ reset @user`');
        checkEconUser(target.id);
        const d = econData[target.id];
        d.banks = { mandeeq: 0, garaad: 0 };
        d.inventory = { safety: 0, robticket: 0 };
        d.loan = null; d.lastLoanTaken = 0; d.econTitles = []; d.activeEconTitle = null; d.customEconTitle = null;
        saveEcon();
        return message.reply({ embeds: [new EmbedBuilder().setColor('#e74c3c')
            .setDescription(`🗑️ <@${target.id}> economy data dib loo dejiyay.`)] });
    }

    // ?admin econ jeeb @user
    if (sub === 'jeeb') {
        if (!target) return message.reply('⚠️ `?admin econ jeeb @user`');
        const jeebCmd = require('../economy/jeeb');
        const fakeMsg = { author: { id: target.id }, mentions: { users: { first: () => target } }, reply: p => message.reply(p) };
        return jeebCmd(fakeMsg);
    }

    // ?admin econ all [page]
    if (sub === 'all') {
        const page = Math.max(0, (parseInt(args[1]) || 1) - 1);
        return message.reply({ embeds: [buildAllPlayersEmbed(page)] });
    }

    // ?admin econ loans
    if (sub === 'loans') {
        const loans = Object.entries(econData)
            .filter(([k, d]) => !k.startsWith('__') && d.loan?.owed > 0)
            .map(([uid, d]) => {
                const days = Math.floor((Date.now() - d.loan.takenAt) / 86400000);
                const left = Math.max(0, 3 - days);
                const overdue = left === 0;
                return `${overdue ? '🔴' : '💳'} <@${uid}> — **$${fmt(d.loan.owed)}** | ${overdue ? '**OVERDUE**' : `${left}d hadhay`}`;
            });
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle(`💳 Active Loans (${loans.length})`)
            .setColor('#e74c3c')
            .setDescription(loans.join('\n') || '_Cidna deen kuma jirto._')
            .setFooter({ text: 'Garaad Admin' })] });
    }

    return message.reply(`⚠️ \`${PREFIX}admin econ help\` eeg.`);
};

module.exports.buildAdminEconEmbed   = buildAdminEconEmbed;
module.exports.buildAllPlayersEmbed  = buildAllPlayersEmbed;
module.exports.adminTabRow           = adminTabRow;
module.exports.adminEconActionsRow   = adminEconActionsRow;
module.exports.adminEconActionsRow2  = adminEconActionsRow2;
module.exports.adminEcoMainRow       = adminEcoMainRow;
module.exports.adminEcoMidRow        = adminEcoMidRow;
module.exports.adminEcoFooterRow     = adminEcoFooterRow;
module.exports.adminEcoCloseRow      = adminEcoCloseRow;
