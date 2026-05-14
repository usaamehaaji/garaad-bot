const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

const INTEREST_RATE     = 0.04;               // 4% per day — Garaad Bank only
const INTEREST_INTERVAL = 24 * 60 * 60 * 1000;
const LOAN_MAX          = 5_000;
const LOAN_FEE          = 5;
const LOAN_OWED         = LOAN_MAX + LOAN_FEE; // $5,005
const DEDUCT_AFTER_MS   = 3 * 24 * 60 * 60 * 1000;

// ── Interest ──────────────────────────────────────────────────────

function applyInterest(d) {
    const now = Date.now();
    d.lastInterest   ??= now;
    d.interestEarned ??= { mandeeq: 0, garaad: 0 };
    d.interestEarned.garaad ??= 0;

    const days = Math.floor((now - d.lastInterest) / INTEREST_INTERVAL);
    if (days <= 0) return;

    if (d.banks.garaad > 0) {
        const interest       = Math.floor(d.banks.garaad * INTEREST_RATE * days);
        d.banks.garaad      += interest;
        d.interestEarned.garaad += interest;
    }
    d.lastInterest = now;
}

// ── Bank totals ────────────────────────────────────────────────────

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
        .setTitle('🏦 Garaad Economy — Banks')
        .setColor('#3498db')
        .setDescription(
            `**💼 Xisaabkaaga:**\n` +
            `🏦 Garaad Bank: **$${fmt(d.banks.garaad)}**\n` +
            `💵 USD: **$${fmt(d.usd)}**\n\n` +
            `📈 Interest heshay: **+$${fmt(d.interestEarned?.garaad || 0)}**\n\n` +
            `🏛️ Khaznad: **$${fmt(t.balance || 0)}**`
        )
        .setFooter({ text: 'Garaad Economy • Garaad Bank 4%/maalin' });
}

function buildBankEmbed(d) {
    const loan    = d.loan;
    const hasLoan = !!(loan && loan.owed > 0);
    let loanLine  = '';
    if (hasLoan) {
        const daysLeft = Math.max(0, 3 - Math.floor((Date.now() - loan.takenAt) / 86400000));
        loanLine = `\n⚠️ **Deen jirto:** $${fmt(loan.owed)} bixin | ${daysLeft > 0 ? `${daysLeft} malin hadhay` : '🔴 La jari doonaa!'}`;
    }
    return new EmbedBuilder()
        .setTitle('🏦 Garaad Bank')
        .setColor('#2980b9')
        .setDescription(
            `🏦 **Kaydka:** **$${fmt(d.banks.garaad)}**\n` +
            `💵 **USD:** **$${fmt(d.usd)}**\n` +
            `📈 **Interest heshay:** +$${fmt(d.interestEarned?.garaad || 0)}\n\n` +
            `📈 **Rate:** 4% maalintii — Lacagtu kobceysa!\n` +
            `🏛️ **Bank oo dhan:** $${fmt(bankTotalDeposits())}` +
            loanLine
        )
        .setFooter({ text: 'Garaad Economy • Dhig si ay u kobto' });
}

function buildKhaznadEmbed() {
    const t      = getTreasury();
    const bal    = t.balance || 0;
    const total  = t.totalIn || 0;
    const spent  = total - bal;
    return new EmbedBuilder()
        .setTitle('🏛️ Khaznadda Garaad — Treasury')
        .setColor('#8e44ad')
        .setDescription(
            `**💰 Hadda:**\n` +
            `🏦 Khaznad: **$${fmt(bal)} USD**\n\n` +
            `**📊 Tirakoobka:**\n` +
            `📥 Wadarta soo gashay: **$${fmt(total)} USD**\n` +
            `📤 Wadarta la bixiyay: **$${fmt(spent)} USD**\n\n` +
            `**📌 Xaga kale:** Shop iibsiga, Cashflip qasaaraha, Deen faa'iidada`
        )
        .setFooter({ text: 'Garaad Economy • Keedsane Bank Treasury' });
}

function buildDeenEmbed(d) {
    const loan    = d.loan;
    const hasLoan = !!(loan && loan.owed > 0);
    if (hasLoan) {
        const daysPassed = Math.floor((Date.now() - loan.takenAt) / 86400000);
        const daysLeft   = Math.max(0, 3 - daysPassed);
        return new EmbedBuilder()
            .setTitle('💳 Deen — Keedsane Bank')
            .setColor('#e74c3c')
            .setDescription(
                `⚠️ **Deen Jirto — La Xisaabi!**\n\n` +
                `💵 Heshay: **$${fmt(LOAN_MAX)}**\n` +
                `💸 Bixin: **$${fmt(loan.owed)}**\n` +
                (daysLeft > 0
                    ? `⏱️ Auto-deduct: **${daysLeft} malin** gudahood`
                    : `🔴 **Xilligan la jarayo!** Garaad Bank laga jaraysaa.`)
            )
            .setFooter({ text: 'Garaad Economy • Deen si dhaqso ah u celi' });
    }
    return new EmbedBuilder()
        .setTitle('💳 Deen — Keedsane Bank')
        .setColor('#8e44ad')
        .setDescription(
            `**📋 Deen Xukumka:**\n\n` +
            `💵 Waxaad helaysaa: **$${fmt(LOAN_MAX)} USD**\n` +
            `💸 Waxaad celinsaa: **$${fmt(LOAN_OWED)} USD** ($${LOAN_FEE} dulsaar kaliya)\n\n` +
            `🔒 **3 malin kadib** — Garaad Bank laga jaraysaa si toos ah.\n\n` +
            `💵 USD-kaaga: **$${fmt(d.usd)}**`
        )
        .setFooter({ text: 'Garaad Economy • Keedsane Bank' });
}

// ── Rows ──────────────────────────────────────────────────────────

function mainRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_eb_khaznad_${userId}`)
            .setLabel('🏛️ Khaznad')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`eco_eb_garaad_${userId}`)
            .setLabel('🏦 Garaad Bank')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_ebank_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function actionRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_eba_deposit_garaad_${userId}`)
            .setLabel('⬇️ Deposit')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`eco_eba_withdraw_garaad_${userId}`)
            .setLabel('⬆️ Withdraw')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`eco_eb_deen_${userId}`)
            .setLabel('💳 Deen')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_ebank_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function deenRow(userId, hasLoan) {
    return new ActionRowBuilder().addComponents(
        ...(!hasLoan ? [
            new ButtonBuilder()
                .setCustomId(`eco_dn_take_${userId}`)
                .setLabel(`💳 Deen Qaado ($${fmt(LOAN_MAX)})`)
                .setStyle(ButtonStyle.Primary),
        ] : [
            new ButtonBuilder()
                .setCustomId(`eco_dn_pay_${userId}`)
                .setLabel(`💵 Deen Celi ($${fmt(LOAN_OWED)})`)
                .setStyle(ButtonStyle.Success),
        ]),
        new ButtonBuilder()
            .setCustomId(`eco_eb_garaad_${userId}`)
            .setLabel('🔙 Dib')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_ebank_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function backRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_eb_main_${userId}`)
            .setLabel('🔙 Dib')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_ebank_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_ebank_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
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
        components: [mainRow(userId)],
    });
};

module.exports.applyInterest      = applyInterest;
module.exports.bankTotalDeposits  = bankTotalDeposits;
module.exports.bankTotalInterest  = bankTotalInterest;
module.exports.buildMainEmbed     = buildMainEmbed;
module.exports.buildBankEmbed     = buildBankEmbed;
module.exports.buildKhaznadEmbed  = buildKhaznadEmbed;
module.exports.buildDeenEmbed     = buildDeenEmbed;
module.exports.mainRow            = mainRow;
module.exports.actionRow          = actionRow;
module.exports.deenRow            = deenRow;
module.exports.backRow            = backRow;
module.exports.closeRow           = closeRow;
module.exports.LOAN_MAX           = LOAN_MAX;
module.exports.LOAN_OWED          = LOAN_OWED;
