const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { userData } = require('../../../src/store');
const { createPersonalBank, addTx, hashPass } = require('../../../src/economy/bankStore');
const { checkRequirements, reqFailMessage } = require('../../../src/utils/requirements');

const PROFIT_RATE     = 0.02;
const PROFIT_INTERVAL = 24 * 60 * 60 * 1000;

function fmtBtc(n)  { return `₿${Math.floor(n).toLocaleString()}`; }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }

function getTotalCustomerDeposits(bank) {
    return Object.values(bank.customers || {}).reduce((sum, c) => sum + (c.balance || 0), 0);
}

function applyBankProfit(bank) {
    const now = Date.now();
    bank.lastProfitAt ??= now;
    const days = Math.floor((now - bank.lastProfitAt) / PROFIT_INTERVAL);
    if (days <= 0) return 0;
    const customerTotal = getTotalCustomerDeposits(bank);
    if (customerTotal <= 0) { bank.lastProfitAt = now; return 0; }
    const profit = Math.floor(customerTotal * PROFIT_RATE * days);
    if (profit <= 0) { bank.lastProfitAt = now; return 0; }
    bank.balance      += profit;
    bank.profitEarned  = (bank.profitEarned || 0) + profit;
    bank.lastProfitAt  = now;
    addTx(bank, 'profit', profit, `Faa'iido macaamiisha (${days} maalin)`);
    return profit;
}

function bankViewRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pbank_own_dep_${userId}`)
            .setLabel('📥 Deposit')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`pbank_own_wd_${userId}`)
            .setLabel('📤 Withdraw')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_bv_${userId}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );
}

// ── ?bc / ?bank create ────────────────────────────────
async function bankCreateCmd(message) {
    checkEconUser(message.author.id);
    const ec = econData[message.author.id];
    if (ec.personalBank)
        return message.reply(`🏦 Bank account horay baad u lahayd! ID: \`${ec.personalBank.bankId}\` — \`?bv\` si aad u aragto.`);

    const { allMet, results } = checkRequirements(userData, econData, message.author.id, 'bank');
    if (!allMet) return message.reply(reqFailMessage(results, 'bank'));

    const bank = createPersonalBank(econData, message.author.id, message.author.username);
    saveEcon();
    return message.reply(
        `✅ **Bank account la abuuray!**\n\n` +
        `🏦 **Bank ID:** \`${bank.bankId}\`\n` +
        `👤 **Owner:** ${message.author.username}\n\n` +
        `📌 Password dhig: \`?bp <password>\`\n` +
        `📌 Bangigaaga arag: \`?bv\``
    );
}

// ── ?bp <password> ────────────────────────────────────
async function bankPasswordCmd(message, args) {
    checkEconUser(message.author.id);
    const ec = econData[message.author.id];
    const pw = args[0];
    if (!pw || pw.length < 6) return message.reply(
        '⚠️ Password-ka **ugu yaraan 6 xaraf** ah geli.\nTusaale: `?bp MyPass99`'
    );
    if (pw.length > 32) return message.reply('⚠️ Password-ka aad u dheer (max 32 xaraf).');
    ec.accountPassword = pw;
    if (ec.personalBank) ec.personalBank.passwordHash = hashPass(pw);
    saveEcon();
    try { await message.delete(); } catch {}
    return message.channel.send(`✅ <@${message.author.id}> **Password la dhigay.**`);
}

// ── ?bv — view your own bank ──────────────────────────
async function bankViewCmd(message) {
    checkEconUser(message.author.id);
    const ec   = econData[message.author.id];
    const bank = ec.personalBank;
    if (!bank) return message.reply('⚠️ Bank account ma lihid. `?bc` isticmaal.');

    const profit = applyBankProfit(bank);
    if (profit > 0) saveEcon();

    const custTotal = getTotalCustomerDeposits(bank);
    const custCount = Object.keys(bank.customers || {}).length;
    const typeIcon  = { deposit: '📥', withdraw: '📤', profit: '💰', customer_deposit: '👥📥', customer_withdraw: '👥📤', transfer: '↔️', received: '↔️' };
    const txLines   = (bank.transactions || []).slice(0, 5).map(t =>
        `${typeIcon[t.type] || '↔️'} **${t.type}** ${fmtBtc(t.amount)} — *${t.note || ''}* (${fmtDate(t.at)})`
    );

    const embed = new EmbedBuilder()
        .setTitle(`🏦 ${bank.owner}'s Bank`)
        .setColor('#2ecc71')
        .setDescription(
            `🆔 **Bank ID:** \`${bank.bankId}\`\n` +
            `👤 **Owner:** ${bank.owner}\n` +
            `📅 **La abuurtay:** ${fmtDate(bank.createdAt)}\n\n` +
            `💰 **Haraagga bangi:** ${fmtBtc(bank.balance)}\n` +
            `💳 **Jeebka:** ${fmtBtc(ec.btc || 0)}\n\n` +
            `👥 **Macaamiisha:** ${custCount} qof | 💼 **Lacagtooda:** ${fmtBtc(custTotal)}\n` +
            `📈 **Faa'iido la helay:** ${fmtBtc(bank.profitEarned || 0)}` +
            (profit > 0 ? ` _(+${fmtBtc(profit)} maanta!)_` : '') + '\n\n' +
            `📥 **Wadarta la geliyay:** ${fmtBtc(bank.deposits || 0)}\n` +
            `📤 **Wadarta la bixiyay:** ${fmtBtc(bank.withdrawals || 0)}\n\n` +
            (txLines.length ? `**📋 Khibrad dambe:**\n${txLines.join('\n')}` : '*Wali wax xaadirin ma jirto*')
        )
        .setFooter({ text: 'Garaad Bank • Deposit/Withdraw buttons isticmaal' });

    return message.reply({ embeds: [embed], components: [bankViewRow(message.author.id)] });
}

// ── ?bank — directory of all personal banks ───────────
async function bankDirectoryCmd(message) {
    const banks = Object.entries(econData)
        .filter(([uid, d]) => /^\d{17,19}$/.test(uid) && d?.personalBank)
        .map(([uid, d]) => ({
            uid,
            bank:      d.personalBank,
            custCount: Object.keys(d.personalBank.customers || {}).length,
            custTotal: getTotalCustomerDeposits(d.personalBank),
        }))
        .sort((a, b) => b.custTotal - a.custTotal);

    if (!banks.length)
        return message.reply('📭 Wali bangi la abuuri waayay. `?bc` isticmaal bangi abuuro!');

    const lines = banks.slice(0, 10).map((e, i) =>
        `**${i + 1}.** 🏦 **${e.bank.owner}** · \`${e.bank.bankId}\`\n` +
        `   💰 ${fmtBtc(e.bank.balance)} · 👥 ${e.custCount} macaamiil · 📈 **+2% /maalin**`
    );

    const userId = message.author.id;
    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🏦 Personal Banks — Directory')
            .setColor('#2471a3')
            .setDescription(lines.join('\n\n') + '\n\n📌 Lacag geliso — **Deposit** button taabo!')
            .setFooter({ text: '?bv — bangigaaga arag  •  ?bc — bank cusub abuur' })],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`pbank_dep_btn_${userId}`)
                .setLabel('📥 Lacag Geli (Deposit)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`close_bankdir_${userId}`)
                .setLabel('✖ Close')
                .setStyle(ButtonStyle.Danger),
        )],
    });
}

module.exports = {
    bankCreateCmd, bankPasswordCmd, bankViewCmd, bankDirectoryCmd,
    getTotalCustomerDeposits, applyBankProfit, bankViewRow,
};
