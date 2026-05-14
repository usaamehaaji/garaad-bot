const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');

const SERVICE_CHARGE_RATE = 0.10; // 10% maalintii
const CHARGE_INTERVAL     = 24 * 60 * 60 * 1000;

// Lacagta oo dhan ee dad u dhigeen mid kasta oo bank ah
function bankTotalDeposits(bankName) {
    return Object.values(econData)
        .reduce((sum, d) => sum + (d.banks?.[bankName] || 0), 0);
}

// Lacagta oo dhan ee bank ka helay adeegga
function bankTotalCharges(bankName) {
    return Object.values(econData)
        .reduce((sum, d) => sum + (d.serviceChargesPaid?.[bankName] || 0), 0);
}

function applyServiceCharge(d) {
    const now = Date.now();
    d.lastInterest         ??= now;
    d.serviceChargesPaid   ??= { mandeeq: 0, garaad: 0 };
    d.serviceChargesPaid.mandeeq ??= 0;
    d.serviceChargesPaid.garaad  ??= 0;

    const days = Math.floor((now - d.lastInterest) / CHARGE_INTERVAL);
    if (days <= 0) return;

    for (const bank of ['mandeeq', 'garaad']) {
        if (d.banks[bank] > 0) {
            const charge = Math.floor(d.banks[bank] * SERVICE_CHARGE_RATE * days);
            d.banks[bank]                 = Math.max(0, d.banks[bank] - charge);
            d.serviceChargesPaid[bank]   += charge;
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
    applyServiceCharge(d);
    saveEcon();

    const mDep     = bankTotalDeposits('mandeeq');
    const gDep     = bankTotalDeposits('garaad');
    const mCharges = bankTotalCharges('mandeeq');
    const gCharges = bankTotalCharges('garaad');
    const grandDep    = mDep + gDep;
    const grandCharge = mCharges + gCharges;

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🏦 Garaad Economy — Banks')
            .setColor('#3498db')
            .addFields(
                {
                    name: '💼 Xisaabkaaga',
                    value:
                        `🏦 Mandeeq: **$${d.banks.mandeeq.toLocaleString()}**\n` +
                        `🏦 Garaad:  **$${d.banks.garaad.toLocaleString()}**\n` +
                        `💵 USD:     **$${d.usd.toLocaleString()}**`,
                    inline: false,
                },
                {
                    name: '📊 Service Charges — Adigu bixisay',
                    value:
                        `Mandeeq: **$${(d.serviceChargesPaid?.mandeeq || 0).toLocaleString()}**\n` +
                        `Garaad:  **$${(d.serviceChargesPaid?.garaad  || 0).toLocaleString()}**`,
                    inline: false,
                },
                {
                    name: '🏦 Mandeeq Bank — Dhammaan Macaamiisha',
                    value:
                        `💰 Lacag dhiggan: **$${mDep.toLocaleString()}**\n` +
                        `💸 Charges la helay: **$${mCharges.toLocaleString()}**`,
                    inline: true,
                },
                {
                    name: '🏦 Garaad Bank — Dhammaan Macaamiisha',
                    value:
                        `💰 Lacag dhiggan: **$${gDep.toLocaleString()}**\n` +
                        `💸 Charges la helay: **$${gCharges.toLocaleString()}**`,
                    inline: true,
                },
                {
                    name: '📈 Wadarta Guud — Banks Labadaba',
                    value:
                        `💰 Lacag dhiggan oo dhan: **$${grandDep.toLocaleString()}**\n` +
                        `💸 Charges oo dhan: **$${grandCharge.toLocaleString()}**`,
                    inline: false,
                },
            )
            .setFooter({ text: '💸 Service Charge: 10% maalintii • Bank = lacag la ilaaliyaa' }),
    ], components: [bankSelectRow(userId)] });
};

module.exports.applyServiceCharge = applyServiceCharge;
module.exports.bankTotalDeposits  = bankTotalDeposits;
module.exports.bankTotalCharges   = bankTotalCharges;
module.exports.actionRow          = actionRow;
module.exports.closeRow           = closeRow;
