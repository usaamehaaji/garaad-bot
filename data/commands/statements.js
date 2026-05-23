// =====================================================================
// AMARKA: ?statements
// Xisaabta bank-ka iyo lacagihii la dhigay
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData }  = require('../store');
const { checkUser } = require('../utils/helpers');

function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

module.exports = async function statementsCommand(message) {
    const userId = message.author.id;
    checkUser(userId);

    const d    = userData[userId];
    const bank = d.bank;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_statements_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    const txList = bank.transactions.slice(0, 10);

    let historyText = '';
    if (txList.length === 0) {
        historyText = '_Wali lacag bank lama dhigin._';
    } else {
        historyText = txList.map((tx, i) => {
            const arrow = tx.type === 'deposit' ? '📥' : '📤';
            const sign  = tx.type === 'deposit' ? '+' : '−';
            return `${arrow} \`${formatDate(tx.at)}\` — **${sign}${tx.amount} IQ**`;
        }).join('\n');
    }

    const embed = new EmbedBuilder()
        .setTitle(`🏦 Bank Statement — ${message.author.username}`)
        .addFields(
            { name: '💰 Kaydka Bank', value: `**${bank.balance} IQ**`, inline: true },
            { name: '🧠 IQ-daada', value: `**${d.iq} IQ**`, inline: true },
            { name: '📋 Lacagihii Dambe (10)', value: historyText, inline: false },
        )
        .setColor('#3498db')
        .setFooter({ text: '?bank add <xaddad> — dhig  |  ?bank qaado <xaddad> — qaado' });

    return message.reply({ embeds: [embed], components: [row] });
};
