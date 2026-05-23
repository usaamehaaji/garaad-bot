const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const INTEREST_RATE     = 0.01;
const INTEREST_INTERVAL = 24 * 60 * 60 * 1000;
const LOAN_MAX          = 2_500;
const LOAN_FEE          = 100;
const LOAN_OWED         = LOAN_MAX + LOAN_FEE;
const DEDUCT_AFTER_MS   = 3 * 24 * 60 * 60 * 1000;
const EAT_OFFSET        = 3 * 60 * 60 * 1000; // UTC+3 Somalia

function isBankOpen() {
    const eat = new Date(Date.now() + EAT_OFFSET);
    const day = eat.getUTCDay();
    return (day === 4 && eat.getUTCHours() >= 1) || day === 5;
}

function getThursdayWindowStart() {
    const eat = new Date(Date.now() + EAT_OFFSET);
    const day = eat.getUTCDay();
    let daysBack = (day - 4 + 7) % 7;
    if (day === 4 && eat.getUTCHours() < 1) daysBack = 7;
    const thu = new Date(eat);
    thu.setUTCDate(eat.getUTCDate() - daysBack);
    thu.setUTCHours(1, 0, 0, 0);
    return thu.getTime() - EAT_OFFSET;
}

function usedWeeklyLoan(d) {
    return (d.lastLoanTaken || 0) >= getThursdayWindowStart();
}

function applyInterest(d) {
    const now = Date.now();
    d.lastInterest   ??= now;
    d.interestEarned ??= { garaad: 0 };
    d.interestEarned.garaad ??= 0;

    const days = Math.floor((now - d.lastInterest) / INTEREST_INTERVAL);
    if (days <= 0) return;

    if (d.banks.garaad > 0) {
        const interest          = Math.floor(d.banks.garaad * INTEREST_RATE * days);
        d.banks.garaad         += interest;
        d.interestEarned.garaad += interest;
    }
    d.lastInterest = now;
}

function bankTotalDeposits() {
    return Object.values(econData)
        .filter(d => d && typeof d === 'object' && !d.__treasury__)
        .reduce((sum, d) => sum + (d.banks?.garaad || 0), 0);
}

function bankTotalInterest() {
    return Object.values(econData)
        .filter(d => d && typeof d === 'object' && !d.__treasury__)
        .reduce((sum, d) => sum + (d.interestEarned?.garaad || 0), 0);
}

// ── Embeds ────────────────────────────────────────────────────────

function buildMainEmbed(d) {
    const t = getTreasury();
    return new EmbedBuilder()
        .setTitle('🏦 Garaad Bank')
        .setColor('#2471a3')
        .addFields(
            { name: '💳 Wallet',          value: `**₿ ${fmt(d.btc || 0)}**`,                    inline: true },
            { name: '🏦 Bank Balance',    value: `**₿ ${fmt(d.banks.garaad)}**`,                 inline: true },
            { name: '📈 Interest Earned', value: `**+₿ ${fmt(d.interestEarned?.garaad || 0)}**`, inline: true },
            { name: '🏛️ Treasury',        value: `**₿ ${fmt(t.balance || 0)}**`,                 inline: true },
            { name: '📊 Interest Rate',   value: '**1% per day**',                               inline: true },
        )
        .setFooter({ text: 'Garaad Bank • 1% daily interest on deposits' });
}

function buildBankEmbed(d) {
    const loan    = d.loan;
    const hasLoan = !!(loan && loan.owed > 0);
    const fields  = [
        { name: '🏦 Bank Balance',    value: `**₿ ${fmt(d.banks.garaad)}**`,                  inline: true },
        { name: '💳 Wallet',          value: `**₿ ${fmt(d.btc || 0)}**`,                       inline: true },
        { name: '📈 Interest Earned', value: `**+₿ ${fmt(d.interestEarned?.garaad || 0)}**`,   inline: true },
        { name: '📊 Rate',            value: '**1% per day**',                                  inline: true },
        { name: '🏛️ Total Deposits',  value: `**₿ ${fmt(bankTotalDeposits())}**`,              inline: true },
    ];
    if (hasLoan) {
        const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - loan.takenAt) / 86400000));
        fields.push({ name: '⚠️ Active Loan', value: `**₿ ${fmt(loan.owed)}** due — ${daysLeft > 0 ? `${daysLeft} day(s) left` : '🔴 Being deducted!'}`, inline: false });
    }
    return new EmbedBuilder()
        .setTitle('🏦 Garaad Bank — Savings')
        .setColor('#2471a3')
        .addFields(...fields)
        .setFooter({ text: 'Garaad Bank • Deposit to grow your BTC' });
}

function buildTreasuryEmbed() {
    const t     = getTreasury();
    const bal   = t.balance || 0;
    const total = t.totalIn || 0;
    const spent = total - bal;
    return new EmbedBuilder()
        .setTitle('🏛️ Treasury')
        .setColor('#8e44ad')
        .addFields(
            { name: '🏛️ Balance',   value: `**₿ ${fmt(bal)}**`,   inline: true },
            { name: '📥 Total In',  value: `**₿ ${fmt(total)}**`,  inline: true },
            { name: '📤 Total Out', value: `**₿ ${fmt(spent)}**`,  inline: true },
        )
        .setFooter({ text: 'Garaad Bank • Sources: shop, flips, loans, tax' });
}

function buildLoanEmbed(d) {
    const loan     = d.loan;
    const hasLoan  = !!(loan && loan.owed > 0);
    const open     = isBankOpen();
    const usedWeek = usedWeeklyLoan(d);

    if (hasLoan) {
        const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - loan.takenAt) / 86400000));
        return new EmbedBuilder()
            .setTitle('💳 Active Loan ⚠️')
            .setColor('#e74c3c')
            .addFields(
                { name: '💸 Due',        value: `**₿ ${fmt(loan.owed)}**`,                                               inline: true },
                { name: '⏱️ Auto-deduct', value: daysLeft > 0 ? `**${daysLeft} day(s)**` : '**🔴 Now!**',                inline: true },
                { name: '💳 Wallet',     value: `**₿ ${fmt(d.btc || 0)}**`,                                              inline: true },
            )
            .setFooter({ text: 'Garaad Bank • Pay back quickly' });
    }

    if (!open) {
        return new EmbedBuilder()
            .setTitle('💳 Loan — Closed 🔴')
            .setColor('#7f8c8d')
            .addFields(
                { name: '💰 You get',   value: `**₿ ${fmt(LOAN_MAX)}**`,  inline: true },
                { name: '💸 You repay', value: `**₿ ${fmt(LOAN_OWED)}**`, inline: true },
                { name: '📅 Opens',     value: '**Thu 1am (EAT)**',        inline: true },
            )
            .setFooter({ text: 'Garaad Bank • Once per week • Auto-deducted after 3 days' });
    }

    if (usedWeek) {
        return new EmbedBuilder()
            .setTitle('💳 Loan — Used This Week 🟡')
            .setColor('#e67e22')
            .addFields(
                { name: '⚠️ Status',   value: '**Already taken this week**', inline: true },
                { name: '💳 Wallet',   value: `**₿ ${fmt(d.btc || 0)}**`,    inline: true },
                { name: '📅 Next',     value: '**Next Thursday**',            inline: true },
            )
            .setFooter({ text: 'Garaad Bank' });
    }

    return new EmbedBuilder()
        .setTitle('💳 Loan — Open 🟢')
        .setColor('#2ecc71')
        .addFields(
            { name: '💰 You get',    value: `**₿ ${fmt(LOAN_MAX)}**`,   inline: true },
            { name: '💸 You repay',  value: `**₿ ${fmt(LOAN_OWED)}**`,  inline: true },
            { name: '💳 Wallet',     value: `**₿ ${fmt(d.btc || 0)}**`, inline: true },
        )
        .setFooter({ text: 'Garaad Bank • Once/week • Auto-deducted after 3 days' });
}

// ── Rows ──────────────────────────────────────────────────────────

function bankFullRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eb_khaznad_${userId}`)         .setLabel('🏛️ Treasury').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_eb_garaad_${userId}`)          .setLabel('🏦 Bank')    .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`eco_eba_deposit_garaad_${userId}`) .setLabel('⬇️ Deposit') .setStyle(ButtonStyle.Success),
    );
}

function ebCloseRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eba_withdraw_garaad_${userId}`).setLabel('⬆️ Withdraw') .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_eb_deen_${userId}`)            .setLabel('💳 Loan')     .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_eb_transfer_${userId}`)        .setLabel('💸 Transfer') .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)            .setLabel('✖ Close')     .setStyle(ButtonStyle.Danger),
    );
}

function actionRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eba_deposit_garaad_${userId}`) .setLabel('⬇️ Deposit') .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`eco_eba_withdraw_garaad_${userId}`).setLabel('⬆️ Withdraw').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`eco_eb_deen_${userId}`)            .setLabel('💳 Loan')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)            .setLabel('✖ Close')    .setStyle(ButtonStyle.Danger),
    );
}

function deenRow(userId, hasLoan, d) {
    const canTake = !hasLoan && isBankOpen() && !usedWeeklyLoan(d || {});
    return new ActionRowBuilder().addComponents(
        ...(hasLoan ? [
            new ButtonBuilder()
                .setCustomId(`eco_dn_pay_${userId}`)
                .setLabel(`₿ Repay Loan (₿: ${fmt(LOAN_OWED)})`)
                .setStyle(ButtonStyle.Success),
        ] : [
            new ButtonBuilder()
                .setCustomId(`eco_dn_take_${userId}`)
                .setLabel(`💳 Take Loan (₿: ${fmt(LOAN_MAX)})`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!canTake),
        ]),
        new ButtonBuilder().setCustomId(`eco_eb_garaad_${userId}`).setLabel('🔙 Back') .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)  .setLabel('✖ Close').setStyle(ButtonStyle.Danger),
    );
}

function backRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eb_main_${userId}`).setLabel('🔙 Back') .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`).setLabel('✖ Close').setStyle(ButtonStyle.Danger),
    );
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`).setLabel('✖ Close').setStyle(ButtonStyle.Danger),
    );
}

// ── Command ───────────────────────────────────────────────────────

module.exports = async function ebankCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];
    applyInterest(d);
    saveEcon();
    return message.reply({
        embeds:     [buildMainEmbed(d)],
        components: [bankFullRow(userId), ebCloseRow(userId)],
    });
};

module.exports.applyInterest      = applyInterest;
module.exports.bankTotalDeposits  = bankTotalDeposits;
module.exports.bankTotalInterest  = bankTotalInterest;
module.exports.buildMainEmbed     = buildMainEmbed;
module.exports.buildBankEmbed     = buildBankEmbed;
module.exports.buildTreasuryEmbed = buildTreasuryEmbed;
module.exports.buildLoanEmbed     = buildLoanEmbed;
module.exports.buildKhaznadEmbed  = buildTreasuryEmbed; // alias for compat
module.exports.buildDeenEmbed     = buildLoanEmbed;     // alias for compat
module.exports.bankFullRow        = bankFullRow;
module.exports.ebCloseRow         = ebCloseRow;
module.exports.actionRow          = actionRow;
module.exports.deenRow            = deenRow;
module.exports.backRow            = backRow;
module.exports.closeRow           = closeRow;
module.exports.LOAN_MAX           = LOAN_MAX;
module.exports.LOAN_OWED          = LOAN_OWED;
module.exports.isBankOpen         = isBankOpen;
module.exports.usedWeeklyLoan     = usedWeeklyLoan;
