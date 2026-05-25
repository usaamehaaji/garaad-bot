// =====================================================================
// GARAAD BOT - Maareynta Isdhexgalka (Interaction Handler)
// =====================================================================

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { handleSoloAnswer, handleSoloLeaderboard } = require('../games/solo');
const { startDuelGame }     = require('../games/duel');
const { beginQuizGame, refreshLobby: refreshQuizLobby } = require('../games/quiz');
const { beginRound, openGamePhase, sendRegistrationCode, handlePanelButton, GAME_CHANNEL_ID, ANNOUNCE_CHANNEL_ID } = require('../games/tournament');
const { userData, activeQuiz, activeTournament, isUserBusy, tournamentRegistry } = require('../store');
const { checkUser }         = require('../utils/helpers');
const { isAdmin }           = require('../utils/admin');
const { QUIZ_MIN_PLAYERS, QUIZ_MAX_PLAYERS, DUEL_STAKE_IQ, TOURNAMENT_MIN_PLAYERS, TOURNAMENT_R1_QUESTIONS, TOURNAMENT_R2_QUESTIONS, TOURNAMENT_FINAL_QUESTIONS } = require('../config');
const { exchangeQuizPoints } = require('../utils/quizPoints');
const { buildEduEmbed, buildEcoEmbed, helpRow } = require('../../data/commands/help');

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

const OWNER_ID   = '1191096205955055690';
const OWNER_PASS = '2001';

async function notifyAdmins(client, adminUser, action) {
    try {
        const { listAdmins } = require('../utils/admin');
        const recipients = new Set([OWNER_ID, ...listAdmins()]);
        recipients.delete(adminUser.id);
        const msg =
            `🔐 **Admin Action Log**\n` +
            `👤 Admin: **${adminUser.username}** (\`${adminUser.id}\`)\n` +
            `⚙️ Action: ${action}\n` +
            `🕐 ${new Date().toUTCString()}`;
        for (const uid of recipients) {
            const u = await client.users.fetch(uid).catch(() => null);
            if (u) await u.send(msg).catch(() => {});
        }
    } catch {}
}

module.exports = function setupInteractionHandler(client) {
    client.on('interactionCreate', async (interaction) => {

        // ── Modal Submit: IQ dhigo / IQ la bax ──
        if (interaction.isModalSubmit()) {
            const { iqRow, balanceEmbed } = require('../../data/commands/bank');
            const { saveData } = require('../utils/helpers');

            if (interaction.customId.startsWith('iq_dhigo_modal_')) {
                const ownerId = interaction.customId.replace('iq_dhigo_modal_', '');
                checkUser(ownerId);
                const d      = userData[ownerId];
                const amount = parseInt(interaction.fields.getTextInputValue('iq_amount'), 10);
                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                }
                if (d.iq < amount) {
                    return interaction.reply({ content: `⚠️ IQ kugu filna ma lihid. IQ-daadu waa **${d.iq}**.`, flags: MessageFlags.Ephemeral });
                }
                d.iq           -= amount;
                d.bank.balance += amount;
                d.bank.transactions.unshift({ type: 'deposit', amount, at: Date.now() });
                if (d.bank.transactions.length > 20) d.bank.transactions.length = 20;
                saveData();
                return interaction.reply({
                    embeds: [balanceEmbed(d, `✅ **${amount} IQ** bank dhigatay`)],
                    components: [iqRow(ownerId)],
                });
            }

            if (interaction.customId.startsWith('iq_labax_modal_')) {
                const ownerId = interaction.customId.replace('iq_labax_modal_', '');
                checkUser(ownerId);
                const d      = userData[ownerId];
                const input  = interaction.fields.getTextInputValue('iq_amount').trim();
                const amount = input === '0' || input === '' ? d.bank.balance : parseInt(input, 10);
                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                }
                if (d.bank.balance < amount) {
                    return interaction.reply({ content: `⚠️ Bank kaaga IQ kugu filna ma lihid. Kaydku waa **${d.bank.balance} IQ**.`, flags: MessageFlags.Ephemeral });
                }
                d.bank.balance -= amount;
                d.iq           += amount;
                d.bank.transactions.unshift({ type: 'withdraw', amount, at: Date.now() });
                if (d.bank.transactions.length > 20) d.bank.transactions.length = 20;
                saveData();
                return interaction.reply({
                    embeds: [balanceEmbed(d, `✅ **${amount} IQ** bank laga baxay`)],
                    components: [iqRow(ownerId)],
                });
            }

            // ── Give: amount modal submit ──
            if (interaction.customId.startsWith('eco_gvmod_')) {
                const rest     = interaction.customId.replace('eco_gvmod_', '');
                const parts    = rest.split('_');
                const ownerId  = parts[parts.length - 1];
                const targetId = parts[parts.length - 2];
                const asset    = parts[0];

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
                }

                const amount = parseFloat(interaction.fields.getTextInputValue('eco_gv_amount'));
                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 200).', flags: MessageFlags.Ephemeral });
                }

                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { ASSET_LABELS, closeRow } = require('../../data/commands/economy/give');
                const { getPrice: gpGive } = require('../economy/market');
                checkEconUser(ownerId);
                checkEconUser(targetId);
                const sender = eData[ownerId];
                const recv   = eData[targetId];

                if (sender[asset] < amount) {
                    return interaction.reply({ content: `⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${sender[asset]}**`, flags: MessageFlags.Ephemeral });
                }

                // Daily BTC give limit: 5,000 BTC/day
                const GIVE_DAILY_LIMIT = 5_000;
                const btcAmount = asset === 'btc' ? amount : Math.round(amount * (gpGive(asset) || 0));
                const today = new Date().toISOString().slice(0, 10);
                sender.dailyGiven ??= { date: '', usd: 0 };
                if (sender.dailyGiven.date !== today) sender.dailyGiven = { date: today, usd: 0 };
                if (sender.dailyGiven.usd + btcAmount > GIVE_DAILY_LIMIT) {
                    const remaining = Math.max(0, GIVE_DAILY_LIMIT - sender.dailyGiven.usd);
                    return interaction.reply({ content: `⚠️ **Maalineed ₿: ${GIVE_DAILY_LIMIT.toLocaleString()} xad** — hadhay: **₿: ${remaining.toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }
                sender.dailyGiven.usd += btcAmount;

                sender[asset] -= amount;
                recv[asset]   += amount;
                saveEcon();

                return interaction.update({ embeds: [
                    new EmbedBuilder()
                        .setTitle('💸 Lacag la Diray')
                        .setColor('#2ecc71')
                        .setDescription(
                            `✅ **${amount} ${asset.toUpperCase()}** u diray <@${targetId}>!\n` +
                            `${ASSET_LABELS[asset]}: **${sender[asset]}** (hadhay)`
                        )
                        .setFooter({ text: 'Garaad Economy' }),
                ], components: [closeRow(ownerId)] });
            }

            // ── Ebank: amount modal submit ──
            if (interaction.customId.startsWith('eco_ebmod_')) {
                const rest     = interaction.customId.replace('eco_ebmod_', '');
                const parts    = rest.split('_');
                const ownerId  = parts[parts.length - 1];
                const bank     = parts[parts.length - 2];
                const action   = parts[0];

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
                }

                const amount = parseInt(interaction.fields.getTextInputValue('eco_eb_amount'));
                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 500).', flags: MessageFlags.Ephemeral });
                }

                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { closeRow } = require('../../data/commands/economy/ebank');
                checkEconUser(ownerId);
                const d         = eData[ownerId];
                const bankLabel = bank.charAt(0).toUpperCase() + bank.slice(1);

                if (action === 'deposit') {
                    if ((d.btc || 0) < amount) {
                        return interaction.reply({ content: `⚠️ Not enough BTC. Wallet: **₿ ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                    }
                    d.btc         = (d.btc || 0) - amount;
                    d.banks[bank] += amount;
                    saveEcon();
                    return interaction.update({ embeds: [new EmbedBuilder()
                        .setTitle('🏦 Deposit — Success!')
                        .setColor('#27ae60')
                        .addFields(
                            { name: '💰 Deposited',     value: `**+₿ ${amount.toLocaleString()}**`,          inline: true },
                            { name: '🏦 Bank Balance',  value: `**₿ ${d.banks[bank].toLocaleString()}**`,    inline: true },
                            { name: '💳 Wallet',        value: `**₿ ${(d.btc||0).toLocaleString()}**`,      inline: true },
                        )
                        .setFooter({ text: 'Garaad Bank • 1% daily interest on deposits' }),
                    ], components: [closeRow(ownerId)] });
                } else {
                    if (d.banks[bank] < amount) {
                        return interaction.reply({ content: `⚠️ Not enough in bank. Balance: **₿ ${d.banks[bank].toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                    }
                    d.banks[bank] -= amount;
                    d.btc          = (d.btc || 0) + amount;
                    saveEcon();
                    return interaction.update({ embeds: [new EmbedBuilder()
                        .setTitle('🏦 Withdrawal — Success!')
                        .setColor('#2980b9')
                        .addFields(
                            { name: '💰 Withdrawn',     value: `**-₿ ${amount.toLocaleString()}**`,          inline: true },
                            { name: '🏦 Bank Balance',  value: `**₿ ${d.banks[bank].toLocaleString()}**`,    inline: true },
                            { name: '💳 Wallet',        value: `**₿ ${(d.btc||0).toLocaleString()}**`,      inline: true },
                        )
                        .setFooter({ text: 'Garaad Bank • Funds available instantly' }),
                    ], components: [closeRow(ownerId)] });
                }
            }

            // ── Ebank: bank transfer modal submit ──
            if (interaction.customId.startsWith('eco_ebmod_transfer_')) {
                const rest    = interaction.customId.replace('eco_ebmod_transfer_garaad_', '');
                const ownerId = rest;

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
                }

                const targetId = interaction.fields.getTextInputValue('eco_eb_target').trim().replace(/[<@!>]/g, '');
                const amount   = parseInt(interaction.fields.getTextInputValue('eco_eb_amount'));

                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 500).', flags: MessageFlags.Ephemeral });
                }
                if (targetId === ownerId) {
                    return interaction.reply({ content: '⚠️ Adiga nafta bank-kaaga uma dirin kartid.', flags: MessageFlags.Ephemeral });
                }

                const TRANSFER_TAX_RATE = 0.05; // 5%

                const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
                const { closeRow } = require('../../data/commands/economy/ebank');

                checkEconUser(ownerId);
                checkEconUser(targetId);
                const sender   = eData[ownerId];
                const receiver = eData[targetId];

                if ((sender.banks?.garaad || 0) < amount) {
                    return interaction.reply({ content: `⚠️ Bank-kaagu lacag ku filan ma lahan. Haysataa: **₿: ${(sender.banks?.garaad || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }

                const tax      = Math.max(1, Math.floor(amount * TRANSFER_TAX_RATE));
                const received = amount - tax;

                sender.banks.garaad   -= amount;
                receiver.banks        ??= { garaad: 0 };
                receiver.banks.garaad += received;
                addToTreasury(tax);
                saveEcon();

                let receiverName = targetId;
                try { const u = await interaction.client.users.fetch(targetId); receiverName = u.username; } catch {}

                return interaction.update({ embeds: [new EmbedBuilder()
                    .setTitle('💸 Bank Transfer — Success!')
                    .setColor('#27ae60')
                    .setDescription(`**${interaction.user.username}** → **${receiverName}**`)
                    .addFields(
                        { name: '💰 Sent',              value: `**₿ ${amount.toLocaleString()}**`,                  inline: true },
                        { name: '🏛️ Fee (5%)',          value: `**-₿ ${tax.toLocaleString()}**`,                    inline: true },
                        { name: '✅ Received',          value: `**₿ ${received.toLocaleString()}**`,                inline: true },
                        { name: '🏦 Your Bank',         value: `**₿ ${sender.banks.garaad.toLocaleString()}**`,     inline: true },
                        { name: '🏦 Their Bank',        value: `**₿ ${receiver.banks.garaad.toLocaleString()}**`,   inline: true },
                    )
                    .setFooter({ text: 'Garaad Bank • 5% transfer fee' }),
                ], components: [closeRow(ownerId)] });
            }

            // ── Cashflip: amount modal submit ──
            if (interaction.customId.startsWith('eco_cfmod_')) {
                const rest    = interaction.customId.replace('eco_cfmod_', '');
                const lastUnd = rest.lastIndexOf('_');
                const asset   = rest.substring(0, lastUnd);
                const ownerId = rest.substring(lastUnd + 1);

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
                }

                const amountStr = interaction.fields.getTextInputValue('eco_cf_amount');
                const amount    = parseFloat(amountStr);

                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 100).', flags: MessageFlags.Ephemeral });
                }

                const { econData: eData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../economy/econStore');
                const { ASSET_LABELS, closeRow } = require('../../data/commands/economy/cashflip');
                const { getPrice } = require('../economy/market');
                checkEconUser(ownerId);
                const d = eData[ownerId];

                if (d[asset] < amount) {
                    return interaction.reply({ content: `⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[asset]}**`, flags: MessageFlags.Ephemeral });
                }

                // Show flipping animation immediately
                await interaction.update({ embeds: [
                    new EmbedBuilder()
                        .setTitle('🪙 Cashflip — La Raadinayaa...')
                        .setColor('#f39c12')
                        .setDescription(`🎰 **${amount} ${asset.toUpperCase()}** la ciyaarayaa...\n\n⏳ _Sugso xogtaada..._`)
                        .setFooter({ text: '50/50 chance • Garaad Economy' }),
                ], components: [] });

                // Wait 1.2 seconds then reveal result
                await new Promise(r => setTimeout(r, 1200));

                const { WIN_MULTI } = require('../../data/commands/economy/cashflip');
                const { fmt: cfFmt } = require('../utils/helpers');
                const win = Math.random() < 0.50;
                if (win) {
                    const profit = Math.floor(amount * WIN_MULTI);
                    d[asset] += profit;
                    const fee    = amount - profit;
                    const feeUsd = asset === 'usd' ? fee : Math.round(fee * (getPrice(asset) || 0));
                    addToTreasury(feeUsd);
                    trackEarning(ownerId, asset === 'usd' ? profit : Math.round(profit * (getPrice(asset) || 0)));
                } else {
                    d[asset] -= amount;
                    const usdLoss = asset === 'usd' ? amount : Math.round(amount * (getPrice(asset) || 0));
                    addToTreasury(usdLoss);
                }
                saveEcon();

                const profitAmt = `${cfFmt(Math.floor(amount * WIN_MULTI))} ${asset.toUpperCase()}`;
                const lossAmt   = `${cfFmt(amount)} ${asset.toUpperCase()}`;
                const balLabel  = `${cfFmt(d[asset])} ${asset.toUpperCase()}`;

                await interaction.editReply({ embeds: [
                    new EmbedBuilder()
                        .setTitle(win ? '✅ Ecoflip: Guul ✅' : '❌ Ecoflip: Guuldarro ❌')
                        .setColor(win ? '#2ecc71' : '#e74c3c')
                        .setDescription(
                            win
                                ? `Suuqa ayaa kuu shaqeeyay. 📈\n\n💸 **Faa'iido:** +${profitAmt}\n💰 **Balance Cusub:** ${balLabel}\n\n🔄 Isticmaal \`?trade\` si aad u tijaabiso mar kale.\n\n✨ **Garaad Economy**`
                                : `Suuqa kuma taageerin. 📉\n\n💸 **Qasaaro:** -${lossAmt}\n💰 **Balance Cusub:** ${balLabel}\n\n🔄 Isticmaal \`?trade\` si aad u tijaabiso fursad kale.\n\n✨ **Garaad Economy**`
                        ),
                ], components: [closeRow(ownerId)] });
            }

            // ── Trade: amount modal submit ──
            if (interaction.customId.startsWith('eco_tmod_')) {
                const rest    = interaction.customId.replace('eco_tmod_', '');
                const lastUnd = rest.lastIndexOf('_');
                const asset   = rest.substring(0, lastUnd);
                const ownerId = rest.substring(lastUnd + 1);

                if (interaction.user.id !== ownerId) {
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
                }

                const amountStr = interaction.fields.getTextInputValue('eco_trade_amount');
                const amount    = parseFloat(amountStr);

                if (!amount || isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 2).', flags: MessageFlags.Ephemeral });
                }

                const { econData: eData, checkEconUser } = require('../economy/econStore');
                const { getPrice }                        = require('../economy/market');
                const { buildConfirmEmbed, confirmRow }   = require('../../data/commands/economy/trade');
                checkEconUser(ownerId);
                const d     = eData[ownerId];
                const price = getPrice(asset);

                return interaction.reply({
                    embeds:     [buildConfirmEmbed(asset, amount, price, d)],
                    components: [confirmRow(asset, amount, price, ownerId)],
                });
            }

            // ── Admin: Add/Remove Admin modal submit (owner only) ──
            if (interaction.customId.startsWith('admin_m_addadmin_')) {
                if (interaction.user.id !== OWNER_ID)
                    return interaction.reply({ content: '⛔ Owner kaliya.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const action   = (interaction.fields.getTextInputValue('action') || '').trim().toLowerCase();
                const { addAdmin, removeAdmin, listAdmins } = require('../utils/admin');
                if (action === 'add') {
                    const added = addAdmin(targetId);
                    await notifyAdmins(interaction.client, interaction.user, `Add Admin: <@${targetId}>`);
                    return interaction.reply({
                        content: added
                            ? `✅ <@${targetId}> admin-yada lagu daray. Admins: **${listAdmins().length}**`
                            : `⚠️ <@${targetId}> horay u ahaa admin.`,
                        flags: MessageFlags.Ephemeral,
                    });
                } else if (action === 'remove') {
                    const removed = removeAdmin(targetId);
                    await notifyAdmins(interaction.client, interaction.user, `Remove Admin: <@${targetId}>`);
                    return interaction.reply({
                        content: removed
                            ? `✅ <@${targetId}> admin-yada laga saaray. Admins: **${listAdmins().length}**`
                            : `⚠️ <@${targetId}> admin ma aha.`,
                        flags: MessageFlags.Ephemeral,
                    });
                } else {
                    return interaction.reply({ content: '⚠️ Ficilka: `add` ama `remove`', flags: MessageFlags.Ephemeral });
                }
            }

            // ── Admin: Broadcast modal submit ──
            if (interaction.customId.startsWith('admin_m_broadcast_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const text = interaction.fields.getTextInputValue('msg').trim();
                if (!text) return interaction.reply({ content: '⚠️ Fariin maxaad qortay?', flags: MessageFlags.Ephemeral });
                const { userData: uData } = require('../store');
                const userIds = Object.keys(uData);
                await interaction.reply({ content: `📢 Fariin loo dirayaa **${userIds.length}** user...`, flags: MessageFlags.Ephemeral });
                const broadEmbed = new EmbedBuilder()
                    .setTitle('📢 Garaad Bot — Fariin Rasmi ah')
                    .setDescription(text)
                    .setColor('#3498db')
                    .setFooter({ text: 'Garaad Bot' })
                    .setTimestamp();
                let success = 0, failed = 0;
                for (const uid of userIds) {
                    try {
                        const u = await interaction.client.users.fetch(uid).catch(() => null);
                        if (!u) { failed++; continue; }
                        await u.send({ embeds: [broadEmbed] });
                        success++;
                    } catch { failed++; }
                    await new Promise(r => setTimeout(r, 200));
                }
                await notifyAdmins(interaction.client, interaction.user, `Broadcast to ${userIds.length} users: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
                return interaction.editReply({ content: `✅ La gaadhsiiyay: **${success}** | ❌ Kuma gaadhsiin: **${failed}**` });
            }

            // ── Admin: Give IQ or BTC (combined modal) ──
            if (interaction.customId.startsWith('admin_m_give_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId  = interaction.fields.getTextInputValue('target_id').trim();
                const raw       = interaction.fields.getTextInputValue('give_input').trim().toLowerCase();
                const parts     = raw.split(/\s+/);
                const type      = parts[0];
                const amount    = parseFloat(parts[1]);
                if ((type !== 'iq' && type !== 'btc') || isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Qaabka: `iq 200`  ama  `btc 500`', flags: MessageFlags.Ephemeral });

                if (type === 'iq') {
                    const { userData: uData, saveData } = require('../store');
                    const { checkUser } = require('../utils/helpers');
                    checkUser(targetId);
                    uData[targetId].iq = Math.max(0, (uData[targetId].iq || 0) + amount);
                    saveData();
                    await notifyAdmins(interaction.client, interaction.user, `Give IQ: **+${amount} IQ** → <@${targetId}>`);
                    return interaction.reply({ content: `✅ <@${targetId}> **+${amount} IQ**. Hadda: **${uData[targetId].iq} IQ**`, flags: MessageFlags.Ephemeral });
                } else {
                    const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                    checkEconUser(targetId);
                    eData[targetId].btc = (eData[targetId].btc || 0) + amount;
                    saveEcon();
                    await notifyAdmins(interaction.client, interaction.user, `Give BTC: **+₿: ${amount.toLocaleString()}** → <@${targetId}>`);
                    return interaction.reply({ content: `✅ <@${targetId}> **+₿: ${amount.toLocaleString()}**. Hadda: **₿: ${eData[targetId].btc.toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }
            }

            // ── Admin: Transfer → bank modal submit ──
            if (interaction.customId.startsWith('admin_m_transfer_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const amount   = parseFloat(interaction.fields.getTextInputValue('amount').replace(/,/g, ''));
                if (isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 5000).', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                checkEconUser(targetId);
                eData[targetId].banks        ??= { garaad: 0 };
                eData[targetId].banks.garaad ??= 0;
                eData[targetId].banks.garaad  += amount;
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Transfer → Bank: **+₿ ${fmt(amount)}** → <@${targetId}>`);
                return interaction.reply({ content: `✅ <@${targetId}> bangiga **+₿ ${fmt(amount)}** lagu daray.\n🏦 Hadda: **₿ ${fmt(eData[targetId].banks.garaad)}**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin: Give All IQ modal submit ──
            if (interaction.customId.startsWith('admin_m_giveall_iq_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);
                if (isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 100).', flags: MessageFlags.Ephemeral });
                const { userData: uData, saveData: sd } = require('../store');
                const { checkUser: cu } = require('../utils/helpers');
                const users = Object.keys(uData);
                for (const uid of users) {
                    cu(uid);
                    uData[uid].iq = (uData[uid].iq || 0) + amount;
                }
                sd();
                await notifyAdmins(interaction.client, interaction.user, `Give All IQ: **+${amount} IQ** × ${users.length} players`);
                return interaction.reply({ content: `✅ **${users.length}** players qof walba wuxuu helay **+${amount} IQ**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Aqoon modal: Give IQ ──
            if (interaction.customId.startsWith('admin_aq_m_giveiq_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { userData: uData, saveData } = require('../store');
                const { checkUser } = require('../utils/helpers');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const amount   = parseInt(interaction.fields.getTextInputValue('amount'), 10);
                if (isNaN(amount) || amount === 0) return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                checkUser(targetId);
                uData[targetId].iq = Math.max(0, (uData[targetId].iq || 0) + amount);
                saveData();
                await notifyAdmins(interaction.client, interaction.user, `Give IQ: **${amount > 0 ? '+' : ''}${amount} IQ** → <@${targetId}>`);
                return interaction.reply({ content: `✅ <@${targetId}> wuxuu helay **${amount > 0 ? '+' : ''}${amount} IQ**. Hadda: **${uData[targetId].iq} IQ**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Aqoon modal: Reset All ──
            if (interaction.customId.startsWith('admin_aq_m_resetall_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const confirm = interaction.fields.getTextInputValue('confirm').trim().toUpperCase();
                if (confirm !== 'RESET')
                    return interaction.reply({ content: '⚠️ "RESET" ayaad qori lahayd. La joojiyay.', flags: MessageFlags.Ephemeral });
                const { userData: uData, saveData: sd } = require('../store');
                const { checkUser: cu } = require('../utils/helpers');
                const users = Object.keys(uData);
                for (const uid of users) {
                    cu(uid);
                    uData[uid].iq = 0;
                    uData[uid].xp = 0;
                    uData[uid].stars = 0;
                    uData[uid].pendingQuizPoints = 0;
                    uData[uid].ownedTitles  = ['beginner'];
                    uData[uid].activeTitle  = 'beginner';
                    uData[uid].customTitle  = null;
                    uData[uid].stats = { soloPlayed:0, soloCorrect:0, soloWrong:0, duelWins:0, duelLosses:0, duelDraws:0, rushBest:0, quizWins:0, quizPlayed:0, bugsReported:0 };
                }
                sd();
                await notifyAdmins(interaction.client, interaction.user, `Reset All Aqoon — IQ, darajo, stats eber (${users.length} users)`);
                return interaction.reply({ content: `✅ **${users.length} qof** aqoon dib loo dejiyay — IQ, darajo, stats eber.`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Aqoon modal: Champion ──
            if (interaction.customId.startsWith('admin_aq_m_champion_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const action   = interaction.fields.getTextInputValue('action').trim().toLowerCase();
                if (action === 'give') {
                    await notifyAdmins(interaction.client, interaction.user, `Champion Give → <@${targetId}>`);
                    const giveChampion = require('../../data/commands/admin/adminGiveChampion');
                    const fakeMsg = { author: interaction.user, mentions: { users: { first: () => ({ id: targetId }) } }, reply: (p) => interaction.reply({ ...p, flags: MessageFlags.Ephemeral }) };
                    return giveChampion(fakeMsg, []);
                } else if (action === 'remove') {
                    await notifyAdmins(interaction.client, interaction.user, `Champion Remove → <@${targetId}>`);
                    const removeChampion = require('../../data/commands/admin/adminRemoveChampion');
                    const fakeMsg = { author: interaction.user, mentions: { users: { first: () => ({ id: targetId }) } }, reply: (p) => interaction.reply({ ...p, flags: MessageFlags.Ephemeral }) };
                    return removeChampion(fakeMsg, []);
                }
                return interaction.reply({ content: '⚠️ Ficilka: `give` ama `remove`', flags: MessageFlags.Ephemeral });
            }

            // ── Admin modal: Reset (combined IQ + Eco, owner only) ──
            if (interaction.customId.startsWith('admin_m_reset_')) {
                if (interaction.user.id !== OWNER_ID)
                    return interaction.reply({ content: '⛔ Owner kaliya.', flags: MessageFlags.Ephemeral });
                const password  = interaction.fields.getTextInputValue('password').trim();
                if (password !== OWNER_PASS)
                    return interaction.reply({ content: '⛔ Password qalad ah.', flags: MessageFlags.Ephemeral });
                const rawTarget  = interaction.fields.getTextInputValue('target_id').trim().toLowerCase();
                const resetAll   = rawTarget === 'all';
                const targetId   = resetAll ? null : rawTarget;
                const resetType  = (interaction.fields.getTextInputValue('reset_type') || 'both').trim().toLowerCase();
                if (!['iq', 'eco', 'both'].includes(resetType))
                    return interaction.reply({ content: '⚠️ Reset type: `iq`, `eco`, ama `both` qor.', flags: MessageFlags.Ephemeral });

                const doResetIq = resetType === 'iq'  || resetType === 'both';
                const doResetEco = resetType === 'eco' || resetType === 'both';

                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { userData: uData, saveData: sd } = require('../store');
                const { checkUser: cu } = require('../utils/helpers');

                const ecoUsers = doResetEco ? Object.keys(eData).filter(k => /^[0-9]{17,19}$/.test(k)) : [];
                const iqUsers  = doResetIq  ? Object.keys(uData) : [];
                const targets  = resetAll ? null : [targetId];

                if (doResetEco) {
                    const list = targets || ecoUsers;
                    for (const uid of list) {
                        checkEconUser(uid);
                        const d = eData[uid];
                        d.btc = 1000;
                        d.banks = { garaad: 0 };
                        d.inventory = { safety: 0, robticket: 0 };
                        d.loan = null; d.lastLoanTaken = 0;
                        d.econTitles = []; d.activeEconTitle = null; d.customEconTitle = null;
                    }
                    saveEcon();
                }

                if (doResetIq) {
                    const list = targets || iqUsers;
                    for (const uid of list) {
                        cu(uid);
                        uData[uid].iq = 0; uData[uid].xp = 0; uData[uid].stars = 0;
                        uData[uid].pendingQuizPoints = 0;
                        uData[uid].ownedTitles = ['beginner'];
                        uData[uid].activeTitle = 'beginner';
                        uData[uid].customTitle = null;
                        uData[uid].stats = { soloPlayed:0, soloCorrect:0, soloWrong:0, duelWins:0, duelLosses:0, duelDraws:0, rushBest:0, quizWins:0, quizPlayed:0, bugsReported:0 };
                    }
                    sd();
                }

                const scope = resetAll ? 'dhammaan players' : `<@${targetId}>`;
                await notifyAdmins(interaction.client, interaction.user, `Reset **${resetType}** — ${scope}`);
                return interaction.reply({ content: `✅ **${resetType}** dib loo dejiyay — ${scope}.`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Aqoon modal: Reset (legacy) ──
            if (interaction.customId.startsWith('admin_aq_m_reset_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                await notifyAdmins(interaction.client, interaction.user, `Reset Aqoon (IQ/stats) → <@${targetId}>`);
                const reset    = require('../../data/commands/admin/adminReset');
                const fakeMsg  = { author: interaction.user, mentions: { users: { first: () => ({ id: targetId }) } }, reply: (p) => interaction.reply({ ...p, flags: MessageFlags.Ephemeral }) };
                return reset(fakeMsg, []);
            }

            // ── Admin Aqoon modal: DM User ──
            if (interaction.customId.startsWith('admin_aq_m_dm_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const msg      = interaction.fields.getTextInputValue('msg');
                const user     = await interaction.client.users.fetch(targetId).catch(() => null);
                if (!user) return interaction.reply({ content: '⚠️ User la heli waayo.', flags: MessageFlags.Ephemeral });
                await user.send(msg).catch(() => {});
                await notifyAdmins(interaction.client, interaction.user, `DM sent → <@${targetId}>: "${msg.slice(0, 80)}${msg.length > 80 ? '…' : ''}"`);
                return interaction.reply({ content: `✅ DM la diray <@${targetId}>.`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give USD ──
            if (interaction.customId.startsWith('admin_eco_m_giveusd_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const amount   = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                eData[targetId].btc = (eData[targetId].btc || 0) + amount;
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Give BTC: **+₿: ${amount.toLocaleString()}** → <@${targetId}>`);
                return interaction.reply({ content: `✅ **₿: ${amount.toLocaleString()}** waxaad u diray <@${targetId}>. Hadda: **₿: ${eData[targetId].btc.toLocaleString()}**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give Asset ──
            if (interaction.customId.startsWith('admin_eco_m_giveasset_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const asset    = interaction.fields.getTextInputValue('asset').trim().toLowerCase();
                const amount   = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (asset !== 'btc') return interaction.reply({ content: '⚠️ Asset: `btc` kaliya', flags: MessageFlags.Ephemeral });
                if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                eData[targetId].btc = (eData[targetId].btc || 0) + amount;
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Give Asset (BTC): **+₿: ${amount.toLocaleString()}** → <@${targetId}>`);
                return interaction.reply({ content: `✅ **₿: ${amount.toLocaleString()}** waxaad u diray <@${targetId}>. Hadda: **₿: ${eData[targetId].btc.toLocaleString()}**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give Bank ──
            if (interaction.customId.startsWith('admin_eco_m_givebank_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const bank     = interaction.fields.getTextInputValue('bank').trim().toLowerCase();
                const amount   = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (bank !== 'garaad') return interaction.reply({ content: '⚠️ Bank: `garaad` kaliya', flags: MessageFlags.Ephemeral });
                if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                eData[targetId].banks[bank] = (eData[targetId].banks[bank] || 0) + amount;
                saveEcon();
                const bankLabel = bank.charAt(0).toUpperCase() + bank.slice(1);
                await notifyAdmins(interaction.client, interaction.user, `Give Bank: **+₿: ${amount.toLocaleString()}** → <@${targetId}> (${bankLabel} Bank)`);
                return interaction.reply({ content: `✅ **₿: ${amount.toLocaleString()}** waxaad u dejisay <@${targetId}> — 🏦 ${bankLabel} Bank. Hadda: **₿: ${eData[targetId].banks[bank].toLocaleString()}**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give Title ──
            if (interaction.customId.startsWith('admin_eco_m_givetitle_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { ECON_TITLES } = require('../../data/commands/economy/econShop');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const key      = interaction.fields.getTextInputValue('title_key').trim().toLowerCase();
                const info     = ECON_TITLES[key];
                if (!info) return interaction.reply({ content: `⚠️ Title key la garanwaayo: \`${key}\``, flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                const d = eData[targetId];
                if (!d.econTitles.includes(key)) d.econTitles.push(key);
                d.activeEconTitle = key;
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Give Title: **${info.label}** → <@${targetId}>`);
                return interaction.reply({ content: `✅ <@${targetId}> waxaa la siiyay: **${info.label}** _(hadda firfircoon)_`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Reset ──
            if (interaction.customId.startsWith('admin_eco_m_reset_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                const targetId   = interaction.fields.getTextInputValue('target_id').trim();
                const resetWhat  = (interaction.fields.getTextInputValue('reset_what') || 'both').trim().toLowerCase();
                checkEconUser(targetId);
                const d = eData[targetId];
                let msg = '';
                if (resetWhat === 'wallet') {
                    d.btc = 1000;
                    msg = `💼 Wallet reset to **1,000 BTC**`;
                } else if (resetWhat === 'bank') {
                    d.banks = { garaad: 0 };
                    d.loan = null;
                    msg = `🏦 Bank reset to **0 BTC** (loan cleared)`;
                } else {
                    d.btc = 1000;
                    d.banks = { garaad: 0 };
                    d.inventory = { safety: 0, robticket: 0 };
                    d.loan = null; d.lastLoanTaken = 0;
                    d.econTitles = []; d.activeEconTitle = null; d.customEconTitle = null;
                    msg = `♻️ Full economy reset — wallet **1,000 BTC**, bank **0**, loan cleared`;
                }
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Reset User Economy: <@${targetId}> — ${msg}`);
                return interaction.reply({ content: `✅ <@${targetId}> — ${msg}`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Treasury ──
            if (interaction.customId.startsWith('admin_eco_m_treasury_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const password = interaction.fields.getTextInputValue('password').trim();
                if (password !== OWNER_PASS)
                    return interaction.reply({ content: '⛔ Password qalad ah. Awood ma lihid.', flags: MessageFlags.Ephemeral });
                const action = interaction.fields.getTextInputValue('action').trim().toLowerCase();
                const { econData: eData, checkEconUser, saveEcon, getTreasury, deductFromTreasury } = require('../economy/econStore');
                const t = getTreasury();

                if (action === 'distribute' || action === 'qaybso' || action === 'all') {
                    const users   = Object.keys(eData).filter(k => /^[0-9]{17,19}$/.test(k));
                    const rawAmt  = interaction.fields.getTextInputValue('amount').trim().toLowerCase();
                    const amount  = rawAmt === 'all' ? t.balance : parseFloat(rawAmt);
                    if (!amount || isNaN(amount) || amount <= 0)
                        return interaction.reply({ content: '⚠️ Xaddad geli ama "all" qor.', flags: MessageFlags.Ephemeral });
                    const perUser = Math.floor(amount / users.length);
                    if (perUser < 1)
                        return interaction.reply({ content: '⚠️ Xaddadka aad yar — dadku aad baa u badan.', flags: MessageFlags.Ephemeral });
                    if (!deductFromTreasury(amount))
                        return interaction.reply({ content: `⚠️ Khaznadda ma filna. Hadda: **₿: ${fmt((t.balance || 0))}**`, flags: MessageFlags.Ephemeral });
                    for (const uid of users) { checkEconUser(uid); eData[uid].btc = (eData[uid].btc || 0) + perUser; }
                    saveEcon();
                    await notifyAdmins(interaction.client, interaction.user, `Distribute Treasury: **₿: ${perUser.toLocaleString()}** × ${users.length} players`);
                    return interaction.reply({ content: `✅ **₿: ${perUser.toLocaleString()}** × **${users.length}** players.\n🏛️ Treasury remaining: **₿: ${fmt((t.balance || 0))}**`, flags: MessageFlags.Ephemeral });
                }

                if (action === 'give' || action === 'sii') {
                    const targetId = interaction.fields.getTextInputValue('amount').trim().split(/\s+/)[0];
                    const amount   = parseFloat(interaction.fields.getTextInputValue('amount').trim().split(/\s+/)[1]);
                    if (!targetId || isNaN(amount) || amount <= 0)
                        return interaction.reply({ content: '⚠️ `give @userID xad` qaab isticmaal.', flags: MessageFlags.Ephemeral });
                    if (!deductFromTreasury(amount))
                        return interaction.reply({ content: `⚠️ Khaznadda ma filna. Hadda: **₿: ${fmt((t.balance || 0))}**`, flags: MessageFlags.Ephemeral });
                    checkEconUser(targetId);
                    eData[targetId].btc = (eData[targetId].btc || 0) + amount;
                    saveEcon();
                    await notifyAdmins(interaction.client, interaction.user, `Treasury Give: **₿: ${amount.toLocaleString()}** → <@${targetId}>`);
                    return interaction.reply({ content: `✅ Khaznadda **₿: ${amount.toLocaleString()}** waxaa laga siiyay <@${targetId}>.\n🏛️ Khaznad hadhay: **₿: ${fmt((t.balance || 0))}**`, flags: MessageFlags.Ephemeral });
                }

                // view
                return interaction.reply({
                    content: `🏛️ **Khaznadda:**\n💰 Hadda: **₿: ${fmt((t.balance || 0))}**\n📥 Wadarta soo gashay: **₿: ${fmt((t.totalIn || 0))}**\n📤 La qaybiyay: **₿: ${fmt(((t.totalIn || 0) - (t.balance || 0)))}**`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            // ── Admin Econ modal: Top-up Treasury ──
            if (interaction.customId.startsWith('admin_eco_m_topup_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const password = interaction.fields.getTextInputValue('password').trim();
                if (password !== OWNER_PASS)
                    return interaction.reply({ content: '⛔ Password qalad ah. Awood ma lihid.', flags: MessageFlags.Ephemeral });
                const amount = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                const { topUpTreasury, getTreasury, saveEcon } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                topUpTreasury(amount);
                saveEcon();
                const t = getTreasury();
                await notifyAdmins(interaction.client, interaction.user, `Top-up Treasury: **+₿: ${amount.toLocaleString()}** — balance now **₿: ${t.balance.toLocaleString()}**`);
                return interaction.reply({ content: `✅ **₿: ${amount.toLocaleString()}** khaznadda lagu daray.\n🏛️ Hadda: **₿: ${t.balance.toLocaleString()}**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Tax ──
            if (interaction.customId.startsWith('admin_eco_m_tax_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const password = interaction.fields.getTextInputValue('password').trim();
                if (password !== OWNER_PASS)
                    return interaction.reply({ content: '⛔ Password qalad ah. Awood ma lihid.', flags: MessageFlags.Ephemeral });
                const amount = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                const users = Object.entries(eData).filter(([k]) => /^[0-9]{17,19}$/.test(k));
                let collected = 0;
                for (const [uid] of users) {
                    checkEconUser(uid);
                    const d = eData[uid];
                    const deduct = Math.min(amount, d.btc || 0);
                    d.btc = (d.btc || 0) - deduct;
                    collected += deduct;
                }
                if (collected > 0) addToTreasury(collected);
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Tax: **₿: ${fmt(amount)}** × ${users.length} players → Treasury **+₿: ${fmt(collected)}**`);
                return interaction.reply({
                    content: `💸 **Tax Collected**\n**₿: ${fmt(amount)}** ka baxday qof walba (${users.length} players)\n🏛️ Treasury helay: **₿: ${fmt(collected)}**`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            // ── Admin Econ modal: Reset All ──
            if (interaction.customId.startsWith('admin_eco_m_resetall_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const password = interaction.fields.getTextInputValue('password').trim();
                if (password !== OWNER_PASS)
                    return interaction.reply({ content: '⛔ Password qalad ah. Awood ma lihid.', flags: MessageFlags.Ephemeral });
                const confirm = interaction.fields.getTextInputValue('confirm').trim().toUpperCase();
                if (confirm !== 'RESET')
                    return interaction.reply({ content: '⚠️ "RESET" ayaad qori lahayd. La joojiyay.', flags: MessageFlags.Ephemeral });
                const { econData: eData, saveEcon } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                const users = Object.keys(eData).filter(k => /^[0-9]{17,19}$/.test(k));
                for (const uid of users) {
                    const d = eData[uid];
                    d.banks = { mandeeq: 0, garaad: 0 };
                    d.inventory = { safety: 0, robticket: 0 };
                    d.loan = null; d.lastLoanTaken = 0; d.lastWork = 0; d.lastDaily = 0; d.lastInterest = 0;
                    d.todayEarned = { date: '', usd: 0 }; d.dailyGiven = { date: '', usd: 0 };
                    d.robsToday = { date: '', count: 0 };
                    d.serviceChargesPaid = { mandeeq: 0, garaad: 0 };
                    d.interestEarned = { mandeeq: 0, garaad: 0 };
                    d.econTitles = []; d.activeEconTitle = null; d.customEconTitle = null;
                }
                saveEcon();
                await notifyAdmins(interaction.client, interaction.user, `Reset All Economy — ${users.length} players`);
                return interaction.reply({ content: `✅ **${users.length} qof** economy dib loo dejiyay.\n₿ Qof walba: **₿: ${(5000).toLocaleString()}** | Deyn, bank, assets — eber.`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Reset Any (single user or all) ──
            if (interaction.customId.startsWith('admin_eco_m_resetany_')) {
                if (interaction.user.id !== OWNER_ID)
                    return interaction.reply({ content: '⛔ Owner kaliya.', flags: MessageFlags.Ephemeral });
                const password  = interaction.fields.getTextInputValue('password').trim();
                if (password !== OWNER_PASS)
                    return interaction.reply({ content: '⛔ Password qalad ah. Awood ma lihid.', flags: MessageFlags.Ephemeral });
                const rawTarget = interaction.fields.getTextInputValue('target_id').trim().toLowerCase();
                const resetAll  = !rawTarget || rawTarget === 'all';
                const targetId  = resetAll ? null : rawTarget;
                const resetRaw  = (interaction.fields.getTextInputValue('reset_what') || 'both').trim().toLowerCase();
                const resetWhat = (resetRaw === 'all') ? 'both' : resetRaw;
                if (!['wallet', 'bank', 'both'].includes(resetWhat))
                    return interaction.reply({ content: '⚠️ Reset: `wallet`, `bank`, ama `both` qor.', flags: MessageFlags.Ephemeral });

                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');

                function applyReset(d, what) {
                    if (what === 'wallet') {
                        d.btc = 1000;
                    } else if (what === 'bank') {
                        d.banks = { garaad: 0 };
                        d.loan = null; d.lastLoanTaken = 0;
                    } else {
                        d.btc = 1000;
                        d.banks = { garaad: 0 };
                        d.inventory = { safety: 0, robticket: 0 };
                        d.loan = null; d.lastLoanTaken = 0;
                        d.econTitles = []; d.activeEconTitle = null; d.customEconTitle = null;
                    }
                }

                if (resetAll) {
                    const users = Object.keys(eData).filter(k => /^[0-9]{17,19}$/.test(k));
                    for (const uid of users) { checkEconUser(uid); applyReset(eData[uid], resetWhat); }
                    saveEcon();
                    await notifyAdmins(interaction.client, interaction.user, `Reset ALL Economy (${resetWhat}) — ${users.length} players`);
                    return interaction.reply({ content: `✅ **${users.length} qof** dhammaan economy dib loo dejiyay (**${resetWhat}**).`, flags: MessageFlags.Ephemeral });
                } else {
                    checkEconUser(targetId);
                    applyReset(eData[targetId], resetWhat);
                    saveEcon();
                    await notifyAdmins(interaction.client, interaction.user, `Reset Economy (${resetWhat}): <@${targetId}>`);
                    return interaction.reply({ content: `✅ <@${targetId}> economy dib loo dejiyay (**${resetWhat}**).`, flags: MessageFlags.Ephemeral });
                }
            }

            // (eco_dnmod_ and eco_dnpay_ removed — deen is now button-only, no modals)

            // ── Shop: Custom name title modal ──
            if (interaction.customId.startsWith('eco_shop_custom_mod_')) {
                const ownerId = interaction.customId.replace('eco_shop_custom_mod_', '');
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
                const { SHOP_ITEMS } = require('../../data/commands/economy/econShop');
                checkEconUser(ownerId);
                const d    = eData[ownerId];
                const item = SHOP_ITEMS['custom'];
                const name = interaction.fields.getTextInputValue('custom_title_name').trim();

                if (!name || name.length < 2)
                    return interaction.reply({ content: '⚠️ Magaca aad gaaban yahay — ugu yaraan 2 xaraf.', flags: MessageFlags.Ephemeral });
                if ((d.btc || 0) < item.price)
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Qiimaha: **₿: ${item.price.toLocaleString()}** | Haysataa: **₿: ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });

                d.btc = (d.btc || 0) - item.price;
                d.customEconTitle ??= null;
                d.customEconTitle  = name;
                if (!d.econTitles.includes('custom')) d.econTitles.push('custom');
                d.activeEconTitle = 'custom';
                addToTreasury(item.price);
                saveEcon();
                return interaction.reply({ content: `✅ Custom title la sameeay: **${name}** ✍️\nTitle-kaagu hadda wuu firfircoon yahay! **₿: ${item.price.toLocaleString()}** la bixiyay.`, flags: MessageFlags.Ephemeral });
            }

            // ── Prediction: USD amount modal ──
            if (interaction.customId.startsWith('pred_amt_usd_')) {
                const ownerId = interaction.customId.replace('pred_amt_usd_', '');
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { setPending }                     = require('../economy/prediction');
                const { buildPickEmbed, pickRow }         = require('../../data/commands/economy/trade');
                const { econData: eData, checkEconUser } = require('../economy/econStore');

                const raw    = interaction.fields.getTextInputValue('pred_amount');
                const amount = parseFloat(raw);
                if (!amount || isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 500).', flags: MessageFlags.Ephemeral });

                checkEconUser(ownerId);
                if ((eData[ownerId].btc || 0) < amount)
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Haysataa: **₿ ${(eData[ownerId].btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });

                setPending(ownerId, { asset: 'btc', stakeType: 'btc', stakeAmount: amount, stakeUsd: amount });
                return interaction.update({
                    embeds:     [buildPickEmbed(amount)],
                    components: [pickRow(ownerId)],
                });
            }

            // ── Prediction: Asset amount modal ──
            if (interaction.customId.startsWith('pred_amt_ast_')) {
                const ownerId = interaction.customId.replace('pred_amt_ast_', '');
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { setPending, getPending } = require('../economy/prediction');
                const {
                    buildTimeEmbed, timeRow, backRow,
                } = require('../../data/commands/economy/trade');
                const { getPrice }                     = require('../economy/market');
                const { econData: eData, checkEconUser } = require('../economy/econStore');

                const raw    = interaction.fields.getTextInputValue('pred_amount');
                const amount = parseFloat(raw);
                if (!amount || isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 1).', flags: MessageFlags.Ephemeral });

                const pend = getPending(ownerId);
                if (!pend || !pend.asset)
                    return interaction.reply({ content: '⚠️ Xog la waayay — bilow marlabaad.', flags: MessageFlags.Ephemeral });

                const { asset } = pend;
                checkEconUser(ownerId);
                if ((eData[ownerId][asset] || 0) < amount)
                    return interaction.reply({ content: `⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${eData[ownerId][asset] || 0}**`, flags: MessageFlags.Ephemeral });

                const stakeUsd = Math.round(amount * (getPrice(asset) || 0));
                setPending(ownerId, { stakeType: 'asset', stakeAmount: amount, stakeUsd });
                return interaction.update({
                    embeds:     [buildTimeEmbed(asset, 'asset', amount, stakeUsd)],
                    components: [timeRow(ownerId), backRow(ownerId)],
                });
            }

            // ── Trade: sell asset modal submit ──
            if (interaction.customId.startsWith('trade_sellmod_')) {
                const rest    = interaction.customId.replace('trade_sellmod_', '');
                const lastUnd = rest.lastIndexOf('_');
                const asset   = rest.substring(0, lastUnd);
                const ownerId = rest.substring(lastUnd + 1);
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { econData: eData, checkEconUser, saveEcon, trackEarning } = require('../economy/econStore');
                const { getPrice: gpSell } = require('../economy/market');
                const { ASSET_LABEL: AL } = require('../economy/prediction');
                const { fmt: sfmt }        = require('../utils/helpers');
                checkEconUser(ownerId);
                const d = eData[ownerId];

                const sellAmt = parseFloat(interaction.fields.getTextInputValue('sell_amount'));
                if (!sellAmt || isNaN(sellAmt) || sellAmt <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                if ((d[asset] || 0) < sellAmt)
                    return interaction.reply({ content: `⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[asset] || 0}**`, flags: MessageFlags.Ephemeral });

                const price   = gpSell(asset);
                const btcGain = Math.floor(sellAmt * price);
                d[asset] -= sellAmt;
                d.btc     = (d.btc || 0) + btcGain;
                saveEcon();

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`✅ Iibso — ${AL[asset]}`)
                            .setColor('#e67e22')
                            .setDescription(
                                `**${sellAmt} ${AL[asset]}** la iibiyay\n` +
                                `₿ Lacag heshay: **+₿: ${sfmt(btcGain)}** (@ ₿: ${sfmt(price)})\n` +
                                `₿ BTC-kaaga hadda: **₿: ${sfmt(d.btc)}**\n` +
                                `${AL[asset]} hadhay: **${d[asset]}**`
                            )
                            .setFooter({ text: 'Garaad Economy' }),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // ── Trade Shop: buy modal submit ──
            if (interaction.customId.startsWith('trade_buymod_')) {
                const rest    = interaction.customId.replace('trade_buymod_', '');
                const lastUnd = rest.lastIndexOf('_');
                const asset   = rest.substring(0, lastUnd);
                const ownerId = rest.substring(lastUnd + 1);
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { getPrice }                                  = require('../economy/market');
                const { ASSET_LABEL }                               = require('../economy/prediction');
                const { buildShopEmbed, shopRow, shopBackRow }      = require('../../data/commands/economy/trade');
                checkEconUser(ownerId);
                const d = eData[ownerId];

                const units = parseInt(interaction.fields.getTextInputValue('buy_amount'));
                if (!units || isNaN(units) || units < 1)
                    return interaction.reply({ content: '⚠️ Tirada sax ah geli (tusaale: 1).', flags: MessageFlags.Ephemeral });

                const price = getPrice(asset);
                if (!price || price <= 0)
                    return interaction.reply({ content: '⚠️ Qiimaha ma heli karo.', flags: MessageFlags.Ephemeral });

                const actualCost = units * price;
                if ((d.btc || 0) < actualCost)
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\n💸 Kharash: **₿: ${actualCost.toLocaleString()}** | Haysataa: **₿: ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                d.btc    = (d.btc || 0) - actualCost;
                d[asset]  = (d[asset] || 0) + units;
                saveEcon();

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`✅ Iibsi Guul — ${ASSET_LABEL[asset]}`)
                            .setColor('#27ae60')
                            .setDescription(
                                `**${units} ${ASSET_LABEL[asset]}** la iibsaday\n` +
                                `💸 Kharash: **₿: ${actualCost.toLocaleString()}**\n` +
                                `₿ BTC-kaaga hadda: **₿: ${(d.btc || 0).toLocaleString()}**\n` +
                                `${ASSET_LABEL[asset]} haysataa: **${d[asset]}**`
                            )
                            .setFooter({ text: 'Garaad Economy' }),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            return;
        }

        if (!interaction.isButton()) return;

        const id = interaction.customId;

        // ── Help tabs: Education / Economy / Other ──
        if (id.startsWith('help_edu_')) {
            const ownerId = id.replace('help_edu_', '');
            if (interaction.user.id !== ownerId) return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            return interaction.update({ embeds: [buildEduEmbed(ownerId)], components: [helpRow(ownerId, 'edu')] });
        }
        if (id.startsWith('help_eco_')) {
            const ownerId = id.replace('help_eco_', '');
            if (interaction.user.id !== ownerId) return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            return interaction.update({ embeds: [buildEcoEmbed()], components: [helpRow(ownerId, 'eco')] });
        }

        // ── Admin panel (unified — covers both aqoon + eco tab buttons) ──
        if (id.startsWith('admin_aqoon_') || (id.startsWith('admin_eco_') && !id.startsWith('admin_eco_give') && !id.startsWith('admin_eco_reset') && !id.startsWith('admin_eco_m_') && !id.startsWith('admin_eco_allplayers_') && !id.startsWith('admin_eco_loans_') && !id.startsWith('admin_eco_topup_') && !id.startsWith('admin_eco_treasury_') && !id.startsWith('admin_eco_resetall_') && !id.startsWith('admin_eco_tax_'))) {
            const ownerId = id.startsWith('admin_aqoon_') ? id.replace('admin_aqoon_', '') : id.replace('admin_eco_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { buildAdminEmbed, getRows } = require('../../data/commands/admin/adminHelpPanel');
            return interaction.update({ embeds: [buildAdminEmbed(ownerId)], components: getRows(ownerId) });
        }

        // ── Admin: Give (IQ or BTC) button → modal ──
        if (id.startsWith('admin_give_')) {
            const ownerId = id.replace('admin_give_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_m_give_${ownerId}`).setTitle('🎁 Give IQ or BTC');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('give_input').setLabel('iq 200  or  btc 500').setStyle(TextInputStyle.Short).setPlaceholder('iq 200   /   btc 500').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin: Give All IQ button → modal ──
        if (id.startsWith('admin_giveall_iq_')) {
            const ownerId = id.replace('admin_giveall_iq_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_m_giveall_iq_${ownerId}`).setTitle('🧠 Give IQ — All Players');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('amount').setLabel('IQ xaddadka (qof walba)').setStyle(TextInputStyle.Short)
                        .setPlaceholder('Tusaale: 100').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin: Transfer → bank button → modal ──
        if (id.startsWith('admin_transfer_')) {
            const ownerId = id.replace('admin_transfer_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_m_transfer_${ownerId}`).setTitle('💸 Transfer → Bank');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('BTC xaddadka').setStyle(TextInputStyle.Short).setPlaceholder('Tusaale: 5000').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin: Add/Remove Admin button → modal (owner only) ──
        if (id.startsWith('admin_addadmin_')) {
            const ownerId = id.replace('admin_addadmin_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (interaction.user.id !== OWNER_ID)
                return interaction.reply({ content: '⛔ Owner kaliya.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_m_addadmin_${ownerId}`).setTitle('👥 Admin — Add / Remove');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short)
                        .setPlaceholder('123456789012345678').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('action').setLabel('Ficil: add  ama  remove').setStyle(TextInputStyle.Short)
                        .setPlaceholder('add   /   remove').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin: Broadcast button → modal ──
        if (id.startsWith('admin_broadcast_')) {
            const ownerId = id.replace('admin_broadcast_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_m_broadcast_${ownerId}`).setTitle('📢 Broadcast — DM All Players');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('msg').setLabel('Fariinta (DM dhammaan players)').setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Tusaale: Quiz cusub berri 8 PM!').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin: Bugs button → ephemeral reply ──
        if (id.startsWith('admin_bugs_')) {
            const ownerId = id.replace('admin_bugs_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { getBugs } = require('../utils/admin');
            const bugs = getBugs(15);
            if (!bugs.length)
                return interaction.reply({ content: '🎉 Cilad lama soo sheegin!', flags: MessageFlags.Ephemeral });
            const bugsEmbed = new EmbedBuilder()
                .setTitle('🐛 Cilada La Soo Sheegay')
                .setColor('#e74c3c')
                .setFooter({ text: `${bugs.length} cilad` });
            bugs.forEach((b, i) => {
                const desc = b.description.length > 200 ? b.description.slice(0, 200) + '...' : b.description;
                bugsEmbed.addFields({ name: `${i + 1}. ${b.username || '?'} • ${new Date(b.timestamp).toLocaleString()}`, value: `> ${desc}\n🆔 \`${b.userId}\`` });
            });
            return interaction.reply({ embeds: [bugsEmbed], flags: MessageFlags.Ephemeral });
        }

        // ── Admin Aqoon: Give IQ button → modal (legacy) ──
        if (id.startsWith('admin_aq_giveiq_')) {
            const ownerId = id.replace('admin_aq_giveiq_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_aq_m_giveiq_${ownerId}`).setTitle('🧠 Give IQ');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Xaddadka IQ').setStyle(TextInputStyle.Short).setPlaceholder('Tusaale: 100').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Aqoon: Reset All button → confirm modal ──
        if (id.startsWith('admin_aq_resetall_')) {
            const ownerId = id.replace('admin_aq_resetall_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_aq_m_resetall_${ownerId}`).setTitle('♻️ Reset All Aqoon');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('confirm').setLabel('Xaqiiji: qor "RESET"').setStyle(TextInputStyle.Short).setPlaceholder('RESET').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Aqoon: Champion button → modal ──
        if (id.startsWith('admin_aq_champion_')) {
            const ownerId = id.replace('admin_aq_champion_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_aq_m_champion_${ownerId}`).setTitle('🏆 Champion');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('action').setLabel('Ficilka (give ama remove)').setStyle(TextInputStyle.Short).setPlaceholder('give').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin: Reset (combined IQ + Eco) button → modal (owner only) ──
        if (id.startsWith('admin_reset_')) {
            const ownerId = id.replace('admin_reset_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (interaction.user.id !== OWNER_ID)
                return interaction.reply({ content: '⛔ Owner kaliya.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_m_reset_${ownerId}`).setTitle('♻️ Reset User');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('target_id').setLabel('User ID  (ama "all" = dhammaan)').setStyle(TextInputStyle.Short)
                        .setPlaceholder('all   /   123456789012345678').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('reset_type').setLabel('Reset: iq / eco / both').setStyle(TextInputStyle.Short)
                        .setPlaceholder('iq  |  eco  |  both').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('password').setLabel('🔐 Owner Password').setStyle(TextInputStyle.Short)
                        .setPlaceholder('Owner password').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Aqoon: DM User button → modal ──
        if (id.startsWith('admin_aq_dm_')) {
            const ownerId = id.replace('admin_aq_dm_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_aq_m_dm_${ownerId}`).setTitle('💬 DM User');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg').setLabel('Fariinta').setStyle(TextInputStyle.Paragraph).setPlaceholder('Farriinta u dir qofka...').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: All Players button ──
        if (id.startsWith('admin_eco_allplayers_')) {
            const ownerId = id.replace('admin_eco_allplayers_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { buildAllPlayersEmbed } = require('../../data/commands/admin/adminEconPanel');
            const { getRows } = require('../../data/commands/admin/adminHelpPanel');
            return interaction.update({ embeds: [buildAllPlayersEmbed(0)], components: getRows(ownerId) });
        }

        // ── Admin Econ: Loans button ──
        if (id.startsWith('admin_eco_loans_')) {
            const ownerId = id.replace('admin_eco_loans_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { econData: eData } = require('../economy/econStore');
            const loans = Object.entries(eData)
                .filter(([k, d]) => /^[0-9]{17,19}$/.test(k) && d.loan?.owed > 0)
                .map(([uid, d]) => {
                    const days = Math.floor((Date.now() - d.loan.takenAt) / 86400000);
                    const left = Math.max(0, 3 - days);
                    return `${left === 0 ? '🔴' : '💳'} <@${uid}> — **₿: ${d.loan.owed.toLocaleString()}** | ${left === 0 ? '**OVERDUE**' : `${left}d`}`;
                });
            const { getRows } = require('../../data/commands/admin/adminHelpPanel');
            const loansEmbed = new EmbedBuilder()
                .setTitle(`💳 Deynta (${loans.length})`)
                .setColor('#e74c3c')
                .setDescription(loans.join('\n') || '_Cidna deen kuma jirto._')
                .setFooter({ text: 'Garaad Admin' });
            return interaction.update({ embeds: [loansEmbed], components: getRows(ownerId) });
        }

        // ── Admin Econ: Top-up Treasury button → modal ──
        if (id.startsWith('admin_eco_topup_')) {
            const ownerId = id.replace('admin_eco_topup_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { getTreasury } = require('../economy/econStore');
            const { fmt } = require('../utils/helpers');
            const t = getTreasury();
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_topup_${ownerId}`).setTitle('🏛️ Treasury Top-up');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('amount').setLabel('Xaddad ku dar khaznadda (BTC)').setStyle(TextInputStyle.Short)
                        .setPlaceholder(`Hadda: ₿: ${fmt((t.balance || 0))}`).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('password').setLabel('🔐 Owner Password').setStyle(TextInputStyle.Short)
                        .setPlaceholder('Owner password').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Tax button → modal ──
        if (id.startsWith('admin_eco_tax_')) {
            const ownerId = id.replace('admin_eco_tax_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_tax_${ownerId}`).setTitle('💸 Tax Players');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('amount').setLabel('Tax per player (BTC)').setStyle(TextInputStyle.Short)
                        .setPlaceholder('Tusaale: 5').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('password').setLabel('🔐 Owner Password').setStyle(TextInputStyle.Short)
                        .setPlaceholder('Owner password').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Reset (user or all) button → modal ──
        if (id.startsWith('admin_eco_resetany_')) {
            const ownerId = id.replace('admin_eco_resetany_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (interaction.user.id !== OWNER_ID)
                return interaction.reply({ content: '⛔ Owner kaliya.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_resetany_${ownerId}`).setTitle('♻️ Reset Economy');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('target_id').setLabel('User ID  (ama "all" = dhammaan)').setStyle(TextInputStyle.Short)
                        .setPlaceholder('all   /   123456789012345678').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('reset_what').setLabel('Reset: wallet / bank / both').setStyle(TextInputStyle.Short)
                        .setPlaceholder('wallet  |  bank  |  both').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('password').setLabel('🔐 Owner Password').setStyle(TextInputStyle.Short)
                        .setPlaceholder('Owner password').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Reset All button → confirm modal ──
        if (id.startsWith('admin_eco_resetall_')) {
            const ownerId = id.replace('admin_eco_resetall_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_resetall_${ownerId}`).setTitle('♻️ Reset All Economy');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('confirm').setLabel('Xaqiiji: qor "RESET"').setStyle(TextInputStyle.Short).setPlaceholder('RESET').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('password').setLabel('🔐 Owner Password').setStyle(TextInputStyle.Short).setPlaceholder('Owner password').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Give USD button → modal ──
        if (id.startsWith('admin_eco_giveusd_')) {
            const ownerId = id.replace('admin_eco_giveusd_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_giveusd_${ownerId}`).setTitle('₿ Give BTC');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Xaddadka BTC').setStyle(TextInputStyle.Short).setPlaceholder('Tusaale: 5000').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Give Asset button → modal ──
        if (id.startsWith('admin_eco_giveasset_')) {
            const ownerId = id.replace('admin_eco_giveasset_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_giveasset_${ownerId}`).setTitle('🪙 Give Asset');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('asset').setLabel('Asset (btc)').setStyle(TextInputStyle.Short).setPlaceholder('btc').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Xaddadka').setStyle(TextInputStyle.Short).setPlaceholder('Tusaale: 1').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Give Bank button → modal ──
        if (id.startsWith('admin_eco_givebank_')) {
            const ownerId = id.replace('admin_eco_givebank_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_givebank_${ownerId}`).setTitle('🏦 Give Bank');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bank').setLabel('Bank (garaad)').setStyle(TextInputStyle.Short).setPlaceholder('garaad').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Xaddadka BTC').setStyle(TextInputStyle.Short).setPlaceholder('Tusaale: 10000').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Give Title button → modal ──
        if (id.startsWith('admin_eco_givetitle_')) {
            const ownerId = id.replace('admin_eco_givetitle_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_givetitle_${ownerId}`).setTitle('🏷️ Give Economy Title');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title_key').setLabel('Title Key').setStyle(TextInputStyle.Short).setPlaceholder('ceoofbank / tycoon / manager ...').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Reset button → modal ──
        if (id.startsWith('admin_eco_reset_')) {
            const ownerId = id.replace('admin_eco_reset_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_reset_${ownerId}`).setTitle('🗑️ Reset Economy');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reset_what').setLabel('Reset: wallet / bank / both').setStyle(TextInputStyle.Short).setPlaceholder('wallet  |  bank  |  both').setRequired(true)),
            );
            return interaction.showModal(modal);
        }

        // ── Admin Econ: Treasury button → modal ──
        if (id.startsWith('admin_eco_treasury_')) {
            const ownerId = id.replace('admin_eco_treasury_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { getTreasury } = require('../economy/econStore');
            const t = getTreasury();
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_treasury_${ownerId}`).setTitle('🏛️ Treasury');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('action').setLabel('Ficil: view | distribute | give').setStyle(TextInputStyle.Short).setPlaceholder('view  /  distribute  /  give').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('amount').setLabel('Xaddad (distribute) ama "UserID xad" (give)').setStyle(TextInputStyle.Short).setPlaceholder(`Khaznad hadda: ₿: ${fmt((t.balance || 0))}`).setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('password').setLabel('🔐 Owner Password').setStyle(TextInputStyle.Short).setPlaceholder('Owner password').setRequired(true)
                ),
            );
            return interaction.showModal(modal);
        }

        // ── IQ dhigo button → modal ──
        if (id.startsWith('iq_dhigo_btn_')) {
            const ownerId = id.replace('iq_dhigo_btn_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const modal = new ModalBuilder()
                .setCustomId(`iq_dhigo_modal_${ownerId}`)
                .setTitle('IQ Bank Dhig');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('iq_amount')
                    .setLabel('Immisa IQ baad dhigan?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 50')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── IQ la bax button → modal ──
        if (id.startsWith('iq_labax_btn_')) {
            const ownerId = id.replace('iq_labax_btn_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            checkUser(ownerId);
            const bal = userData[ownerId].bank.balance;
            const modal = new ModalBuilder()
                .setCustomId(`iq_labax_modal_${ownerId}`)
                .setTitle('IQ Bank Ka Bax');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('iq_amount')
                    .setLabel('Immisa IQ baad baxan? (0 = oo dhan)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`Max: ${bal} IQ`)
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Bank: Bax (qaado dhammaan) ──
        if (id.startsWith('bank_bax_')) {
            const ownerId = id.replace('bank_bax_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            checkUser(ownerId);
            const d = userData[ownerId];
            const bank = d.bank;
            if (bank.balance <= 0) {
                return interaction.reply({ content: '⚠️ Bank kaaga waa madhan yahay.', flags: MessageFlags.Ephemeral });
            }
            const amount = bank.balance;
            d.iq         += amount;
            bank.balance  = 0;
            bank.transactions.unshift({ type: 'withdraw', amount, at: Date.now() });
            if (bank.transactions.length > 20) bank.transactions.length = 20;
            const { saveData } = require('../utils/helpers');
            saveData();
            return interaction.update({
                embeds: [new EmbedBuilder()
                    .setDescription(
                        `✅ **${amount} IQ** bank laga baxay\n\n` +
                        `🏦 Kaydka bank: **0 IQ**\n` +
                        `🧠 IQ-daada: **${d.iq} IQ**`
                    )
                    .setColor('#f39c12')],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`bank_bax_${ownerId}`)
                        .setLabel('Bax')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`close_bank_${ownerId}`)
                        .setLabel('Iska xir')
                        .setStyle(ButtonStyle.Danger),
                )],
            });
        }

        // ── Jeeb: Refresh ──
        if (id.startsWith('jeeb_refresh_')) {
            const parts    = id.replace('jeeb_refresh_', '').split('_');
            const targetId = parts[parts.length - 1];
            const authorId = parts.slice(0, -1).join('_');
            if (interaction.user.id !== authorId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { buildJeebEmbed, jeebRow } = require('../../data/commands/economy/jeeb');
            const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
            const username   = targetUser ? targetUser.username : targetId;
            const isOwner    = targetId === authorId;
            return interaction.update({ embeds: [buildJeebEmbed(targetId, username, isOwner)], components: [jeebRow(authorId, targetId)] });
        }

        // ── Team Duel: lobby buttons ──
        if (id.startsWith('tduel_join_')) {
            const channelId = id.replace('tduel_join_', '');
            const { handleJoin } = require('../games/teamDuel');
            return handleJoin(interaction, channelId);
        }
        if (id.startsWith('tduel_leave_')) {
            const channelId = id.replace('tduel_leave_', '');
            const { handleLeave } = require('../games/teamDuel');
            return handleLeave(interaction, channelId);
        }
        if (id.startsWith('tduel_start_')) {
            const rest      = id.replace('tduel_start_', '');
            const lastUs    = rest.lastIndexOf('_');
            const hostId    = rest.slice(0, lastUs);
            const channelId = rest.slice(lastUs + 1);
            const { handleStart } = require('../games/teamDuel');
            return handleStart(interaction, hostId, channelId);
        }
        if (id.startsWith('tduel_cancel_')) {
            const rest      = id.replace('tduel_cancel_', '');
            const lastUs    = rest.lastIndexOf('_');
            const hostId    = rest.slice(0, lastUs);
            const channelId = rest.slice(lastUs + 1);
            const { handleCancel } = require('../games/teamDuel');
            return handleCancel(interaction, hostId, channelId);
        }
        // Team Duel answer buttons — handled by collector; block non-participants
        if (id.startsWith('tduel_ans_')) {
            const parts     = id.split('_');
            // tduel_ans_{channelId}_{qIndex}_{optIndex}_{t|f}
            const channelId = parts[2];
            const { activeTeamDuels, handleNonParticipantAnswer } = require('../games/teamDuel');
            const state = activeTeamDuels.get(channelId);
            if (state && !([...state.teams[1], ...state.teams[2]]).includes(interaction.user.id)) {
                return interaction.reply({ content: '⛔ Game kuma jirtid — kama jawaabi kartid.', flags: MessageFlags.Ephemeral });
            }
            return; // handled by collector
        }

        // ── Vote: Claim BTC or Gold ──
        if (id.startsWith('vote_claim_')) {
            const parts  = id.split('_');
            const asset  = parts[2]; // btc or gold
            const userId = parts[3];
            if (interaction.user.id !== userId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

            const { recordClaim, hasClaimedRecently } = require('../economy/voteStore');
            const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
            const { userData: uData, saveData }  = require('../store');
            const { checkUser, fmt }             = require('../utils/helpers');

            if (hasClaimedRecently(userId))
                return interaction.reply({ content: '⚠️ Horay ayaad u claiméysay — 24 saacadood sug.', flags: MessageFlags.Ephemeral });

            checkUser(userId);
            checkEconUser(userId);
            recordClaim(userId);

            const IQ_GAIN  = 12;
            const AMT      = 250;
            uData[userId].iq  = (uData[userId].iq  || 0) + IQ_GAIN;
            eData[userId].btc = (eData[userId].btc || 0) + AMT;
            saveData();
            saveEcon();

            return interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Vote Reward — Claimed!')
                    .setColor('#2ecc71')
                    .setDescription(
                        `🧠 **+${IQ_GAIN} IQ**\n` +
                        `₿ **+₿: ${fmt(AMT)}**\n\n` +
                        `Vote again in 24 hours!`
                    )
                    .setFooter({ text: 'Garaad Bot — Thank you for voting!' })],
                components: [],
            });
        }

        // ── Xir (Close) ──
        if (id.startsWith('close_')) {
            const parts   = id.split('_');
            const ownerId = parts[parts.length - 1];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        // ── Trade: Accept disclaimer → open market ──
        // ── Prediction: Refresh market ──
        if (id.startsWith('pred_refresh_')) {
            const ownerId = id.replace('pred_refresh_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { getActivePrediction }            = require('../economy/prediction');
            const { buildMarketEmbed, buildActiveEmbed, mainRow, controlRow } = require('../../data/commands/economy/trade');
            checkEconUser(ownerId);
            const active = getActivePrediction(ownerId);
            if (active) {
                return interaction.update({ embeds: [buildActiveEmbed(active)], components: [controlRow(ownerId)] });
            }
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId)],
            });
        }

        // ── Prediction: Back / Cancel → market ──
        if (id.startsWith('pred_back_') || id.startsWith('pred_cancel_')) {
            const ownerId = id.startsWith('pred_back_')
                ? id.replace('pred_back_', '')
                : id.replace('pred_cancel_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { clearPending }                   = require('../economy/prediction');
            const { buildMarketEmbed, mainRow }       = require('../../data/commands/economy/trade');
            checkEconUser(ownerId);
            clearPending(ownerId);
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId)],
            });
        }

        // ── Prediction: Asset selected → skip stake type, go straight to modal ──
        if (id.startsWith('pred_a_')) {
            const rest    = id.replace('pred_a_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { setPending, ASSET_LABEL }        = require('../economy/prediction');
            checkEconUser(ownerId);

            // BTC button → directly show BTC amount modal (predict on BTC by default)
            if (asset === 'btc') {
                setPending(ownerId, { asset: 'btc', stakeType: 'btc' });
                const modal = new ModalBuilder()
                    .setCustomId(`pred_amt_usd_${ownerId}`)
                    .setTitle('₿ Immisa BTC baad dhigaysaa?');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('pred_amount')
                        .setLabel(`BTC (Haysataa: ${(eData[ownerId].btc || 0).toLocaleString()})`)
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Tusaale: 500')
                        .setRequired(true),
                ));
                return interaction.showModal(modal);
            }

            // Asset button → stakeType = asset, show asset amount modal directly
            setPending(ownerId, { asset, stakeType: 'asset' });
            const bal = eData[ownerId][asset] || 0;
            const modal = new ModalBuilder()
                .setCustomId(`pred_amt_ast_${ownerId}`)
                .setTitle(`${ASSET_LABEL[asset] || asset.toUpperCase()} Immisa baad dhigaysaa?`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('pred_amount')
                    .setLabel(`${asset.toUpperCase()} (Haysataa: ${bal})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 1')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Prediction: USD + asset selected → USD amount modal ──
        if (id.startsWith('pred_ua_')) {
            const rest    = id.replace('pred_ua_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { setPending }                     = require('../economy/prediction');
            checkEconUser(ownerId);
            setPending(ownerId, { asset, stakeType: 'btc' });
            const modal = new ModalBuilder()
                .setCustomId(`pred_amt_usd_${ownerId}`)
                .setTitle('₿ Immisa BTC baad dhigaysaa?');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('pred_amount')
                    .setLabel(`BTC (Haysataa: ${(eData[ownerId].btc || 0).toLocaleString()})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 500')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Prediction: Stake with BTC → amount modal ──
        if (id.startsWith('pred_st_usd_')) {
            const ownerId = id.replace('pred_st_usd_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            checkEconUser(ownerId);
            const modal = new ModalBuilder()
                .setCustomId(`pred_amt_usd_${ownerId}`)
                .setTitle('₿ Immisa BTC baad dhigaysaa?');
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('pred_amount')
                    .setLabel(`BTC (Haysataa: ${(eData[ownerId].btc || 0).toLocaleString()})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 500')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Prediction: Stake with Asset → amount modal ──
        if (id.startsWith('pred_st_ast_')) {
            const ownerId = id.replace('pred_st_ast_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { getPending, ASSET_LABEL }        = require('../economy/prediction');
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            checkEconUser(ownerId);
            const pend = getPending(ownerId);
            if (!pend || !pend.asset)
                return interaction.reply({ content: '⚠️ Xog la waayay — bilow marlabaad.', flags: MessageFlags.Ephemeral });
            const { asset } = pend;
            const bal = eData[ownerId][asset] || 0;
            const modal = new ModalBuilder()
                .setCustomId(`pred_amt_ast_${ownerId}`)
                .setTitle(`${ASSET_LABEL[asset] || asset.toUpperCase()} Immisa baad dhigaysaa?`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('pred_amount')
                    .setLabel(`${asset.toUpperCase()} (Haysataa: ${bal})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 1')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Prediction: Direction + time combined → auto-lock ──
        if (id.startsWith('pred_go_up_') || id.startsWith('pred_go_down_')) {
            const isUp    = id.startsWith('pred_go_up_');
            const rest    = id.replace(isUp ? 'pred_go_up_' : 'pred_go_down_', '');
            const parts   = rest.split('_');
            const minutes = parseInt(parts[0]);
            const ownerId = parts.slice(1).join('_');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { setPending, lockPrediction, getActivePrediction } = require('../economy/prediction');
            const { buildActiveEmbed, controlRow }                    = require('../../data/commands/economy/trade');
            setPending(ownerId, {
                direction: isUp ? 'up' : 'down',
                minutes,
                channelId: interaction.channelId,
                messageId: interaction.message.id,
            });
            const result = await lockPrediction(ownerId, interaction.client);
            if (!result.ok)
                return interaction.reply({ content: result.msg, flags: MessageFlags.Ephemeral });
            const active = getActivePrediction(ownerId);
            return interaction.update({
                embeds:     [buildActiveEmbed(active)],
                components: [controlRow(ownerId)],
            });
        }

        // ── Trade: open sell panel ──
        if (id.startsWith('trade_sell_') && !id.startsWith('trade_sellasset_') && !id.startsWith('trade_sellmod_')) {
            const ownerId = id.replace('trade_sell_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { buildSellEmbed, sellRow } = require('../../data/commands/economy/trade');
            checkEconUser(ownerId);
            return interaction.update({
                embeds:     [buildSellEmbed(eData[ownerId])],
                components: [sellRow(ownerId)],
            });
        }

        // ── Trade: select asset to sell → amount modal ──
        if (id.startsWith('trade_sellasset_')) {
            const rest    = id.replace('trade_sellasset_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { ASSET_LABEL } = require('../economy/prediction');
            const { getPrice }    = require('../economy/market');
            checkEconUser(ownerId);
            const price = getPrice(asset);
            const bal   = eData[ownerId][asset] || 0;
            const modal = new ModalBuilder()
                .setCustomId(`trade_sellmod_${asset}_${ownerId}`)
                .setTitle(`💰 Iibso ${ASSET_LABEL[asset] || asset.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('sell_amount')
                    .setLabel(`Xaddad (Qiimaha: ₿: ${price?.toLocaleString()} | Haysataa: ${bal})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 1')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Trade Shop: open asset shop ──
        if (id.startsWith('trade_shop_')) {
            const ownerId = id.replace('trade_shop_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { buildShopEmbed, shopRow } = require('../../data/commands/economy/trade');
            checkEconUser(ownerId);
            return interaction.update({
                embeds:     [buildShopEmbed(eData[ownerId])],
                components: [shopRow(ownerId)],
            });
        }

        // ── Trade Shop: buy asset → amount modal ──
        if (id.startsWith('trade_buy_')) {
            const rest    = id.replace('trade_buy_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { ASSET_LABEL }                    = require('../economy/prediction');
            const { getPrice }                       = require('../economy/market');
            checkEconUser(ownerId);
            const price   = getPrice(asset);
            const maxUnits = price > 0 ? Math.floor((eData[ownerId].btc || 0) / price) : 0;
            const modal = new ModalBuilder()
                .setCustomId(`trade_buymod_${asset}_${ownerId}`)
                .setTitle(`🛒 Iibso ${ASSET_LABEL[asset] || asset.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('buy_amount')
                    .setLabel(`Tirada (Qiimaha: ₿: ${price?.toLocaleString()}/unit | Max: ${maxUnits})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 1')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Give: Asset button → amount modal ──
        if (id.startsWith('eco_gv_')) {
            const parts    = id.split('_');
            const userId   = parts[parts.length - 1];
            const targetId = parts[parts.length - 2];
            const asset    = parts[2];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { ASSET_LABELS } = require('../../data/commands/economy/give');
            checkEconUser(userId);
            const balance = eData[userId][asset];

            const modal = new ModalBuilder()
                .setCustomId(`eco_gvmod_${asset}_${targetId}_${userId}`)
                .setTitle(`Lacag u dir — ${ASSET_LABELS[asset] || asset.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('eco_gv_amount')
                    .setLabel(`Xaddadka (Haysataa: ${balance} ${asset.toUpperCase()})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 200')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Ebank: navigation buttons ──
        if (id.startsWith('eco_eb_') && !id.startsWith('eco_eba_')) {
            const parts   = id.split('_');
            const userId  = parts[parts.length - 1];
            const section = parts[2]; // main | khaznad | garaad | deen

            if (interaction.user.id !== userId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

            const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
            const {
                applyInterest,
                buildMainEmbed, buildBankEmbed, buildKhaznadEmbed, buildDeenEmbed,
                bankFullRow, ebCloseRow, deenRow, backRow,
            } = require('../../data/commands/economy/ebank');
            checkEconUser(userId);
            const d = eData[userId];
            applyInterest(d);
            saveEcon();

            if (section === 'main') {
                return interaction.update({ embeds: [buildMainEmbed(d)], components: [bankFullRow(userId), ebCloseRow(userId)] });
            }
            if (section === 'khaznad') {
                return interaction.update({ embeds: [buildKhaznadEmbed()], components: [backRow(userId)] });
            }
            if (section === 'deen') {
                const hasLoan = !!(d.loan && d.loan.owed > 0);
                return interaction.update({ embeds: [buildDeenEmbed(d)], components: [deenRow(userId, hasLoan, d)] });
            }
            if (section === 'garaad') {
                return interaction.update({ embeds: [buildBankEmbed(d)], components: [bankFullRow(userId), ebCloseRow(userId)] });
            }
            if (section === 'transfer') {
                const modal = new ModalBuilder()
                    .setCustomId(`eco_ebmod_transfer_garaad_${userId}`)
                    .setTitle('💸 Bank Transfer');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('eco_eb_target')
                            .setLabel('Qofka User ID-giisa (right-click → Copy ID)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('123456789012345678')
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('eco_eb_amount')
                            .setLabel(`Xaddadka (Bank-kaaga: ₿: ${(d.banks?.garaad || 0).toLocaleString()})`)
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('500')
                            .setRequired(true)
                    ),
                );
                return interaction.showModal(modal);
            }
        }

        // ── Ebank: Action button (deposit/withdraw) → amount modal ──
        if (id.startsWith('eco_eba_')) {
            const parts  = id.split('_');
            const userId = parts[parts.length - 1];
            const bank   = parts[parts.length - 2];
            const action = parts[2];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { econData: eData, checkEconUser } = require('../economy/econStore');
            checkEconUser(userId);
            const d         = eData[userId];
            const bankLabel = bank.charAt(0).toUpperCase() + bank.slice(1);
            const isDeposit = action === 'deposit';
            const maxAmt    = isDeposit ? (d.btc || 0) : d.banks[bank];
            const label     = isDeposit ? `Dhig (Max: ₿: ${maxAmt.toLocaleString()})` : `Bax (Max: ₿: ${maxAmt.toLocaleString()})`;

            const modal = new ModalBuilder()
                .setCustomId(`eco_ebmod_${action}_${bank}_${userId}`)
                .setTitle(`${bankLabel} Bank — ${isDeposit ? 'Deposit' : 'Withdraw'}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('eco_eb_amount')
                    .setLabel(label)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 500')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }


        // ── Cashflip: Asset button → amount modal (legacy) ──
        if (id.startsWith('eco_cf_')) {
            const rest    = id.replace('eco_cf_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { ASSET_LABELS } = require('../../data/commands/economy/cashflip');
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            checkEconUser(ownerId);
            const balance = eData[ownerId][asset];

            const modal = new ModalBuilder()
                .setCustomId(`eco_cfmod_${asset}_${ownerId}`)
                .setTitle(`Cashflip — ${ASSET_LABELS[asset] || asset.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('eco_cf_amount')
                    .setLabel(`Xaddadka (Haysataa: ${balance} ${asset.toUpperCase()})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 100')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Deen: Take loan — give 2,000 BTC (Thursday only, once/week) ──
        if (id.startsWith('eco_dn_take_')) {
            const ownerId = id.replace('eco_dn_take_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
            const { buildDeenEmbed, deenRow, isBankOpen, usedWeeklyLoan, LOAN_MAX, LOAN_OWED } = require('../../data/commands/economy/ebank');
            checkEconUser(ownerId);
            const d = eData[ownerId];
            if (!isBankOpen())
                return interaction.reply({ content: '⚠️ Keedsane Bank maanta xiran yahay — Khamiis 1am soo noqo.', flags: MessageFlags.Ephemeral });
            if (usedWeeklyLoan(d))
                return interaction.reply({ content: '⚠️ Isbuucaan deen horay u qaaday — toddobaadka xiga soo noqo.', flags: MessageFlags.Ephemeral });
            if (d.loan && d.loan.owed > 0)
                return interaction.reply({ content: '⚠️ Deen jirto — marka hore celib.', flags: MessageFlags.Ephemeral });
            const { getTreasury, deductFromTreasury } = require('../economy/econStore');
            if (!deductFromTreasury(LOAN_MAX))
                return interaction.reply({ content: `⚠️ Khaznadda lacag ma filan — admin ayaa toddobaadkiiba lacag ku shubaa.\n🏛️ Hadda: **₿: ${fmt((getTreasury().balance || 0))}**`, flags: MessageFlags.Ephemeral });
            d.btc            = (d.btc || 0) + LOAN_MAX;
            d.lastLoanTaken  = Date.now();
            d.loan           = { asset: 'btc', amount: LOAN_MAX, owed: LOAN_OWED, takenAt: Date.now() };
            saveEcon();
            return interaction.update({ embeds: [buildDeenEmbed(d)], components: [deenRow(ownerId, true, d)] });
        }

        // ── Deen: Repay loan — $2,005 back to treasury ──
        if (id.startsWith('eco_dn_pay_')) {
            const ownerId = id.replace('eco_dn_pay_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
            const { buildDeenEmbed, deenRow, LOAN_OWED } = require('../../data/commands/economy/ebank');
            checkEconUser(ownerId);
            const d = eData[ownerId];
            if (!d.loan || d.loan.owed <= 0)
                return interaction.reply({ content: '⚠️ Deen ma jirto.', flags: MessageFlags.Ephemeral });
            if ((d.btc || 0) < d.loan.owed)
                return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nDeentaadu: **₿: ${d.loan.owed}** | Haysataa: **₿: ${d.btc || 0}**`, flags: MessageFlags.Ephemeral });
            d.btc  = (d.btc || 0) - d.loan.owed;
            addToTreasury(LOAN_OWED);
            d.loan  = null;
            saveEcon();
            return interaction.update({ embeds: [buildDeenEmbed(d)], components: [deenRow(ownerId, false, d)] });
        }

        // ── Trade: Refresh market view ──
        if (id.startsWith('eco_trefresh_')) {
            const ownerId = id.replace('eco_trefresh_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../../data/commands/economy/trade');
            checkEconUser(ownerId);
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId), tradeCloseRow(ownerId)],
            });
        }

        // ── Trade: Back to market view ──
        if (id.startsWith('eco_tback_')) {
            const ownerId = id.replace('eco_tback_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../../data/commands/economy/trade');
            checkEconUser(ownerId);
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId), tradeCloseRow(ownerId)],
            });
        }

        // ── Economy: Asset select button → amount modal ──
        if (id.startsWith('eco_tsel_')) {
            const rest    = id.replace('eco_tsel_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { ASSET_LABEL } = require('../../data/commands/economy/trade');
            const { getPrice }    = require('../economy/market');
            const price           = getPrice(asset);

            const modal = new ModalBuilder()
                .setCustomId(`eco_tmod_${asset}_${ownerId}`)
                .setTitle(`Trade — ${ASSET_LABEL[asset] || asset.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('eco_trade_amount')
                    .setLabel(`Xaddadka (Qiimaha: ₿: ${price.toLocaleString()} / mid)`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tusaale: 2')
                    .setRequired(true),
            ));
            return interaction.showModal(modal);
        }

        // ── Economy: Buy / Sell asset ──
        if (id.startsWith('eco_buy_') || id.startsWith('eco_sell_')) {
            const isBuy  = id.startsWith('eco_buy_');
            const parts  = id.split('_');
            // format: eco_buy_<asset>_<amount>_<price>_<userId>
            const userId = parts[parts.length - 1];
            const price  = parseFloat(parts[parts.length - 2]);
            const amount = parseFloat(parts[parts.length - 3]);
            const asset  = parts[2];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { econData, checkEconUser, saveEcon, addToTreasury: atT } = require('../economy/econStore');
            const { getPrice: gp, getMarketSnapshot }  = require('../economy/market');
            const { ASSET_LABEL }   = require('../../data/commands/economy/trade');
            checkEconUser(userId);
            const d         = econData[userId];
            const totalCost = Math.round(price * amount);

            let tradeWin = true;
            if (isBuy) {
                if ((d.btc || 0) < totalCost) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Haysataa: **₿: ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }
                // Market-weighted win probability: rising=50%, stable=45%, falling=40%
                const mktChange = getMarketSnapshot().find(s => s.asset === asset)?.change || 0;
                const winProb   = mktChange > 1 ? 0.50 : mktChange < -1 ? 0.40 : 0.45;
                tradeWin = Math.random() < winProb;
                d.btc = (d.btc || 0) - totalCost;
                if (tradeWin) {
                    d[asset] += amount;
                } else {
                    atT(totalCost);
                }
            } else {
                if (d[asset] < amount) {
                    return interaction.reply({ content: `⚠️ ${asset.toUpperCase()} kugu filna ma lihid. Haysataa: **${d[asset]}**`, flags: MessageFlags.Ephemeral });
                }
                d[asset] -= amount;
                d.btc     = (d.btc || 0) + totalCost;
            }
            saveEcon();
            const btcP = gp('btc'), goldP = gp('gold');
            const net  = d.btc * btcP + d.gold * goldP
                       + d.banks.mandeeq + d.banks.garaad;

            const resultRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`eco_min_${isBuy ? 'buy' : 'sell'}_${asset}_${amount}_${userId}`)
                    .setLabel('📉 So yaree')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`close_trade_${userId}`)
                    .setLabel('❌ Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );

            const buyTitle = tradeWin
                ? `✅ Iibsashada — ${ASSET_LABEL[asset] || asset.toUpperCase()}`
                : `📉 Khasaaro — ${ASSET_LABEL[asset] || asset.toUpperCase()}`;
            const buyDesc = tradeWin
                ? `✅ **${amount} ${asset.toUpperCase()}** iibsatay — **₿: ${totalCost.toLocaleString()}**`
                : `❌ Suuqa si xun u guuray — **₿: ${totalCost.toLocaleString()}** baad lumisay, asset ma helin.`;

            return interaction.update({ embeds: [
                new EmbedBuilder()
                    .setTitle(isBuy ? buyTitle : `₿ Iibinta — ${ASSET_LABEL[asset] || asset.toUpperCase()}`)
                    .setColor(isBuy ? (tradeWin ? '#2ecc71' : '#e74c3c') : '#3498db')
                    .setDescription(
                        `${isBuy ? buyDesc : `₿ **${amount} ${asset.toUpperCase()}** iibiyay — **₿: ${totalCost.toLocaleString()}**`}\n\n` +
                        `**📊 Jeebkaaga Hadda:**\n` +
                        `₿ BTC: **₿: ${(d.btc || 0).toLocaleString()}**\n` +
                        `🥇 Gold: **${d.gold}**\n` +
                        `🏦 Banks: **₿: ${fmt((d.banks.mandeeq + d.banks.garaad))}**\n\n` +
                        `📊 **Net Worth: ~₿: ${fmt(Math.round(net))}**`
                    )
                    .setFooter({ text: 'Garaad Economy' }),
            ], components: [resultRow] });
        }

        // ── Economy: Minimize trade result ──
        if (id.startsWith('eco_min_')) {
            const parts   = id.split('_');
            const userId  = parts[parts.length - 1];
            const action  = parts[2]; // buy or sell
            const asset   = parts[3];
            const amount  = parts[4];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { econData } = require('../economy/econStore');
            const d = econData[userId] || {};

            const closeBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`close_trade_${userId}`)
                    .setLabel('❌ Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );

            return interaction.update({ embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `${action === 'buy' ? '✅ Iibsatay' : '₿ Iibiyay'} **${amount} ${asset.toUpperCase()}** • ` +
                        `₿ BTC: **₿: ${fmt((d.btc || 0))}**`
                    )
                    .setColor('#2ecc71'),
            ], components: [closeBtn] });
        }

        // ── Economy Shop: Buy title or item via button ──
        if (id.startsWith('eco_shop_')) {
            const key = id.replace('eco_shop_', '');
            const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
            const { SHOP_ITEMS } = require('../../data/commands/economy/econShop');
            const userId = interaction.user.id;
            checkEconUser(userId);
            const d    = eData[userId];
            const item = SHOP_ITEMS[key];
            if (!item) return interaction.reply({ content: '⚠️ Shayga la heli waayo.', flags: MessageFlags.Ephemeral });

            if (item.type === 'title') {
                if (d.econTitles.includes(key)) {
                    return interaction.reply({ content: `⚠️ **${item.label}** hormar haysataa.\n\`?etitle ${key}\` si aad u dhigto.`, flags: MessageFlags.Ephemeral });
                }
                if ((d.btc || 0) < item.price) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nQiimaha: **₿: ${item.price.toLocaleString()}** | Haysataa: **₿: ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }
                d.btc = (d.btc || 0) - item.price;
                d.econTitles.push(key);
                if (!d.activeEconTitle) d.activeEconTitle = key;
                addToTreasury(item.price);
                saveEcon();
                return interaction.reply({ content: `✅ **${item.label}** si guul leh ayaad u iibsatay!\n\`?etitle ${key}\` si aad u dhigto.`, flags: MessageFlags.Ephemeral });
            }

            if (item.type === 'timed_item') {
                const expiryKey = key + 'Expiry';
                d.inventory ??= {};
                d.inventory[expiryKey] ??= 0;
                if (d.inventory[expiryKey] > Date.now()) {
                    const expiresIn = Math.ceil((d.inventory[expiryKey] - Date.now()) / 3600000);
                    return interaction.reply({ content: `⚠️ **${item.label}** weli active yahay — **${expiresIn}h** baqa.`, flags: MessageFlags.Ephemeral });
                }
                if ((d.btc || 0) < item.price) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nQiimaha: **₿: ${item.price.toLocaleString()}** | Haysataa: **₿: ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }
                d.btc = (d.btc || 0) - item.price;
                d.inventory[expiryKey] = Date.now() + 3 * 24 * 60 * 60 * 1000;
                saveEcon();
                return interaction.reply({ content: `✅ **${item.label}** iibsatay!\n💸 Bixisay: **₿ ${item.price.toLocaleString()}** · 💳 Hadhay: **₿ ${(d.btc || 0).toLocaleString()}**\n⏳ Waxay shaqaynaysaa **3 maalmood**.`, flags: MessageFlags.Ephemeral });
            }

            // Custom name title — show modal
            if (item.type === 'custom') {
                if ((d.btc || 0) < item.price) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nQiimaha: **₿: ${item.price.toLocaleString()}** | Haysataa: **₿: ${(d.btc || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });
                }
                const modal = new ModalBuilder()
                    .setCustomId(`eco_shop_custom_mod_${userId}`)
                    .setTitle('✍️ Magacaaga Custom Title-ka');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('custom_title_name')
                        .setLabel('Magacaaga title-ka (ugu badnaan 30 xaraf)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Tusaale: Garaadle, Dr. Ahmed, The Shark...')
                        .setMaxLength(30)
                        .setRequired(true),
                ));
                return interaction.showModal(modal);
            }

            return interaction.reply({ content: '⚠️ Nooca shayga la garanwaayo.', flags: MessageFlags.Ephemeral });
        }

        // ── Solo Answer ──
        if (id.startsWith('q_')) return handleSoloAnswer(interaction);

        // ── Solo Leaderboard button ──
        if (id.startsWith('solo_leaderboard_')) {
            return handleSoloLeaderboard(interaction);
        }

        // ── Aqoon Register button (from ?aqoon / ?tartan panels) ──
        if (id.startsWith('aqoon_register_')) {
            const uid  = interaction.user.id;
            const code = genCode();
            tournamentRegistry.set(uid, { code, at: Date.now() });
            try {
                await interaction.user.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('🏁 Tartan — Code-kaaga Gaarka ah')
                        .setDescription(
                            `✅ **Waxaad ku guulaysatay diiwaangelinta!**\n\n` +
                            `Code-gaaga waa:\n\n# \`${code}\`\n\n` +
                            `**Tillaabooyinka:**\n` +
                            `1. Sug ilaa admin \`?tartan_bilow\` qoro\n` +
                            `2. Channel-ka tartanka u tag\n` +
                            `3. Qor: \`?gal ${code}\`\n\n` +
                            `⚠️ **Code-kan ha u shegin qof kale!**`
                        )
                        .setColor('#2ecc71')],
                });
                return interaction.reply({ content: '✅ **Code-gaaga waa laguugu diray DM!** Fur farrimahaaga si aad u aragto.', flags: MessageFlags.Ephemeral });
            } catch {
                return interaction.reply({
                    content: '❌ Ma awoodin inaan kuu dirayo DM. Fur DM (Settings → Privacy → Allow DMs) ka dibna isku day mar kale.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // ── Tournament Rules button ──
        if (id === 'tournament_rules') {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                embeds: [new EmbedBuilder()
                    .setTitle('📖 Xeerarka Tartanka — Garaad Quiz')
                    .setColor('#3498db')
                    .setDescription(
                        `**📚 WAREEGYADA:**\n` +
                        `• Wareeg 1 — **${TOURNAMENT_R1_QUESTIONS} su'aalood**\n` +
                        `• Wareeg 2 (Semi-Final) — **${TOURNAMENT_R2_QUESTIONS} su'aalood**\n` +
                        `• Final 🏆 — **${TOURNAMENT_FINAL_QUESTIONS} su'aalood**\n\n` +
                        `**⚡ DHIBCO (ku xidhan xawliga):**\n` +
                        `• < 5 ilbiriqsi → **40 dhibcood** (max)\n` +
                        `• 18 ilbiriqsi → **5 dhibcood** (min)\n` +
                        `• Dhexda → si toos ah hoos ugu dhacaysa\n\n` +
                        `**🔀 SU'AALAHA:**\n` +
                        `• MCQ: **4 doorasho** (A, B, C, D)\n` +
                        `• True/False: **Run** (True) / **Been** (False)\n` +
                        `• Maadooyinka: Diini · Taariikh · Xisaab · Grammar · Juqraafi\n\n` +
                        `**🚫 KA-SAAR:**\n` +
                        `• Wareeg 1 → 2: 1/6 ee dhibcaha hooseeya baxaan\n` +
                        `• Wareeg 2 → Final: badh (50%) ayaa baxaysa\n\n` +
                        `**🏆 ABAALMARINTA:**\n` +
                        `• Guuleystaha: **Champion 🏆** title + 500 XP\n\n` +
                        `**📋 SIDA LOO BIIRAY:**\n` +
                        `1. Guji **Register** (DM = code-kaaga)\n` +
                        `2. Sug admin inuu \`?tartan_bilow\` qoro\n` +
                        `3. Qor \`?gal CODE\` channel-ka tartanka\n` +
                        `4. Admin qoraa \`?admin_next\` — bilow!`
                    )
                    .setFooter({ text: 'Garaad Quiz Tournament' })],
            }).catch(() => {});
        }

        // ── Tournament Count button ──
        if (id === 'tournament_count_admin') {
            const count = tournamentRegistry?.size || 0;
            if (isAdmin(interaction.user.id)) {
                const list = [...(tournamentRegistry?.entries() || [])].slice(0, 25)
                    .map(([uid, { username }], i) => `${i + 1}. **${username || uid}** (\`${uid}\`)`)
                    .join('\n');
                return interaction.reply({
                    content: `👥 **Is-diiwaangashay:** ${count} qof\n\n${list || '_Cidna weli ma diiwaangalin_'}`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            return interaction.reply({
                content: `👥 **Is-diiwaangashay:** ${count} qof`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── Tournament Register button ──
        if (id === 'tournament_register') {
            const state = activeTournament?.get(GAME_CHANNEL_ID);
            if (!state || state.stage !== 'registration') {
                return interaction.reply({
                    content: '🔒 Diiwaangelinta waa la xiray.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            return sendRegistrationCode(interaction.user, { reply: (o) => interaction.reply(o) });
        }

        // ── Tartan Bilow: Status button ──
        if (id.startsWith('tartan_bilow_status_')) {
            const state = activeTournament?.get(GAME_CHANNEL_ID);
            const count = state ? state.players.size : 0;
            return interaction.reply({
                content: `👥 Ka qaybgalayaasha: **${count}** qof`,
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }

        // ── Tartan: Admin DM panel — Fur Tartanka ──
        if (id.startsWith('tartan_open_')) {
            if (!isAdmin(interaction.user.id)) {
                return interaction.reply({ content: '⛔ Kaliya admin.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            const ok = await openGamePhase(interaction.client, interaction.user.id);
            if (ok) {
                return interaction.update({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Tartanka Waa La Furay')
                        .setColor('#2ecc71')
                        .setDescription(`Game channel waa la furay → <#${GAME_CHANNEL_ID}>\nDadka waxay qori karaan \`?gal CODE\``)
                    ],
                    components: [],
                }).catch(() => {});
            }
            return interaction.reply({ content: '⚠️ Khalad — state hubi.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        // ── Tartan: Admin DM panel — Tirada ──
        if (id.startsWith('tartan_reg_count_')) {
            const count = tournamentRegistry?.size || 0;
            const list  = [...(tournamentRegistry?.entries() || [])].slice(0, 25)
                .map(([uid, { username }], i) => `${i + 1}. **${username || uid}** (\`${uid}\`)`)
                .join('\n');
            return interaction.reply({
                content: `👥 **Diiwaangeliyay:** ${count} qof\n\n${list || '_Cidna weli ma diiwaangalin_'}`,
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }

        // ── Tartan: Admin DM panel — Jooji ──
        if (id.startsWith('tartan_cancel_')) {
            if (!isAdmin(interaction.user.id)) {
                return interaction.reply({ content: '⛔ Kaliya admin.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            const state = activeTournament?.get(GAME_CHANNEL_ID);
            if (state?._regTimer) clearTimeout(state._regTimer);
            activeTournament?.delete(GAME_CHANNEL_ID);
            return interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('🛑 Tartan Waa La Joojiyay')
                    .setColor('#e74c3c')
                    .setDescription('Admin ayaa tartanka joojiyay.')
                ],
                components: [],
            }).catch(() => {});
        }

        // ── Tartan: Admin Panel buttons ──
        if (id.startsWith('tartan_panel_')) {
            const action = id.replace('tartan_panel_', '');
            return handlePanelButton(interaction, action);
        }

        // ── Tartan Bilow: Next (admin only) ──
        if (id.startsWith('tartan_bilow_next_')) {
            if (!isAdmin(interaction.user.id)) {
                return interaction.reply({ content: '⛔ Kaliya **admin** ayaa bilaabi kara!', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            const state = activeTournament?.get(GAME_CHANNEL_ID);
            if (!state || state.stage !== 'join') {
                return interaction.reply({ content: '⚠️ Tartan lama heli karo ama mar hore wuu bilaabmay.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            if (state.players.size < TOURNAMENT_MIN_PLAYERS) {
                return interaction.reply({
                    content: `⚠️ Ugu yaraan **${TOURNAMENT_MIN_PLAYERS}** qof. Hadda: **${state.players.size}**`,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            await interaction.reply({ content: '▶️ Wareegga 1aad waa la bilaabayaa...', flags: MessageFlags.Ephemeral }).catch(() => {});
            state.survivors = new Set(state.players);
            state.roundIdx  = 1;
            state.channel   = interaction.channel;
            return beginRound(state, interaction.channel);
        }

        // ── Tournament Admin Next Button ──
        if (id.startsWith('tournament_admin_next_')) {
            if (!isAdmin(interaction.user.id)) {
                return interaction.reply({ content: '⛔ Kaliya **admin** ayaa badhankaan isticmaali kara.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            const state = activeTournament?.get(GAME_CHANNEL_ID);

            if (!state) {
                return interaction.reply({
                    content: '⚠️ Tartan ma jiro. Ugu horreyn `?tartan_bilow` si channel-ka loo furo.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }

            if (state.stage === 'play') {
                return interaction.reply({
                    content: '⚠️ Wareeg ayaa hadda socda — sug ilaa uu dhammaado.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }

            if (state.stage === 'join') {
                if (state.players.size < TOURNAMENT_MIN_PLAYERS) {
                    return interaction.reply({
                        content: `⚠️ Ugu yaraan **${TOURNAMENT_MIN_PLAYERS}** qof ayaa loo baahan yahay. Hadda: **${state.players.size}** qof.`,
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                }
                await interaction.reply({
                    content: '▶️ **Wareeg 1aad waa la bilaabayaa...**',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
                state.survivors = new Set(state.players);
                state.roundIdx  = 1;
                return beginRound(state, interaction.channel);
            }

            if (state.stage === 'pause') {
                const nextSurvivors = state._nextSurvivors || [];
                state.survivors     = new Set(nextSurvivors);
                state._nextSurvivors = null;
                if (state.survivors.size === 0) {
                    activeTournament.delete(cid);
                    return interaction.reply({
                        content: '❌ Cidna kuma hartay — tartan waa la joojiyay.',
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                }
                state.roundIdx += 1;
                const roundName = state.roundIdx === 2 ? 'Wareeg 2aad' : 'Final 🏆';
                await interaction.reply({
                    content: `▶️ **${roundName} waa la bilaabayaa...**`,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
                return beginRound(state, interaction.channel);
            }
        }

        // ── Duel ──
        if (id.startsWith('accept_duel_')) {
            const parts    = id.split('_');
            const authorId = parts[2];
            const targetId = parts[3];
            const count    = parseInt(parts[4] || '0');
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: 'Adiga laguma casuumin.', flags: MessageFlags.Ephemeral });
            }
            checkUser(authorId);
            checkUser(targetId);
            if (userData[authorId].iq < DUEL_STAKE_IQ || userData[targetId].iq < DUEL_STAKE_IQ) {
                return interaction.reply({
                    content:
                        `⚠️ Duel wuxuu u baahan yahay **${DUEL_STAKE_IQ} IQ** dhig ah labadaba.\n` +
                        `<@${authorId}> **${userData[authorId].iq}** | <@${targetId}> **${userData[targetId].iq}**`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            const aBusy = isUserBusy(authorId);
            if (aBusy) return interaction.reply({ content: `Casuumaha mar hore wuxuu ku jiraa ciyaar **${aBusy}**.`, flags: MessageFlags.Ephemeral });
            const tBusy = isUserBusy(targetId);
            if (tBusy) return interaction.reply({ content: `Adigu mar hore waxaad ku jirtaa ciyaar **${tBusy}**.`, flags: MessageFlags.Ephemeral });
            await interaction.update({ content: `⚔️ <@${targetId}> wuu aqbalay! Dagaalku wuu bilaabmayaa...`, embeds: [], components: [] });
            return startDuelGame(interaction.channel, authorId, targetId, count, interaction.message);
        }

        if (id.startsWith('decline_duel_')) {
            const targetId = id.split('_')[3];
            if (interaction.user.id !== targetId) return interaction.reply({ content: 'Adiga laguma casuumin.', flags: MessageFlags.Ephemeral });
            return interaction.update({ content: '❌ Duel waa la diiday.', embeds: [], components: [] });
        }

        // ── Quiz Lobby ──
        if (id.startsWith('quiz_join_')) {
            const channelId = id.replace('quiz_join_', '');
            const state = activeQuiz.get(channelId);
            if (!state || state.started) return interaction.reply({ content: 'Lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            if (state.players.has(interaction.user.id)) return interaction.reply({ content: 'Mar hore ayaad ku jirtaa lobby-ga.', flags: MessageFlags.Ephemeral });
            if (state.players.size >= QUIZ_MAX_PLAYERS) return interaction.reply({ content: 'Lobby-gu wuu buuxsamay.', flags: MessageFlags.Ephemeral });
            const busy = isUserBusy(interaction.user.id);
            if (busy) return interaction.reply({ content: `Waxaad mar hore ku jirtaa ciyaar **${busy}**!`, flags: MessageFlags.Ephemeral });
            state.players.add(interaction.user.id);
            state.scores[interaction.user.id] = 0;
            await interaction.deferUpdate().catch(() => {});
            return refreshQuizLobby(state);
        }

        if (id.startsWith('quiz_leave_')) {
            const channelId = id.replace('quiz_leave_', '');
            const state = activeQuiz.get(channelId);
            if (!state || state.started) return interaction.reply({ content: 'Lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            if (!state.players.has(interaction.user.id)) return interaction.reply({ content: 'Lobby kuma jirtid.', flags: MessageFlags.Ephemeral });
            const wasHost = interaction.user.id === state.hostId;
            state.players.delete(interaction.user.id);
            delete state.scores[interaction.user.id];
            if (state.players.size === 0) {
                if (state.lobbyTimer) clearTimeout(state.lobbyTimer);
                activeQuiz.delete(channelId);
                await interaction.deferUpdate().catch(() => {});
                if (state.message) await state.message.edit({ embeds: [new EmbedBuilder().setTitle('🚪 Lobby waa la xidhay').setDescription('Cidina kuma harin lobby-ga.').setColor('#7f8c8d')], components: [] }).catch(() => {});
                return;
            }
            if (wasHost) {
                state.hostId = [...state.players][0];
                if (state.message?.channel) await state.message.channel.send(`👑 Host cusub: <@${state.hostId}>.`).catch(() => {});
            }
            await interaction.deferUpdate().catch(() => {});
            return refreshQuizLobby(state);
        }

        if (id.startsWith('quiz_start_')) {
            const channelId = id.replace('quiz_start_', '');
            const state = activeQuiz.get(channelId);
            if (!state || state.started) return interaction.reply({ content: 'Lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            if (interaction.user.id !== state.hostId) return interaction.reply({ content: 'Kaliya hostku ayaa bilaabi kara.', flags: MessageFlags.Ephemeral });
            if (state.players.size < QUIZ_MIN_PLAYERS) return interaction.reply({ content: `Ugu yaraan ${QUIZ_MIN_PLAYERS} qof. Hadda: ${state.players.size}`, flags: MessageFlags.Ephemeral });
            await interaction.deferUpdate().catch(() => {});
            if (state.message) await state.message.edit({ embeds: [new EmbedBuilder().setTitle('✅ Lobby waa la xidhay').setDescription(`Quiz wuxuu ku bilaabmayaa **${state.players.size}** qof.`).setColor('#2ecc71')], components: [] }).catch(() => {});
            return beginQuizGame(state);
        }

        if (id === 'quiz_pts_xp' || id === 'quiz_pts_iq') {
            const mode = id === 'quiz_pts_xp' ? 'xp' : 'iq';
            const { text } = exchangeQuizPoints(interaction.user.id, mode);
            return interaction.reply({ content: text, flags: MessageFlags.Ephemeral });
        }

    });
};
