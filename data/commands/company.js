const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../src/economy/econStore');
const { userData, saveData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');
const {
    getAllCompanies, getUserOwnedCompany, createCompany,
    saveCompanies, hashPass, checkPass, getCompanyLevel,
} = require('../../src/economy/bankStore');

const CREATE_FEE = 250_000;
const INDUSTRIES  = ['Tech', 'Media', 'Trading', 'Gaming', 'Education', 'Finance', 'Transport'];

function fmtBtc(n) { return `₿${Math.floor(n).toLocaleString()}`; }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }

function getCompanyOf(userId) {
    return Object.values(getAllCompanies()).find(c => c.ownerId === userId || c.employees?.[userId]) || null;
}

// ── ?company create <name> | <industry> ──────────────
async function companyCreateCmd(message, args) {
    checkEconUser(message.author.id);
    const ec = econData[message.author.id];

    if (getCompanyOf(message.author.id))
        return message.reply('⚠️ Horay shirkad ayaad u leedahay ama ku jirtaa. `?company` si aad u aragto.');

    if ((ec.btc || 0) < CREATE_FEE)
        return message.reply(`⚠️ **${fmtBtc(CREATE_FEE)}** ayaa loo baahan yahay. Haysataa: ${fmtBtc(ec.btc || 0)}`);

    // Parse: ?company create Name | Industry
    const full = args.join(' ');
    const [namePart, industryPart] = full.split('|').map(s => s.trim());
    const name     = namePart || '';
    const industry = INDUSTRIES.find(i => i.toLowerCase() === (industryPart || '').toLowerCase()) || 'Tech';

    if (!name || name.length < 2) return message.reply(
        `⚠️ Isticmaal: \`?company create <Name> | <Industry>\`\n` +
        `Warshadooyinka: ${INDUSTRIES.join(', ')}\n` +
        `Tusaale: \`?company create Garaad Tech | Tech\``
    );
    if (name.length > 32) return message.reply('⚠️ Magaca aad u dheer (max 32 xaraf).');

    ec.btc -= CREATE_FEE;
    const company = createCompany(message.author.id, message.author.username, name, industry);
    saveCompanies(); saveEcon();

    return message.reply(
        `🏢 **${company.name}** la abuurtay!\n\n` +
        `🆔 **ID:** \`${company.id}\`\n` +
        `🏭 **Warshadda:** ${company.industry}\n` +
        `👤 **Founder:** ${message.author.username}\n` +
        `💸 **Kharash:** ${fmtBtc(CREATE_FEE)}\n\n` +
        `📌 \`?company\` faahfaahinta u eeg\n` +
        `📌 \`?company hire @user\` shaqaale ku dar`
    );
}

// ── ?company ──────────────────────────────────────────
async function companyViewCmd(message) {
    checkUser(message.author.id);
    const company = getCompanyOf(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid. `?company create <name>` bilow.');

    const level   = getCompanyLevel(company.treasury);
    const empList = Object.entries(company.employees || {}).slice(0, 5)
        .map(([, e]) => `👤 **${e.username}** — ${e.role}`).join('\n');
    const empCount = Object.keys(company.employees || {}).length;

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`🏢 ${company.name}`)
            .setColor('#9b59b6')
            .setDescription(
                `🆔 **ID:** \`${company.id}\`\n` +
                `🏭 **Warshadda:** ${company.industry}\n` +
                `👤 **Founder:** ${company.ownerUsername}\n` +
                `📅 **La abuurtay:** ${fmtDate(company.createdAt)}\n\n` +
                `📈 **Heer:** ${level}\n` +
                `💰 **Treasury:** ${fmtBtc(company.treasury)}\n` +
                `👥 **Shaqaalaha:** ${empCount}\n\n` +
                (empList || '*Shaqaale ma jiro*')
            )
            .setFooter({ text: '?company hire @user  |  ?company deposit  |  ?company withdraw' })],
    });
}

// ── ?company hire @user ───────────────────────────────
async function companyHireCmd(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?company hire @user`');
    if (target.bot) return message.reply('⚠️ Bot shaqaale kama noqon karo.');

    const company = getUserOwnedCompany(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid ama adiga owner ma aha.');
    if (company.employees?.[target.id]) return message.reply(`⚠️ **${target.username}** horay ayuu shaqaale ku ahaa.`);
    if (getCompanyOf(target.id)) return message.reply(`⚠️ **${target.username}** shirkad kale ayuu ku jiraa.`);

    company.employees[target.id] = { role: 'Employee', username: target.username, joinedAt: Date.now() };
    saveCompanies();
    return message.reply(`✅ **${target.username}** 🏢 **${company.name}** shaqaale ayuu noqday!`);
}

// ── ?company fire @user ───────────────────────────────
async function companyFireCmd(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?company fire @user`');
    if (target.id === message.author.id) return message.reply('⚠️ Adiga laftiisa ma ereysan kartid.');

    const company = getUserOwnedCompany(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid ama adiga owner ma aha.');
    if (!company.employees?.[target.id]) return message.reply(`⚠️ **${target.username}** shirkadaada kuma jiro.`);

    delete company.employees[target.id];
    saveCompanies();
    return message.reply(`❌ **${target.username}** shirkadda ayaa laga eryay.`);
}

// ── ?company employees ────────────────────────────────
async function companyEmployeesCmd(message) {
    const company = getCompanyOf(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid.');

    const emps = Object.entries(company.employees || {});
    if (!emps.length) return message.reply('📭 Shaqaale ma jiro.');

    const lines = emps.map(([, e], i) => `**${i + 1}.** 👤 **${e.username}** — ${e.role} (${fmtDate(e.joinedAt)})`);
    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`👥 ${company.name} — Shaqaalaha`)
            .setColor('#9b59b6')
            .setDescription(lines.join('\n'))
            .setFooter({ text: `${emps.length} shaqaale` })],
    });
}

// ── ?company deposit <amount> ─────────────────────────
async function companyDepositCmd(message, args) {
    checkEconUser(message.author.id);
    const company = getCompanyOf(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid.');

    const amount = Math.floor(Number(args[0]));
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?company deposit <amount>`');
    const ec = econData[message.author.id];
    if ((ec.btc || 0) < amount) return message.reply(`⚠️ Jeebkaagu ma filna. Haysataa: ${fmtBtc(ec.btc || 0)}`);

    ec.btc -= amount;
    company.treasury = (company.treasury || 0) + amount;
    saveCompanies(); saveEcon();

    return message.reply(`📥 **${fmtBtc(amount)}** → 🏢 **${company.name}** treasury\n💰 Treasury hadda: ${fmtBtc(company.treasury)}`);
}

// ── ?company withdraw <amount> <password> ────────────
async function companyWithdrawCmd(message, args) {
    checkEconUser(message.author.id);
    const company = getUserOwnedCompany(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid ama adiga owner ma aha.');

    const amount = Math.floor(Number(args[0]));
    const pw     = args[1];
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?company withdraw <amount> <password>`');

    if (company.passwordHash) {
        if (!pw) return message.reply('🔐 Password-ka geli.');
        if (!checkPass(pw, company.passwordHash)) return message.reply('❌ Password-ka waa khalad.');
        try { await message.delete(); } catch {}
    }

    if (amount > (company.treasury || 0)) return message.reply(`⚠️ Treasury lacag ku filan kuma jirto. Haraagga: ${fmtBtc(company.treasury || 0)}`);

    company.treasury -= amount;
    econData[message.author.id].btc = (econData[message.author.id].btc || 0) + amount;
    saveCompanies(); saveEcon();

    return message.reply(`📤 **${fmtBtc(amount)}** 🏢 treasury → jeebkaaga\n💰 Treasury hadda: ${fmtBtc(company.treasury)}`);
}

// ── ?company transfer @user <amount> ──────────────────
async function companyTransferCmd(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?company transfer @user <amount>`');

    checkEconUser(target.id);
    const company = getUserOwnedCompany(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid ama adiga owner ma aha.');
    if (!company.employees?.[target.id] && target.id !== message.author.id)
        return message.reply(`⚠️ **${target.username}** shirkadaada kuma jiro.`);

    const amount = Math.floor(Number(args[1]));
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?company transfer @user <amount>`');
    if (amount > (company.treasury || 0)) return message.reply(`⚠️ Treasury: ${fmtBtc(company.treasury || 0)}`);

    company.treasury -= amount;
    econData[target.id].btc = (econData[target.id].btc || 0) + amount;
    saveCompanies(); saveEcon();

    return message.reply(`💸 **${fmtBtc(amount)}** → **${target.username}** (shaqaalaha mushahaar)\n💰 Treasury hadda: ${fmtBtc(company.treasury)}`);
}

// ── ?company password <password> ──────────────────────
async function companyPasswordCmd(message, args) {
    const pw      = args[0];
    const company = getUserOwnedCompany(message.author.id);
    if (!company) return message.reply('⚠️ Shirkad ma lihid ama adiga owner ma aha.');
    if (!pw || pw.length < 4) return message.reply('⚠️ Password ugu yaraan 4 xaraf. `?company password <pw>`');

    company.passwordHash = hashPass(pw);
    saveCompanies();
    try { await message.delete(); } catch {}
    return message.channel.send(`✅ <@${message.author.id}> 🏢 **${company.name}** password waa la dhigay.`);
}

// ── ?topcompanies ─────────────────────────────────────
async function topCompaniesCmd(message) {
    const all = Object.values(getAllCompanies()).sort((a, b) => (b.treasury || 0) - (a.treasury || 0)).slice(0, 10);
    if (!all.length) return message.reply('📭 Wali shirkad la abuuri waayay.');
    const lines = all.map((c, i) =>
        `**${i + 1}.** 🏢 **${c.name}** (${c.industry})\n` +
        `   👤 ${c.ownerUsername} · 💰 ${fmtBtc(c.treasury)} · 📈 ${getCompanyLevel(c.treasury)}`
    );
    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🏆 Top Companies')
            .setColor('#9b59b6')
            .setDescription(lines.join('\n\n'))],
    });
}

module.exports = {
    companyCreateCmd, companyViewCmd, companyHireCmd, companyFireCmd,
    companyEmployeesCmd, companyDepositCmd, companyWithdrawCmd,
    companyTransferCmd, companyPasswordCmd, topCompaniesCmd,
};
