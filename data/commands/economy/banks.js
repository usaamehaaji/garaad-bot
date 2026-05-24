const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { applyInterest, buildMainEmbed, buildBankEmbed, bankFullRow, ebCloseRow, LOAN_MAX, LOAN_OWED } = require('./ebank');
const { fmt } = require('../../../src/utils/helpers');

function buildBanksEmbed(d, username) {
    const wallet  = d.btc || 0;
    const bank    = d.banks?.garaad || 0;
    const total   = wallet + bank;
    const interest = d.interestEarned?.garaad || 0;
    const loan    = d.loan;
    const hasLoan = !!(loan && loan.owed > 0);

    // Simple bar: bank% of total
    const bankPct  = total > 0 ? Math.round((bank / total) * 10) : 0;
    const walletPct = 10 - bankPct;
    const bar = '🟦'.repeat(bankPct) + '⬜'.repeat(walletPct);

    const fields = [
        { name: '💳 Wallet',        value: `**₿ ${fmt(wallet)}**`,    inline: true },
        { name: '🏦 Garaad Bank',   value: `**₿ ${fmt(bank)}**`,      inline: true },
        { name: '💰 Total',         value: `**₿ ${fmt(total)}**`,     inline: true },
        { name: '📈 Interest',       value: `**+₿ ${fmt(interest)}**`, inline: true },
        { name: '📊 Bank Rate',      value: `**1% per day**`,          inline: true },
        { name: '💳 Loan',           value: hasLoan
            ? `**₿ ${fmt(loan.owed)}** owed ⚠️`
            : `**₿ ${fmt(LOAN_MAX)}** available`,                     inline: true },
        { name: `📊 Wallet vs Bank`, value: `${bar}\n_Wallet ${walletPct * 10}% • Bank ${bankPct * 10}%_`, inline: false },
    ];

    return new EmbedBuilder()
        .setTitle(`🏦 ${username} — My Banks`)
        .setColor('#2471a3')
        .addFields(...fields)
        .setFooter({ text: 'Garaad Bank • Deposit to earn 1% daily interest' });
}

function banksRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`eco_eba_deposit_garaad_${userId}`) .setLabel('⬇️ Deposit') .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`eco_eba_withdraw_garaad_${userId}`).setLabel('⬆️ Withdraw').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`eco_eb_deen_${userId}`)            .setLabel('💳 Loan')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`eco_eb_transfer_${userId}`)        .setLabel('💸 Transfer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_ebank_${userId}`)            .setLabel('✖ Close')    .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function banksCmd(message) {
    const userId   = message.author.id;
    const username = message.author.username;
    checkEconUser(userId);
    const d = econData[userId];
    applyInterest(d);
    saveEcon();
    return message.reply({
        embeds:     [buildBanksEmbed(d, username)],
        components: [banksRow(userId)],
    });
};
