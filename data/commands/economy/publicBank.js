const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../../src/economy/econStore');
const { userData } = require('../../../src/store');
const {
    getAllPublicBanks, getPublicBank, createPublicBank,
    saveBanks, hashPass, checkPass,
} = require('../../../src/economy/bankStore');
const { checkRequirements, reqFailMessage } = require('../../../src/utils/requirements');

const CREATE_FEE        = 200_000;
const EXPIRY_MS         = 14 * 24 * 60 * 60 * 1000;
const DEPOSIT_FEE_RATE  = 0.02;   // 2% → owner profit
const WITHDRAW_FEE_RATE = 0.02;   // 2% → owner profit

function fmtBtc(n)   { return `₿${Math.floor(n || 0).toLocaleString()}`; }
function fmtDate(ts)  { return new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }
function daysLeft(bank) { return Math.max(0, Math.floor((EXPIRY_MS - (Date.now() - (bank.lastActivity || bank.createdAt))) / 86400000)); }
function isExpired(bank) { return (Date.now() - (bank.lastActivity || bank.createdAt)) >= EXPIRY_MS; }

// Accumulate owner profit — owner must click Claim to receive
function creditOwnerProfit(bank, amount) {
    if (!amount || amount <= 0) return;
    bank.ownerProfit = (bank.ownerProfit || 0) + amount;
}

// ── Owner Panel embed + buttons ───────────────────────
function buildOwnerPanel(bank, userId) {
    const custCount = Object.keys(bank.customers || {}).length;
    const profit    = bank.ownerProfit || 0;
    const left      = daysLeft(bank);
    const totalDep  = Object.values(bank.customers || {}).reduce((s, c) => s + (c.balance || 0), 0);

    const embed = new EmbedBuilder()
        .setTitle(`👑 ${bank.name} — Owner Panel`)
        .setColor('#f39c12')
        .setDescription(
            profit > 0
                ? `💸 **${fmtBtc(profit)}** faa'iido la soo ururiyay!\n🔘 **Claim** riix si lacagtu jeebkaaga u gasho.`
                : `📊 Weli faa'iido la'aan. Dadka lacag ha ku dhigaan!`
        )
        .addFields(
            { name: '💰 Bangiga Haraagga',  value: fmtBtc(bank.balance || 0),     inline: true },
            { name: '👥 Macaamiil',          value: `**${custCount}**`,             inline: true },
            { name: '⏳ Muda Hadhay',        value: `**${left} maalin**`,           inline: true },
            { name: '💸 Faa\'iido Pending', value: `**${fmtBtc(profit)}**`,        inline: true },
            { name: '🏦 Capital ku Shubay', value: fmtBtc(bank.ownerFund || 0),    inline: true },
            { name: '📥 Wadarta Deposits',  value: fmtBtc(totalDep),               inline: true },
        )
        .setFooter({ text: `2% deposit fee + 2% withdraw fee → faa'iido • ID: ${bank.id}` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pubbank_claim_${bank.id}_${userId}`)
            .setLabel('💰 Claim Faa\'iido')
            .setStyle(ButtonStyle.Success)
            .setDisabled(profit <= 0),
        new ButtonBuilder()
            .setCustomId(`pubbank_fund_btn_${bank.id}_${userId}`)
            .setLabel('🏦 Fund Bank')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_ebank_${userId}`)
            .setLabel('✖ Xir')
            .setStyle(ButtonStyle.Danger),
    );

    return { embed, components: [row] };
}

// ── ?createbank ───────────────────────────────────────
async function createPublicBankCmd(message, args) {
    checkEconUser(message.author.id);
    const ec = econData[message.author.id];

    const existing = Object.values(getAllPublicBanks()).find(b => b.ownerId === message.author.id);
    if (existing) return message.reply(`⚠️ Horay ayaad bank u leedahay: **${existing.name}** (\`${existing.id}\`)`);

    const { allMet, results } = checkRequirements(userData, econData, message.author.id, 'bank');
    if (!allMet) return message.reply(reqFailMessage(results, 'bank'));

    if ((ec.btc || 0) < CREATE_FEE)
        return message.reply(`⚠️ **${fmtBtc(CREATE_FEE)} BTC** ayaa loo baahan yahay bangi u furin. Haysataa: ${fmtBtc(ec.btc || 0)}`);

    const name = args.join(' ').trim();
    if (!name || name.length < 3) return message.reply('⚠️ Isticmaal: `?createbank <Bank Name>`\nTusaale: `?createbank Hormuud Bank`');
    if (name.length > 30) return message.reply('⚠️ Magaca aad u dheer (max 30 xaraf).');

    ec.btc -= CREATE_FEE;
    const { addToTreasury } = require('../../../src/economy/econStore');
    addToTreasury(CREATE_FEE);
    const bank = createPublicBank(message.author.id, message.author.username, name);
    bank.lastActivity = Date.now();
    bank.ownerProfit  = 0;
    bank.ownerFund    = 0;
    saveBanks();
    saveEcon();

    return message.reply(
        `🏛️ **${bank.name}** la abuurtay!\n\n` +
        `🆔 **Bank ID:** \`${bank.id}\`\n` +
        `👤 **Owner:** ${message.author.username}\n` +
        `💸 **Kharash:** ${fmtBtc(CREATE_FEE)} (Treasury u tagay)\n` +
        `📈 **Faa'iidada:** 2% marka la deposit + 2% marka la withdraw\n` +
        `⏳ **Mudada:** 2 toddobaad — haddaan shaqo lahayn wuu xirmaa\n\n` +
        `💡 \`?bankfund ${bank.id} <xadad>\` — Lacagta bankiga ku shub\n` +
        `📌 Dadka lacag ku dhigi karaan: \`?bank\``
    );
}

// ── ?banks ────────────────────────────────────────────
async function listPublicBanksCmd(message) {
    const all = Object.values(getAllPublicBanks()).sort((a, b) => (b.balance || 0) - (a.balance || 0));
    if (!all.length) return message.reply('📭 Wali bank la abuuri waayay. `?createbank <name>` bilow.');

    const lines = all.slice(0, 10).map((b, i) =>
        `**${i + 1}.** 🏛️ **${b.name}** (\`${b.id}\`)\n` +
        `   👤 ${b.ownerUsername} · 💰 ${fmtBtc(b.balance)} · ⭐ ${b.reputation || 0} rep`
    );

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🏛️ Public Banks')
            .setColor('#3498db')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: '?bankinfo <ID> si aad faahfaahin u aragto' })],
    });
}

// ── ?bankinfo <id> ────────────────────────────────────
async function bankInfoCmd(message, args) {
    const id   = (args[0] || '').toUpperCase();
    const bank = getPublicBank(id);
    if (!bank) return message.reply(`⚠️ Bank \`${id}\` lama helin. \`?banks\` ka eeg.`);

    const custCount = Object.keys(bank.customers || {}).length;
    const isOwner   = bank.ownerId === message.author.id;
    const myRec     = bank.customers?.[message.author.id];
    const myBal     = myRec ? myRec.balance || 0 : 0;

    const baseDesc =
        `🆔 **ID:** \`${bank.id}\`\n` +
        `👤 **Owner:** ${bank.ownerUsername}\n` +
        `📅 **La abuurtay:** ${fmtDate(bank.createdAt)}\n\n` +
        `💰 **Haraagga bangi:** ${fmtBtc(bank.balance)}\n` +
        `👥 **Macaamiisha:** ${custCount}\n` +
        `⭐ **Reputation:** ${bank.reputation || 0}\n` +
        `📥 **Wadarta deposits:** ${fmtBtc(bank.totalDeposits || 0)}\n` +
        (myBal > 0 ? `💼 **Adigu haysataa:** ${fmtBtc(myBal)}\n` : '');

    const ownerPanel = isOwner
        ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👑 **OWNER PANEL**\n\n` +
          `💸 **Faa'iido la Helay:** ${fmtBtc(bank.ownerProfit || 0)}\n` +
          `  └ 2% deposit + 2% withdraw\n` +
          `🏦 **Lacag Aad Ku Shubday:** ${fmtBtc(bank.ownerFund || 0)}\n` +
          `📤 **Si Lacag Ku Shubi:** \`?bankfund ${bank.id} <xadad>\`\n`
        : '';

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`🏛️ ${bank.name}`)
            .setColor(isOwner ? '#f39c12' : '#3498db')
            .setDescription(baseDesc + ownerPanel)
            .setFooter({ text: `?bankdeposit ${bank.id} <amount>  |  ?bankwithdraw ${bank.id} <amount>` })],
    });
}

// ── ?bankdeposit <id> <amount> ────────────────────────
async function bankDepositCmd(message, args) {
    const id     = (args[0] || '').toUpperCase();
    const amount = Math.floor(Number(args[1]));
    const bank   = getPublicBank(id);
    if (!bank)   return message.reply(`⚠️ Bank \`${id}\` lama helin.`);
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?bankdeposit <ID> <amount>`');

    checkEconUser(message.author.id);
    const ec = econData[message.author.id];
    if ((ec.btc || 0) < amount) return message.reply(`⚠️ Jeebkaagu ma filna. Haysataa: ${fmtBtc(ec.btc || 0)}`);

    if (isExpired(bank)) return message.reply(`⚠️ **${bank.name}** waa la xiray (2 toddobaad shaqo la'aan).`);

    const isOwner = bank.ownerId === message.author.id;

    ec.btc             -= amount;
    bank.balance       += amount;
    bank.totalDeposits  = (bank.totalDeposits || 0) + amount;
    bank.reputation     = Math.floor((bank.reputation || 0) + amount / 10000);
    bank.lastActivity   = Date.now();

    if (isOwner) {
        // Owner funding — tracked separately, no fee
        bank.ownerFund = (bank.ownerFund || 0) + amount;
    } else {
        // Customer deposit — 2% fee to owner, credited instantly
        const fee = Math.floor(amount * DEPOSIT_FEE_RATE);
        if (fee > 0) {
            creditOwnerProfit(bank, fee);
        }

        bank.customers      = bank.customers || {};
        bank.customers[message.author.id] = bank.customers[message.author.id] || {
            balance: 0, username: message.author.username, joinedAt: Date.now()
        };
        bank.customers[message.author.id].balance += amount;
    }

    saveBanks();
    saveEcon();

    const left        = daysLeft(bank);
    const warningLine = left <= 3 ? `\n⚠️ Bank wuxuu xirmaa **${left} maalin** gudahood!` : '';
    const feeNote     = isOwner ? `\n🏦 Capital ku daray.` : `\n💸 Faa'iido owner-ka: ${fmtBtc(Math.floor(amount * DEPOSIT_FEE_RATE))}`;

    return message.reply(
        `📥 **${fmtBtc(amount)}** → 🏛️ **${bank.name}**\n` +
        `💰 Bangiga haraagga: ${fmtBtc(bank.balance)}${feeNote}${warningLine}`
    );
}

// ── ?bankwithdraw <id> <amount> ───────────────────────
async function bankWithdrawCmd(message, args) {
    const id     = (args[0] || '').toUpperCase();
    const amount = Math.floor(Number(args[1]));
    const pw     = args[2];
    const bank   = getPublicBank(id);

    if (!bank)   return message.reply(`⚠️ Bank \`${id}\` lama helin.`);
    if (!amount || amount <= 0) return message.reply('⚠️ Isticmaal: `?bankwithdraw <ID> <amount>`');

    const isOwner = bank.ownerId === message.author.id;

    if (!isOwner) return message.reply('⚠️ Bangiga owner-kiisa oo keliya ayaa ka bixin kara.');

    if (bank.passwordHash) {
        if (!pw) return message.reply('🔐 Password-ka geli.');
        if (!checkPass(pw, bank.passwordHash)) return message.reply('❌ Password-ka waa khalad.');
        try { await message.delete(); } catch {}
    }

    if (amount > bank.balance) return message.reply(`⚠️ Bangiga lacag ku filan kuma jirto. Haraagga: ${fmtBtc(bank.balance)}`);

    bank.balance -= amount;
    checkEconUser(message.author.id);
    econData[message.author.id].btc = (econData[message.author.id].btc || 0) + amount;

    saveBanks();
    saveEcon();
    return message.reply(
        `📤 **${fmtBtc(amount)}** 🏛️ **${bank.name}** → jeebkaaga\n` +
        `💰 Bangiga haraagga: ${fmtBtc(bank.balance)}`
    );
}

// ── ?bankfund [id] [amount] — Owner panel / add capital ──
async function bankFundCmd(message, args) {
    checkEconUser(message.author.id);

    // No args: auto-find owner's bank and show panel
    if (!args[0]) {
        const ownBank = Object.values(getAllPublicBanks()).find(b => b.ownerId === message.author.id);
        if (!ownBank) return message.reply('⚠️ Public bank ma lihid. `?createbank <magac>` bilow.');
        const { embed, components } = buildOwnerPanel(ownBank, message.author.id);
        return message.reply({ embeds: [embed], components });
    }

    const id   = args[0].toUpperCase();
    const bank = getPublicBank(id);

    if (!bank) return message.reply(`⚠️ Bank \`${id}\` lama helin. \`?bankfund\` (args la'aan) si aad bangigaaga u aragto.`);
    if (bank.ownerId !== message.author.id) return message.reply('⚠️ Bangigan owner-kiisa oo keliya ayaa capital ku dari kara.');

    // ID only, no amount: show panel
    const amount = Math.floor(Number(args[1]));
    if (!amount || amount <= 0) {
        const { embed, components } = buildOwnerPanel(bank, message.author.id);
        return message.reply({ embeds: [embed], components });
    }

    const ec = econData[message.author.id];
    if ((ec.btc || 0) < amount) return message.reply(`⚠️ Jeebkaagu ma filna. Haysataa: ${fmtBtc(ec.btc || 0)}`);
    if (isExpired(bank)) return message.reply(`⚠️ **${bank.name}** waa la xiray.`);

    ec.btc            -= amount;
    bank.balance      += amount;
    bank.ownerFund     = (bank.ownerFund || 0) + amount;
    bank.lastActivity  = Date.now();
    saveBanks();
    saveEcon();

    const { embed, components } = buildOwnerPanel(bank, message.author.id);
    return message.reply({
        content: `✅ **${fmtBtc(amount)}** bangiga capital u daray!`,
        embeds: [embed],
        components,
    });
}

// ── ?bankpassword <id> <password> ─────────────────────
async function bankPasswordCmd(message, args) {
    const id   = (args[0] || '').toUpperCase();
    const pw   = args[1];
    const bank = getPublicBank(id);
    if (!bank) return message.reply(`⚠️ Bank \`${id}\` lama helin.`);
    if (bank.ownerId !== message.author.id) return message.reply('⚠️ Bangiga owner-kiisa oo keliya ayaa password dhigi kara.');
    if (!pw || pw.length < 4) return message.reply('⚠️ Password ugu yaraan 4 xaraf. `?bankpassword <ID> <password>`');

    bank.passwordHash = hashPass(pw);
    saveBanks();
    try { await message.delete(); } catch {}
    return message.channel.send(`✅ <@${message.author.id}> 🏛️ **${bank.name}** password waa la dhigay.`);
}

// ── ?topbanks ─────────────────────────────────────────
async function topBanksCmd(message) {
    const all = Object.values(getAllPublicBanks())
        .filter(b => !isExpired(b))
        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
        .slice(0, 10);
    if (!all.length) return message.reply('📭 Wali bank firfircoon ma jiro.');
    const MEDALS = ['🥇','🥈','🥉'];
    const lines = all.map((b, i) => {
        const left      = daysLeft(b);
        const warning   = left <= 3 ? ` ⚠️ ${left}d` : '';
        const custCount = Object.keys(b.customers || {}).length;
        const medal     = MEDALS[i] || `**${i + 1}.**`;
        return `${medal} 🏛️ **${b.name}**${warning}\n` +
               `   👤 ${b.ownerUsername} · 💰 ${fmtBtc(b.balance)} · 👥 ${custCount} macaamiil · ⭐ ${b.reputation || 0}`;
    });
    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🏆 Top Public Banks')
            .setColor('#f39c12')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: '⚠️ = bank wuu xirmayaa dhowaan • 2 toddobaad shaqo la\'aan = xirnaansho' })],
    });
}

// ── Bank expiry check + refund ────────────────────────
async function checkAndCloseExpiredBanks(client) {
    const { addToTreasury } = require('../../../src/economy/econStore');
    const allBanks = getAllPublicBanks();
    let closed = 0;

    for (const [bankId, bank] of Object.entries(allBanks)) {
        if (!isExpired(bank)) continue;

        for (const [custId, cust] of Object.entries(bank.customers || {})) {
            if (!cust.balance || cust.balance <= 0) continue;
            checkEconUser(custId);
            econData[custId].btc = (econData[custId].btc || 0) + cust.balance;
            try {
                const u = await client.users.fetch(custId);
                await u.send({ embeds: [new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setDescription(
                        `🏛️ **${bank.name}** waa la xiray (2 toddobaad shaqo la'aan).\n` +
                        `✅ **${fmtBtc(cust.balance)}** jeebkaaga ayaa loo celiyay.`
                    )
                ]}).catch(() => {});
            } catch {}
        }

        delete allBanks[bankId];
        closed++;
    }

    if (closed > 0) { saveBanks(); saveEcon(); }
    return closed;
}

module.exports = {
    createPublicBankCmd, listPublicBanksCmd, bankInfoCmd,
    bankDepositCmd, bankWithdrawCmd, bankPasswordCmd, topBanksCmd,
    bankFundCmd, checkAndCloseExpiredBanks,
    buildOwnerPanel,
    DEPOSIT_FEE_RATE, WITHDRAW_FEE_RATE, creditOwnerProfit,
};
