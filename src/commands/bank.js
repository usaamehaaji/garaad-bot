// =====================================================================
// AMARKA: ?iq [xaddad]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser }          = require('../utils/helpers');

function iqRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`iq_dhigo_btn_${userId}`)
            .setLabel('IQ dhigo')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`iq_labax_btn_${userId}`)
            .setLabel('IQ la bax')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_bank_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function balanceEmbed(d, extra) {
    return new EmbedBuilder()
        .setTitle('🏦 Bank — IQ Keyd')
        .setDescription(
            (extra ? extra + '\n\n' : '') +
            `🏦 Kaydka bank: **${d.bank.balance} IQ**\n` +
            `🧠 IQ-daada: **${d.iq} IQ**`
        )
        .setColor('#3498db');
}

module.exports = async function bankCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const d = userData[userId];

    // ?iq <xaddad> — deposit toos ah
    if (args[0]) {
        const amount = parseInt(args[0], 10);
        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply({
                embeds: [new EmbedBuilder().setDescription('⚠️ Tusaale: `?iq 50`').setColor('#e74c3c')],
                components: [iqRow(userId)],
            });
        }
        if (d.iq < amount) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`⚠️ IQ kugu filna ma lihid. IQ-daadu waa **${d.iq}**.`)
                    .setColor('#e74c3c')],
                components: [iqRow(userId)],
            });
        }
        d.iq             -= amount;
        d.bank.balance   += amount;
        d.bank.transactions.unshift({ type: 'deposit', amount, at: Date.now() });
        if (d.bank.transactions.length > 20) d.bank.transactions.length = 20;
        saveData();
        return message.reply({
            embeds: [balanceEmbed(d, `✅ **${amount} IQ** bank dhigatay`)],
            components: [iqRow(userId)],
        });
    }

    // ?iq — balance kaliya
    return message.reply({
        embeds: [balanceEmbed(d)],
        components: [iqRow(userId)],
    });
};

module.exports.iqRow       = iqRow;
module.exports.balanceEmbed = balanceEmbed;
