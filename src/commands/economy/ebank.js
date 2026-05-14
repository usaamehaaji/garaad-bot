const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

// Mandeeq = 2% per day, Garaad = 4% per day interest
const INTEREST_RATES    = { mandeeq: 0.02, garaad: 0.04 };
const INTEREST_INTERVAL = 24 * 60 * 60 * 1000;

function bankTotalDeposits(bankName) {
    return Object.values(econData)
        .reduce((sum, d) => sum + (d.banks?.[bankName] || 0), 0);
}

function bankTotalInterest(bankName) {
    return Object.values(econData)
        .reduce((sum, d) => sum + (d.interestEarned?.[bankName] || 0), 0);
}

function applyInterest(d) {
    const now = Date.now();
    d.lastInterest   ??= now;
    d.interestEarned ??= { mandeeq: 0, garaad: 0 };
    d.interestEarned.mandeeq ??= 0;
    d.interestEarned.garaad  ??= 0;

    const days = Math.floor((now - d.lastInterest) / INTEREST_INTERVAL);
    if (days <= 0) return;

    for (const bank of ['mandeeq', 'garaad']) {
        if (d.banks[bank] > 0) {
            const interest     = Math.floor(d.banks[bank] * INTEREST_RATES[bank] * days);
            d.banks[bank]     += interest;
            d.interestEarned[bank] += interest;
        }
    }
    d.lastInterest = now;
}

function bankSelectRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_eb_mandeeq_${userId}`)
            .setLabel('🏦 Mandeeq Bank')
            .setStyle(ButtonStyle.Primary),
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

function actionRow(bank, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_eba_deposit_${bank}_${userId}`)
            .setLabel('⬇️ Dhig (Deposit)')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`eco_eba_withdraw_${bank}_${userId}`)
            .setLabel('⬆️ Bax (Withdraw)')
            .setStyle(ButtonStyle.Primary),
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

module.exports = async function ebankCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];
    applyInterest(d);
    saveEcon();

    const mDep = bankTotalDeposits('mandeeq');
    const gDep = bankTotalDeposits('garaad');
    const mInt = bankTotalInterest('mandeeq');
    const gInt = bankTotalInterest('garaad');

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🏦 Garaad Economy — Banks')
            .setColor('#3498db')
            .addFields(
                {
                    name: '💼 Xisaabkaaga',
                    value:
                        `🏦 Mandeeq: **$${fmt(d.banks.mandeeq)}**\n` +
                        `🏦 Garaad:  **$${fmt(d.banks.garaad)}**\n` +
                        `💵 USD:     **$${fmt(d.usd)}**`,
                    inline: false,
                },
                {
                    name: '📈 Interest Heshay — Adigu',
                    value:
                        `Mandeeq (**2%**/maalin): **+$${fmt(d.interestEarned?.mandeeq || 0)}**\n` +
                        `Garaad  (**4%**/maalin): **+$${fmt(d.interestEarned?.garaad  || 0)}**`,
                    inline: false,
                },
                {
                    name: '🏦 Mandeeq Bank — Dhammaan Macaamiisha',
                    value:
                        `💰 Lacag dhiggan: **$${fmt(mDep)}**\n` +
                        `📈 Interest la helay: **$${fmt(mInt)}**`,
                    inline: true,
                },
                {
                    name: '🏦 Garaad Bank — Dhammaan Macaamiisha',
                    value:
                        `💰 Lacag dhiggan: **$${fmt(gDep)}**\n` +
                        `📈 Interest la helay: **$${fmt(gInt)}**`,
                    inline: true,
                },
            )
            .setFooter({ text: '📈 Mandeeq 2%/maalin • Garaad 4%/maalin • Lacagtu way kobtaa!' }),
    ], components: [bankSelectRow(userId)] });
};

module.exports.applyInterest       = applyInterest;
module.exports.bankTotalDeposits   = bankTotalDeposits;
module.exports.bankTotalInterest   = bankTotalInterest;
module.exports.actionRow           = actionRow;
module.exports.closeRow            = closeRow;
