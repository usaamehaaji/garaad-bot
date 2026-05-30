const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { userData, saveData } = require('../../../src/store');
const {
    getPersonalBank, createPersonalBank, addTx, saveBanks,
    hashPass, checkPass,
    getPublicBank, getAllPublicBanks, createPublicBank,
} = require('../../../src/economy/bankStore');

const PERSONAL_BANK_FEE  = 0;        // free to create
const TRANSFER_COOLDOWN  = 60_000;   // 1 min between transfers
const _transferCooldowns = new Map();

function fmtBtc(n) { return `₿${Math.floor(n).toLocaleString()}`; }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }

// ── ?bank create ──────────────────────────────────────
async function bankCreateCmd(message) {
    checkEconUser(message.author.id);
    const ec = econData[message.author.id];
    if (ec.personalBank)
        return message.reply(`🏦 Bank account horay baad u lahayd! ID: \`${ec.personalBank.bankId}\` — \`?bank\` si aad u aragto.`);

    const bank = createPersonalBank(econData, message.author.id, message.author.username);
    saveEcon();
    return message.reply(
        `✅ **Bank account la abuuray!**\n\n` +
        `🏦 **Bank ID:** \`${bank.bankId}\`\n` +
        `👤 **Owner:** ${message.author.username}\n\n` +
        `📌 Kadib: \`?bp <password>\` si aad password u dhigto\n` +
        `📌 Lacag geli: \`?deposit <amount>\``
    );
}

// ── ?bp <password> ────────────────────────────────────
async function bankPasswordCmd(message, args) {
    checkEconUser(message.author.id);
    const ec = econData[message.author.id];
    if (!ec.personalBank) return message.reply('⚠️ Bank account ma lihid. `?bank create` bilow.');

    const pw = args[0];
    if (!pw || pw.length < 4) return message.reply('⚠️ Password-ka ugu yaraan 4 xaraf. Tusaale: `?bp MyPass123`');
    if (pw.length > 32) return message.reply('⚠️ Password-ka aad u dheer (max 32 xaraf).');

    ec.personalBank.passwordHash = hashPass(pw);
    saveEcon();

    try { await message.delete(); } catch {}
    return message.channel.send(`✅ <@${message.author.id}> Bank password-kaaga waa la dhigay.`);
}

// ── ?bank ─────────────────────────────────────────────
async function bankViewCmd(message) {
    checkEconUser(message.author.id);
    const ec   = econData[message.author.id];
    const bank = ec.personalBank;
    if (!bank) return message.reply('⚠️ Bank account ma lihid. `?bank create` bilow.');

    const txLines = (bank.transactions || []).slice(0, 5).map(t =>
        `${t.type === 'deposit' ? '📥' : t.type === 'withdraw' ? '📤' : '↔️'} **${t.type}** ${fmtBtc(t.amount)} — *${t.note || ''}* (${fmtDate(t.at)})`
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
            `📥 **Wadarta la geliyay:** ${fmtBtc(bank.deposits)}\n` +
            `📤 **Wadarta la bixiyay:** ${fmtBtc(bank.withdrawals)}\n\n` +
            (txLines.length ? `**📋 Khibrad dambe:**\n${txLines.join('\n')}` : '*Wali wax xaadirin ma jirto*')
        )
        .setFooter({ text: 'Garaad Bank • ?deposit • ?withdraw • ?banksend' });

    return message.reply({ embeds: [embed] });
}

// ── ?deposit <amount> ─────────────────────────────────
async function depositCmd(message, args) {
    checkEconUser(message.author.id);
    const ec   = econData[message.author.id];
    const bank = ec.personalBank;
    if (!bank) return message.reply('⚠️ Bank account ma lihid. `?bank create` bilow.');

    const amount = Math.floor(Number(args[0]));
    if (!amount || amount <= 0) return message.reply('⚠️ Lacag saxan geli. Tusaale: `?deposit 1000`');
    if (amount > (ec.btc || 0)) return message.reply(`⚠️ Jeebkaagu ma filna. Haysataa: ${fmtBtc(ec.btc || 0)}`);

    ec.btc = (ec.btc || 0) - amount;
    bank.balance   += amount;
    bank.deposits  += amount;
    addTx(bank, 'deposit', amount, 'jeeb → bangi');
    saveEcon();

    return message.reply(`📥 **Deposit guul!**\n${fmtBtc(amount)} jeebka ↔ bangi\n💰 **Bangi hadda:** ${fmtBtc(bank.balance)}`);
}

// ── ?withdraw <amount> <password> ────────────────────
async function withdrawCmd(message, args) {
    checkEconUser(message.author.id);
    const ec   = econData[message.author.id];
    const bank = ec.personalBank;
    if (!bank) return message.reply('⚠️ Bank account ma lihid.');

    const amount = Math.floor(Number(args[0]));
    const pw     = args[1];
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?withdraw <amount> <password>`');

    if (bank.passwordHash) {
        if (!pw) return message.reply('🔐 Password-ka geli. Isticmaal: `?withdraw <amount> <password>`');
        if (!checkPass(pw, bank.passwordHash)) return message.reply('❌ Password-ka waa khalad.');
        try { await message.delete(); } catch {}
    }

    if (amount > bank.balance) return message.reply(`⚠️ Bangiga lacag ku filan kuma jirto. Haraagga: ${fmtBtc(bank.balance)}`);

    bank.balance    -= amount;
    bank.withdrawals += amount;
    ec.btc = (ec.btc || 0) + amount;
    addTx(bank, 'withdraw', amount, 'bangi → jeeb');
    saveEcon();

    return message.reply(`📤 **Withdraw guul!**\n${fmtBtc(amount)} bangi ↔ jeeb\n💳 **Jeebka hadda:** ${fmtBtc(ec.btc)}`);
}

// ── ?banksend @user <amount> <password> ──────────────
async function bankSendCmd(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?banksend @user <amount> <password>`');
    if (target.id === message.author.id) return message.reply('⚠️ Adiga laftiisa u diri kartid.');

    checkEconUser(message.author.id);
    checkEconUser(target.id);
    const ec       = econData[message.author.id];
    const ecTarget = econData[target.id];
    const myBank   = ec.personalBank;
    const theirBank = ecTarget.personalBank;

    if (!myBank)    return message.reply('⚠️ Bank account ma lihid. `?bank create` bilow.');
    if (!theirBank) return message.reply(`⚠️ **${target.username}** bank account ma laha.`);

    const amount = Math.floor(Number(args[1]));
    const pw     = args[2];
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?banksend @user <amount> <password>`');

    if (myBank.passwordHash) {
        if (!pw) return message.reply('🔐 Password-kaaga geli. `?banksend @user <amount> <password>`');
        if (!checkPass(pw, myBank.passwordHash)) return message.reply('❌ Password-kaaga waa khalad.');
        try { await message.delete(); } catch {}
    }

    // Cooldown
    const now  = Date.now();
    const last = _transferCooldowns.get(message.author.id) || 0;
    if (now - last < TRANSFER_COOLDOWN)
        return message.reply(`⏳ **${Math.ceil((TRANSFER_COOLDOWN - (now - last)) / 1000)} ilbiriqsi** sug ka dib isku day.`);

    if (amount > myBank.balance) return message.reply(`⚠️ Bangiga lacag ku filan kuma jirto. Haraagga: ${fmtBtc(myBank.balance)}`);

    myBank.balance    -= amount;
    myBank.withdrawals += amount;
    theirBank.balance  += amount;
    theirBank.deposits += amount;
    addTx(myBank,    'transfer', amount, `→ ${target.username}`);
    addTx(theirBank, 'received', amount, `← ${message.author.username}`);
    _transferCooldowns.set(message.author.id, now);
    saveEcon();

    return message.reply(
        `↔️ **Bank Transfer guul!**\n` +
        `${fmtBtc(amount)} → **${target.username}**\n` +
        `💰 **Bangigaaga hadda:** ${fmtBtc(myBank.balance)}`
    );
}

module.exports = { bankCreateCmd, bankPasswordCmd, bankViewCmd, depositCmd, withdrawCmd, bankSendCmd };
