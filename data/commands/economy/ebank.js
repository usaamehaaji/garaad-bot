const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury, addToTreasury } = require('../../../src/economy/econStore');
const { fmt } = require('../../../src/utils/helpers');

const INTEREST_RATE     = 0.01;
const INTEREST_TAX_RATE = 0.10; // 10% of interest goes to treasury
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
        const gross             = Math.floor(d.banks.garaad * INTEREST_RATE * days);
        const tax               = Math.floor(gross * INTEREST_TAX_RATE);
        const interest          = gross - tax;
        d.banks.garaad         += interest;
        d.interestEarned.garaad += interest;
        if (tax > 0) addToTreasury(tax);
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
    return new EmbedBuilder()
        .setTitle('🏦 Garaad Bank')
        .setColor('#1a73e8')
        .setDescription(
            `💳 **Wallet:** ₿ ${fmt(d.btc || 0)}　　🏦 **Bank:** ₿ ${fmt(d.banks?.garaad || 0)}\n` +
            `📈 **Earned:** +₿ ${fmt(d.interestEarned?.garaad || 0)}　　📊 **1%/day**`
        )
        .setFooter({ text: 'Garaad Bank • 1% daily interest' });
}

function buildBankEmbed(d) {
    return new EmbedBuilder()
        .setTitle('🏦 Garaad Bank — Savings')
        .setColor('#2471a3')
        .addFields(
            { name: '🏦 Bank Balance',    value: `**₿ ${fmt(d.banks.garaad)}**`,                inline: true },
            { name: '💳 Wallet',          value: `**₿ ${fmt(d.btc || 0)}**`,                     inline: true },
            { name: '📈 Interest Earned', value: `**+₿ ${fmt(d.interestEarned?.garaad || 0)}**`, inline: true },
            { name: '📊 Rate',            value: '**1% per day**',                                inline: true },
            { name: '🏛️ Total Deposits',  value: `**₿ ${fmt(bankTotalDeposits())}**`,            inline: true },
        )
        .setFooter({ text: 'Garaad Bank • Deposit to grow your BTC' });
}

function buildTreasuryEmbed() {
    const t = getTreasury();
    return new EmbedBuilder()
        .setTitle('🏛️ Treasury')
        .setColor('#8e44ad')
        .addFields(
            { name: '🏛️ Balance',   value: `**₿ ${fmt(t.balance  || 0)}**`, inline: true },
            { name: '📥 Total In',  value: `**₿ ${fmt(t.totalIn  || 0)}**`, inline: true },
            { name: '📤 Total Out', value: `**₿ ${fmt(t.totalOut || 0)}**`, inline: true },
        )
        .setFooter({ text: 'Garaad Bank • Sources: shop, flips, tax' });
}


// ── Rows ──────────────────────────────────────────────────────────

function bankFullRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eba_deposit_garaad_${userId}`) .setLabel('⬇ Deposit')  .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`eco_eba_withdraw_garaad_${userId}`).setLabel('⬆ Withdraw') .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)            .setLabel('✖ Xir')      .setStyle(ButtonStyle.Danger),
    );
}

function ebCloseRow(userId) {
    return null; // merged into bankFullRow
}

function actionRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eba_deposit_garaad_${userId}`) .setLabel('⬇️ Deposit') .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`eco_eba_withdraw_garaad_${userId}`).setLabel('⬆️ Withdraw').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)            .setLabel('✖ Close')    .setStyle(ButtonStyle.Danger),
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
        components: [bankFullRow(userId)],
    });
};

module.exports.applyInterest      = applyInterest;
module.exports.bankTotalDeposits  = bankTotalDeposits;
module.exports.bankTotalInterest  = bankTotalInterest;
module.exports.buildMainEmbed     = buildMainEmbed;
module.exports.buildBankEmbed     = buildBankEmbed;
module.exports.buildTreasuryEmbed = buildTreasuryEmbed;
module.exports.buildKhaznadEmbed  = buildTreasuryEmbed;
module.exports.bankFullRow        = bankFullRow;
module.exports.ebCloseRow         = ebCloseRow;
module.exports.actionRow          = actionRow;
module.exports.backRow            = backRow;
module.exports.closeRow           = closeRow;
