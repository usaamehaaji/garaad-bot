// =====================================================================
// AMARKA: ?access @user <password>
// Shared Account Access — saxiibkaaga bank/company geli
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData }              = require('../../src/store');
const { econData, checkEconUser } = require('../../src/economy/econStore');
const { checkUser }             = require('../../src/utils/helpers');
const { fmt }                   = require('../../src/utils/helpers');

function checkPassword(targetId, pw) {
    checkUser(targetId);
    const d = userData[targetId];
    if (!d.accountPassword) return true;  // no password set = public
    return d.accountPassword === pw;
}

function fmtBtc(n) { return `₿${Math.floor(n || 0).toLocaleString()}`; }

function accessRow(targetId, callerId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`acc_bank_${targetId}_${callerId}`)
            .setLabel('🏦 Bank')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`acc_company_${targetId}_${callerId}`)
            .setLabel('🏢 Company')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`acc_deposit_${targetId}_${callerId}`)
            .setLabel('📥 Deposit')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`acc_withdraw_${targetId}_${callerId}`)
            .setLabel('📤 Withdraw')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`acc_close_${callerId}`)
            .setLabel('✖ Xir')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function accessCmd(message, args) {
    const caller = message.author;
    const target = message.mentions.users.first();

    if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(
            `⚠️ **Isticmaal:** \`?access @user <password>\`\n\n` +
            `**Tusaale:**\n` +
            `\`?access @saxiib 1234\` — Saxiibkaaga account-ka geli\n\n` +
            `**Sidee u shaqaysaa:**\n` +
            `1. Saxiibkaagu \`?password create <pw>\` ku sameeya\n` +
            `2. Adiga password-ka ku isticmaal\n` +
            `3. Bank, deposit, withdraw, company geli kartaa`
        )]});
    }

    if (target.id === caller.id) {
        return message.reply('⚠️ Nafsadaada ma galin kartid — \`?bank\` ama \`?company\` isticmaal.');
    }

    const pw = args[1] || '';

    checkUser(target.id);
    const targetData = userData[target.id];

    // Password check
    if (targetData.accountPassword && targetData.accountPassword !== pw) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(
            `🔐 **Password qalad!**\n${target.username} wuxuu leeyahay account password.\n` +
            `Isticmaal: \`?access @${target.username} <password>\``
        )]});
    }

    checkEconUser(target.id);
    const ec   = econData[target.id];
    const bank = ec.personalBank;

    // Store access session (5 minutes)
    if (!global.accessSessions) global.accessSessions = new Map();
    global.accessSessions.set(`${caller.id}_${target.id}`, {
        callerId: caller.id,
        targetId: target.id,
        expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const bankLine  = bank ? `\`${fmtBtc(bank.balance)}\` jeegga` : '_Bank ma laha_';
    const btcLine   = fmtBtc(ec.btc || 0);
    const compName  = ec.company?.name ? `**${ec.company.name}**` : '_Company ma laha_';

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setColor('#27ae60')
            .setTitle(`🔓 Access: ${target.username}`)
            .setDescription(
                `✅ **${target.username}** account-kiisa waad gashatay!\n\n` +
                `💳 **BTC Wallet:** ${btcLine}\n` +
                `🏦 **Personal Bank:** ${bankLine}\n` +
                `🏢 **Company:** ${compName}\n\n` +
                `⏳ Access-ku waxay dhammaan doontaa **5 daqiiqo** gudahood.\n` +
                `👇 Buttons-ka isticmaal.`
            )
    ], components: [accessRow(target.id, caller.id)] });
};

module.exports.checkPassword = checkPassword;
