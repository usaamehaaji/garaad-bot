const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../src/economy/econStore');
const { userData, saveData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');
const {
    getAllCompanies, getUserOwnedCompany, createCompany,
    saveCompanies, hashPass, checkPass, getCompanyLevel,
} = require('../../src/economy/bankStore');
const { checkRequirements, reqFailMessage } = require('../../src/utils/requirements');

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

    const { allMet, results } = checkRequirements(userData, econData, message.author.id, 'company');
    if (!allMet) return message.reply(reqFailMessage(results, 'company'));

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
    if (!pw || pw.length < 6) return message.reply('⚠️ Password ugu yaraan 4 xaraf. `?company password <pw>`');

    company.passwordHash = hashPass(pw);
    saveCompanies();
    try { await message.delete(); } catch {}
    return message.channel.send(`✅ <@${message.author.id}> 🏢 **${company.name}** password waa la dhigay.`);
}

// ── ?company invest <xad> <nooc> ──────────────────────
const INVEST_TYPES = {
    ammaan:      { label: '🟢 Ammaan (Safe)',        win: 0.80, minWin: 0.05, maxWin: 0.15, minLoss: 0.01, maxLoss: 0.05 },
    safe:        { label: '🟢 Ammaan (Safe)',        win: 0.80, minWin: 0.05, maxWin: 0.15, minLoss: 0.01, maxLoss: 0.05 },
    dhexdhexaad: { label: '🟡 Dhexdhexaad (Medium)', win: 0.60, minWin: 0.15, maxWin: 0.30, minLoss: 0.10, maxLoss: 0.20 },
    medium:      { label: '🟡 Dhexdhexaad (Medium)', win: 0.60, minWin: 0.15, maxWin: 0.30, minLoss: 0.10, maxLoss: 0.20 },
    khatar:      { label: '🔴 Khatar (Risky)',       win: 0.40, minWin: 0.30, maxWin: 0.60, minLoss: 0.15, maxLoss: 0.40 },
    risky:       { label: '🔴 Khatar (Risky)',       win: 0.40, minWin: 0.30, maxWin: 0.60, minLoss: 0.15, maxLoss: 0.40 },
};

const INVEST_COOLDOWN = 8 * 60 * 60 * 1000; // 8 saacadood

async function companyInvestCmd(message, args) {
    checkEconUser(message.author.id);
    const company = getCompanyOf(message.author.id);
    // No company — redirect to personal invest
    if (!company) {
        const investCmd = require('../economy/invest');
        return investCmd(message, args);
    }

    // ?company invest (no args) — show options
    if (!args[0] || args[0] === 'info' || args[0] === 'status') {
        const last = company.lastInvest || 0;
        const wait = INVEST_COOLDOWN - (Date.now() - last);
        const coolLine = wait > 0
            ? `⏳ Invest cooldown: **${Math.ceil(wait / 3600000)}h ${Math.ceil((wait % 3600000) / 60000)}m**`
            : `✅ Invest geli kartaa`;

        return message.reply({ embeds: [new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('📈 Company Investment')
            .setDescription(
                `**Treasury:** ${fmtBtc(company.treasury || 0)}\n${coolLine}\n\n` +
                `**Invest noocyada:**\n` +
                `🟢 \`ammaan\` — 80% guul (+5–15%) | 20% qasaaro (-1–5%)\n` +
                `🟡 \`dhexdhexaad\` — 60% guul (+15–30%) | 40% qasaaro (-10–20%)\n` +
                `🔴 \`khatar\` — 40% guul (+30–60%) | 60% qasaaro (-15–40%)\n\n` +
                `**Isticmaal:** \`?company invest <xad> <nooc>\`\n` +
                `Tusaale: \`?company invest 10000 ammaan\``
            )
        ]});
    }

    const amount = Math.floor(Number(args[0]));
    const type   = INVEST_TYPES[(args[1] || '').toLowerCase()];

    if (!amount || amount <= 0)
        return message.reply('⚠️ Xaddad sax ah geli. Tusaale: `?company invest 10000 ammaan`');
    if (!type)
        return message.reply('⚠️ Nooca sax ah dooro: `ammaan` / `dhexdhexaad` / `khatar`');
    if (amount < 1000)
        return message.reply('⚠️ Ugu yaraan ₿1,000 ayaa loo baahan invest.');
    if (amount > (company.treasury || 0))
        return message.reply(`⚠️ Treasury ma filna. Haraagga: ${fmtBtc(company.treasury || 0)}`);

    // Cooldown check
    const now  = Date.now();
    const last = company.lastInvest || 0;
    const wait = INVEST_COOLDOWN - (now - last);
    if (wait > 0) {
        const h = Math.floor(wait / 3600000);
        const m = Math.ceil((wait % 3600000) / 60000);
        return message.reply(`⏳ **${h}h ${m}m** sug ka dibna invest galin kartaa.`);
    }

    // Calculate result
    const won = Math.random() < type.win;
    const pct  = won
        ? type.minWin  + Math.random() * (type.maxWin  - type.minWin)
        : type.minLoss + Math.random() * (type.maxLoss - type.minLoss);
    const change   = Math.floor(amount * pct);
    const profit   = won ? change : -change;
    const newTreas = (company.treasury || 0) + profit;

    company.treasury  = newTreas;
    company.lastInvest = now;
    if (!company.investHistory) company.investHistory = [];
    company.investHistory.unshift({ type: args[1], amount, profit, at: now });
    if (company.investHistory.length > 10) company.investHistory.length = 10;
    saveCompanies();

    const color = won ? '#27ae60' : '#e74c3c';
    const emoji = won ? '📈' : '📉';
    const sign  = won ? '+' : '-';

    return message.reply({ embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Company Investment — ${won ? 'GUUL' : 'QASAARO'}`)
        .setDescription(
            `**${company.name}** — ${type.label}\n\n` +
            `💵 **Invest-ka:** ${fmtBtc(amount)}\n` +
            `${emoji} **Natiiio:** **${sign}${fmtBtc(Math.abs(profit))}** (${sign}${(pct * 100).toFixed(1)}%)\n` +
            `💰 **Treasury hadda:** ${fmtBtc(newTreas)}\n\n` +
            `⏳ Invest-ka xiga: **8 saacadood** gudahood`
        )
        .setFooter({ text: 'Garaad Bot • Company Invest • ?company invest' })
    ]});
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
    companyTransferCmd, companyPasswordCmd, topCompaniesCmd, companyInvestCmd,
};
