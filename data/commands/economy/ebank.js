const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

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
        .setTitle('🏦 Garaad Bank — Overview')
        .setColor('#3498db')
        .setDescription(
            `**💼 Your Account:**\n` +
            `Wallet: **₿${fmt(d.btc || 0)}**\n` +
            `🏦 Bank: **₿${fmt(d.banks.garaad)}**\n\n` +
            `📈 Interest earned: **+₿${fmt(d.interestEarned?.garaad || 0)}**\n\n` +
            `🏛️ Treasury: **₿${fmt(t.balance || 0)}**`
        )
        .setFooter({ text: 'Garaad Bank • 1% daily interest on deposits' });
}

function buildBankEmbed(d) {
    const loan    = d.loan;
    const hasLoan = !!(loan && loan.owed > 0);
    let loanLine  = '';
    if (hasLoan) {
        const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - loan.takenAt) / 86400000));
        loanLine = `\n\n⚠️ **Active Loan:** ₿${fmt(loan.owed)} due | ${daysLeft > 0 ? `${daysLeft} days left` : '🔴 Being deducted!'}`;
    }
    return new EmbedBuilder()
        .setTitle('🏦 Garaad Bank')
        .setColor('#2980b9')
        .setDescription(
            `🏦 **Deposited:** **₿${fmt(d.banks.garaad)}**\n` +
            `**Wallet:** **₿${fmt(d.btc || 0)}**\n` +
            `📈 **Interest earned:** +₿${fmt(d.interestEarned?.garaad || 0)}\n\n` +
            `📊 **Rate:** 1% per day\n` +
            `🏦 **Total in bank:** ₿${fmt(bankTotalDeposits())}` +
            loanLine
        )
        .setFooter({ text: 'Garaad Bank • Deposit to grow your BTC' });
}

function buildTreasuryEmbed() {
    const t     = getTreasury();
    const bal   = t.balance || 0;
    const total = t.totalIn || 0;
    const spent = total - bal;
    return new EmbedBuilder()
        .setTitle('🏛️ Treasury — Garaad Bank')
        .setColor('#8e44ad')
        .setDescription(
            `**💰 Current:**\n` +
            `🏛️ Balance: **₿${fmt(bal)}**\n\n` +
            `**📊 Stats:**\n` +
            `📥 Total in: **₿${fmt(total)}**\n` +
            `📤 Total out: **₿${fmt(spent)}**\n\n` +
            `**📌 Sources:** Shop sales, flip losses, loan fees, tax`
        )
        .setFooter({ text: 'Garaad Bank Treasury' });
}

function buildLoanEmbed(d) {
    const loan     = d.loan;
    const hasLoan  = !!(loan && loan.owed > 0);
    const open     = isBankOpen();
    const usedWeek = usedWeeklyLoan(d);

    if (hasLoan) {
        const daysPassed = Math.floor((Date.now() - loan.takenAt) / 86400000);
        const daysLeft   = Math.max(0, 3 - daysPassed);
        return new EmbedBuilder()
            .setTitle('💳 Loan — Garaad Bank')
            .setColor('#e74c3c')
            .setDescription(
                `⚠️ **Active Loan — Pay it back!**\n\n` +
                `₿ Borrowed: **₿${fmt(LOAN_MAX)}**\n` +
                `💸 Due: **₿${fmt(loan.owed)}**\n` +
                (daysLeft > 0
                    ? `⏱️ Auto-deduct in: **${daysLeft} day(s)**`
                    : `🔴 **Being deducted now from your bank/wallet.**`)
            )
            .setFooter({ text: 'Garaad Bank • Pay back quickly' });
    }

    if (!open) {
        return new EmbedBuilder()
            .setTitle('💳 Loan — Garaad Bank')
            .setColor('#7f8c8d')
            .setDescription(
                `🔴 **Loan window is CLOSED**\n` +
                `_Opens: Thursday 1:00 AM — Friday end (EAT)_\n\n` +
                `**📋 Loan Terms:**\n` +
                `₿ You receive: **₿${fmt(LOAN_MAX)}**\n` +
                `💸 You repay: **₿${fmt(LOAN_OWED)}** (₿${LOAN_FEE} fee)\n` +
                `🔒 Once per week • Auto-deducted after 3 days`
            )
            .setFooter({ text: 'Garaad Bank' });
    }

    if (usedWeek) {
        return new EmbedBuilder()
            .setTitle('💳 Loan — Garaad Bank')
            .setColor('#e67e22')
            .setDescription(
                `🟡 **Loan window is OPEN** _(Thursday)_\n\n` +
                `⚠️ **You already took a loan this week.** Come back next Thursday.\n\n` +
                `Wallet: **₿${fmt(d.btc || 0)}**`
            )
            .setFooter({ text: 'Garaad Bank' });
    }

    const t = getTreasury();
    return new EmbedBuilder()
        .setTitle('💳 Loan — Garaad Bank')
        .setColor('#2ecc71')
        .setDescription(
            `🟢 **Loan window is OPEN** _(Thursday)_\n\n` +
            `**📋 Loan Terms:**\n\n` +
            `₿ You receive: **₿${fmt(LOAN_MAX)}**\n` +
            `💸 You repay: **₿${fmt(LOAN_OWED)}** (₿${LOAN_FEE} fee only)\n\n` +
            `🔒 **Auto-deducted after 3 days** from bank/wallet\n` +
            `📅 **Once per week** — Thursday 1am to Friday end\n\n` +
            `🏛️ Treasury: **₿${fmt(t.balance || 0)}** | Wallet: **₿${fmt(d.btc || 0)}**`
        )
        .setFooter({ text: 'Garaad Bank' });
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
        new ButtonBuilder().setCustomId(`eco_eba_withdraw_garaad_${userId}`).setLabel('⬆️ Withdraw').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_eb_deen_${userId}`)            .setLabel('💳 Loan')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)            .setLabel('✖ Close')    .setStyle(ButtonStyle.Danger),
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
                .setLabel(`₿ Repay Loan (₿${fmt(LOAN_OWED)})`)
                .setStyle(ButtonStyle.Success),
        ] : [
            new ButtonBuilder()
                .setCustomId(`eco_dn_take_${userId}`)
                .setLabel(`💳 Take Loan (₿${fmt(LOAN_MAX)})`)
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
