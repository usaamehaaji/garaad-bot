const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fmt } = require('../../../utils/helpers');
const { econData, checkEconUser, getTreasury, addToTreasury } = require('../../economy/econStore');

const LOAN_AMOUNT     = 100;
const LOAN_OWED       = 110;
const DEDUCT_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const CLOSED_MESSAGES = [
    'Maamulka bangiga maanta shaqada kuma jiro.',
    'Keedsane Bank maanta lacag deeyn ma siiso.',
    'Bangiga maanta xiran yahay — berri soo noqo.',
    'Deeynta maanta joojisan — bangiga waa la dayacay.',
];

// Deterministic: closed ~30% of days based on date
function isBankOpen() {
    const d    = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return (seed % 10) >= 3;
}

function buildDeenEmbed(d) {
    const open    = isBankOpen();
    const loan    = d.loan;
    const hasLoan = !!(loan && loan.owed > 0);

    let loanBlock = '';
    if (hasLoan) {
        const daysPassed = Math.floor((Date.now() - loan.takenAt) / 86400000);
        const daysLeft   = Math.max(0, 3 - daysPassed);
        loanBlock =
            '\n\n⚠️ **Deen Jirto — La Xisaabi!**\n' +
            `💵 Xaddad heshay: **$${fmt(LOAN_AMOUNT)}**\n` +
            `Faido (10%): **$${fmt((LOAN_OWED - LOAN_AMOUNT))}**\n` +
            `Wadarta aad bixineyso: **$${fmt(loan.owed)}**\n` +
            (daysLeft > 0
                ? `⏱️ Bangiyada laga jaraa: **${daysLeft} malin** gudahood`
                : `🔴 **Xilligan la jarayo!** Bangiyada (Mandeeq/Garaad) $${fmt(LOAN_OWED)} laga jartay.`);
    }

    const day       = new Date();
    const closedMsg = CLOSED_MESSAGES[day.getDate() % CLOSED_MESSAGES.length];

    return new EmbedBuilder()
        .setTitle('🏦 Keedsane Bank — Deen Adeeg')
        .setColor(open ? '#8e44ad' : '#7f8c8d')
        .setDescription(
            (open
                ? '🟢 **Bangiga maanta wuu furan yahay**'
                : `🔴 **Bangiga maanta XIRAN yahay**\n_${closedMsg}_`) +
            `\n\n🏛️ **Khaznadda:** $${fmt((getTreasury().balance || 0))} USD\n\n` +
            `**📋 Deen Xukumka:**\n` +
            `💵 Waxaad helaysaa: **$${fmt(LOAN_AMOUNT)} USD**\n` +
            `💸 Waxaad celinsaa: **$${fmt(LOAN_OWED)} USD** (10% faido)\n\n` +
            `🔒 **3 malin kadib** — $${fmt(LOAN_OWED)} bangiyada kale (Mandeeq/Garaad) laga jaraysaa si toos ah.\n` +
            loanBlock
        )
        .setFooter({ text: 'Garaad Economy • Keedsane Bank' });
}

function deenRow(userId, hasLoan, open) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_dn_take_${userId}`)
            .setLabel(`💳 Deen Qaado ($${fmt(LOAN_AMOUNT)})`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!open || hasLoan),
        new ButtonBuilder()
            .setCustomId(`eco_dn_pay_${userId}`)
            .setLabel(`💵 Deen Celi ($${fmt(LOAN_OWED)})`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(!hasLoan),
        new ButtonBuilder()
            .setCustomId(`close_deen_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

// Called by bankChargeScheduler — deducts $110 from banks/usd silently
function applyLoanDeduction(d) {
    const loan = d.loan;
    if (!loan || loan.owed <= 0) return false;
    if (Date.now() - loan.takenAt < DEDUCT_AFTER_MS) return false;

    let remaining = loan.owed;

    for (const bank of ['mandeeq', 'garaad']) {
        if (remaining <= 0) break;
        const avail = d.banks?.[bank] || 0;
        if (avail <= 0) continue;
        const take       = Math.min(remaining, avail);
        d.banks[bank]   -= take;
        remaining        -= take;
    }

    if (remaining > 0 && d.usd > 0) {
        const take = Math.min(remaining, d.usd);
        d.usd     -= take;
        remaining  -= take;
    }

    const fullyPaid = remaining === 0;
    d.loan = fullyPaid ? null : { ...loan, owed: remaining };
    if (fullyPaid) addToTreasury(LOAN_OWED - LOAN_AMOUNT);
    return true;
}

module.exports = async function deenCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d       = econData[userId];
    const open    = isBankOpen();
    const hasLoan = !!(d.loan && d.loan.owed > 0);

    return message.reply({
        embeds:     [buildDeenEmbed(d)],
        components: [deenRow(userId, hasLoan, open)],
    });
};

module.exports.buildDeenEmbed     = buildDeenEmbed;
module.exports.deenRow            = deenRow;
module.exports.isBankOpen         = isBankOpen;
module.exports.LOAN_AMOUNT        = LOAN_AMOUNT;
module.exports.LOAN_OWED          = LOAN_OWED;
module.exports.applyLoanDeduction = applyLoanDeduction;
