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
const { buildEduEmbed, buildEcoEmbed, helpRow } = require('../commands/help');

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

module.exports = function setupInteractionHandler(client) {
    client.on('interactionCreate', async (interaction) => {

        // ── Modal Submit: IQ dhigo / IQ la bax ──
        if (interaction.isModalSubmit()) {
            const { iqRow, balanceEmbed } = require('../commands/bank');
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
                const { ASSET_LABELS, closeRow } = require('../commands/economy/give');
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
                    return interaction.reply({ content: `⚠️ **Maalineed ${GIVE_DAILY_LIMIT.toLocaleString()} BTC xad** — hadhay: **${remaining.toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
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
                const { closeRow } = require('../commands/economy/ebank');
                checkEconUser(ownerId);
                const d         = eData[ownerId];
                const bankLabel = bank.charAt(0).toUpperCase() + bank.slice(1);

                if (action === 'deposit') {
                    if ((d.btc || 0) < amount) {
                        return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
                    }
                    d.btc         = (d.btc || 0) - amount;
                    d.banks[bank] += amount;
                    saveEcon();
                    return interaction.update({ embeds: [
                        new EmbedBuilder()
                            .setTitle(`🏦 ${bankLabel} Bank — Lacag la Dhigay`)
                            .setColor('#2ecc71')
                            .setDescription(
                                `✅ **${amount.toLocaleString()} BTC** dhigatay\n\n` +
                                `🏦 ${bankLabel}: **${d.banks[bank].toLocaleString()} BTC**\n` +
                                `₿ BTC: **${(d.btc || 0).toLocaleString()} BTC**`
                            )
                            .setFooter({ text: 'Garaad Economy' }),
                    ], components: [closeRow(ownerId)] });
                } else {
                    if (d.banks[bank] < amount) {
                        return interaction.reply({ content: `⚠️ ${bankLabel} lacag ku filan ma lahan. Haysataa: **${d.banks[bank].toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
                    }
                    d.banks[bank] -= amount;
                    d.btc          = (d.btc || 0) + amount;
                    saveEcon();
                    return interaction.update({ embeds: [
                        new EmbedBuilder()
                            .setTitle(`🏦 ${bankLabel} Bank — Lacag la Bixiyay`)
                            .setColor('#2ecc71')
                            .setDescription(
                                `✅ **${amount.toLocaleString()} BTC** la bixiyay\n\n` +
                                `🏦 ${bankLabel}: **${d.banks[bank].toLocaleString()} BTC**\n` +
                                `₿ BTC: **${(d.btc || 0).toLocaleString()} BTC**`
                            )
                            .setFooter({ text: 'Garaad Economy' }),
                    ], components: [closeRow(ownerId)] });
                }
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
                const { ASSET_LABELS, closeRow } = require('../commands/economy/cashflip');
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

                const { WIN_MULTI } = require('../commands/economy/cashflip');
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
                const { buildConfirmEmbed, confirmRow }   = require('../commands/economy/trade');
                checkEconUser(ownerId);
                const d     = eData[ownerId];
                const price = getPrice(asset);

                return interaction.reply({
                    embeds:     [buildConfirmEmbed(asset, amount, price, d)],
                    components: [confirmRow(asset, amount, price, ownerId)],
                });
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
                return interaction.reply({ content: `✅ **${users.length} qof** aqoon dib loo dejiyay — IQ, darajo, stats eber.`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Aqoon modal: Champion ──
            if (interaction.customId.startsWith('admin_aq_m_champion_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const action   = interaction.fields.getTextInputValue('action').trim().toLowerCase();
                if (action === 'give') {
                    const giveChampion = require('../commands/admin/adminGiveChampion');
                    const fakeMsg = { author: interaction.user, mentions: { users: { first: () => ({ id: targetId }) } }, reply: (p) => interaction.reply({ ...p, flags: MessageFlags.Ephemeral }) };
                    return giveChampion(fakeMsg, []);
                } else if (action === 'remove') {
                    const removeChampion = require('../commands/admin/adminRemoveChampion');
                    const fakeMsg = { author: interaction.user, mentions: { users: { first: () => ({ id: targetId }) } }, reply: (p) => interaction.reply({ ...p, flags: MessageFlags.Ephemeral }) };
                    return removeChampion(fakeMsg, []);
                }
                return interaction.reply({ content: '⚠️ Ficilka: `give` ama `remove`', flags: MessageFlags.Ephemeral });
            }

            // ── Admin Aqoon modal: Reset ──
            if (interaction.customId.startsWith('admin_aq_m_reset_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const reset    = require('../commands/admin/adminReset');
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
                return interaction.reply({ content: `✅ **${amount.toLocaleString()} BTC** waxaad u diray <@${targetId}>. Hadda: **${eData[targetId].btc.toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give Asset ──
            if (interaction.customId.startsWith('admin_eco_m_giveasset_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const asset    = interaction.fields.getTextInputValue('asset').trim().toLowerCase();
                const amount   = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (!['btc', 'gold'].includes(asset)) return interaction.reply({ content: '⚠️ Asset: `btc` ama `gold`', flags: MessageFlags.Ephemeral });
                if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                eData[targetId][asset] = (eData[targetId][asset] || 0) + amount;
                saveEcon();
                const label = asset === 'btc' ? 'BTC' : '🥇 Gold';
                return interaction.reply({ content: `✅ **${amount} ${label}** waxaad u diray <@${targetId}>. Hadda: **${eData[targetId][asset]}**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give Bank ──
            if (interaction.customId.startsWith('admin_eco_m_givebank_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const bank     = interaction.fields.getTextInputValue('bank').trim().toLowerCase();
                const amount   = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (!['mandeeq', 'garaad'].includes(bank)) return interaction.reply({ content: '⚠️ Bank: `mandeeq` ama `garaad`', flags: MessageFlags.Ephemeral });
                if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                eData[targetId].banks[bank] = (eData[targetId].banks[bank] || 0) + amount;
                saveEcon();
                const bankLabel = bank.charAt(0).toUpperCase() + bank.slice(1);
                return interaction.reply({ content: `✅ **${amount.toLocaleString()} BTC** waxaad u dejisay <@${targetId}> — 🏦 ${bankLabel} Bank. Hadda: **${eData[targetId].banks[bank].toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Give Title ──
            if (interaction.customId.startsWith('admin_eco_m_givetitle_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const { ECON_TITLES } = require('../commands/economy/econShop');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                const key      = interaction.fields.getTextInputValue('title_key').trim().toLowerCase();
                const info     = ECON_TITLES[key];
                if (!info) return interaction.reply({ content: `⚠️ Title key la garanwaayo: \`${key}\``, flags: MessageFlags.Ephemeral });
                checkEconUser(targetId);
                const d = eData[targetId];
                if (!d.econTitles.includes(key)) d.econTitles.push(key);
                d.activeEconTitle = key;
                saveEcon();
                return interaction.reply({ content: `✅ <@${targetId}> waxaa la siiyay: **${info.label}** _(hadda firfircoon)_`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Reset ──
            if (interaction.customId.startsWith('admin_eco_m_reset_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
                const targetId = interaction.fields.getTextInputValue('target_id').trim();
                checkEconUser(targetId);
                const d = eData[targetId];
                d.banks = { mandeeq: 0, garaad: 0 };
                d.inventory = { safety: 0, robticket: 0 };
                d.loan = null; d.econTitles = []; d.activeEconTitle = null; d.customEconTitle = null;
                saveEcon();
                return interaction.reply({ content: `🗑️ <@${targetId}> economy data dib loo dejiyay.`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Treasury ──
            if (interaction.customId.startsWith('admin_eco_m_treasury_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const action = interaction.fields.getTextInputValue('action').trim().toLowerCase();
                const { econData: eData, checkEconUser, saveEcon, getTreasury, deductFromTreasury } = require('../economy/econStore');
                const t = getTreasury();

                if (action === 'distribute' || action === 'qaybso') {
                    const amount = parseFloat(interaction.fields.getTextInputValue('amount'));
                    if (isNaN(amount) || amount <= 0)
                        return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                    const users = Object.keys(eData).filter(k => !k.startsWith('__'));
                    const perUser = Math.floor(amount / users.length);
                    if (perUser < 1)
                        return interaction.reply({ content: '⚠️ Xaddadka aad yar — dadku aad baa u badan.', flags: MessageFlags.Ephemeral });
                    if (!deductFromTreasury(amount))
                        return interaction.reply({ content: `⚠️ Khaznadda ma filna. Hadda: **${fmt((t.balance || 0))} BTC**`, flags: MessageFlags.Ephemeral });
                    for (const uid of users) { checkEconUser(uid); eData[uid].btc = (eData[uid].btc || 0) + perUser; }
                    saveEcon();
                    return interaction.reply({ content: `✅ **${perUser.toLocaleString()} BTC** waxaa la siiyay **${users.length}** qof.\n🏛️ Khaznad hadhay: **${fmt((t.balance || 0))} BTC**`, flags: MessageFlags.Ephemeral });
                }

                if (action === 'give' || action === 'sii') {
                    const targetId = interaction.fields.getTextInputValue('amount').trim().split(/\s+/)[0];
                    const amount   = parseFloat(interaction.fields.getTextInputValue('amount').trim().split(/\s+/)[1]);
                    if (!targetId || isNaN(amount) || amount <= 0)
                        return interaction.reply({ content: '⚠️ `give @userID xad` qaab isticmaal.', flags: MessageFlags.Ephemeral });
                    if (!deductFromTreasury(amount))
                        return interaction.reply({ content: `⚠️ Khaznadda ma filna. Hadda: **${fmt((t.balance || 0))} BTC**`, flags: MessageFlags.Ephemeral });
                    checkEconUser(targetId);
                    eData[targetId].btc = (eData[targetId].btc || 0) + amount;
                    saveEcon();
                    return interaction.reply({ content: `✅ Khaznadda **${amount.toLocaleString()} BTC** waxaa laga siiyay <@${targetId}>.\n🏛️ Khaznad hadhay: **${fmt((t.balance || 0))} BTC**`, flags: MessageFlags.Ephemeral });
                }

                // view
                return interaction.reply({
                    content: `🏛️ **Khaznadda:**\n💰 Hadda: **${fmt((t.balance || 0))} BTC**\n📥 Wadarta soo gashay: **${fmt((t.totalIn || 0))} BTC**\n📤 La qaybiyay: **${fmt(((t.totalIn || 0) - (t.balance || 0)))} BTC**`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            // ── Admin Econ modal: Top-up Treasury ──
            if (interaction.customId.startsWith('admin_eco_m_topup_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const amount = parseFloat(interaction.fields.getTextInputValue('amount'));
                if (isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli.', flags: MessageFlags.Ephemeral });
                const { topUpTreasury, getTreasury, saveEcon } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                topUpTreasury(amount);
                saveEcon();
                const t = getTreasury();
                return interaction.reply({ content: `✅ **${amount.toLocaleString()} BTC** khaznadda lagu daray.\n🏛️ Hadda: **${t.balance.toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
            }

            // ── Admin Econ modal: Reset All ──
            if (interaction.customId.startsWith('admin_eco_m_resetall_')) {
                if (!require('../utils/admin').isAdmin(interaction.user.id))
                    return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
                const confirm = interaction.fields.getTextInputValue('confirm').trim().toUpperCase();
                if (confirm !== 'RESET')
                    return interaction.reply({ content: '⚠️ "RESET" ayaad qori lahayd. La joojiyay.', flags: MessageFlags.Ephemeral });
                const { econData: eData, saveEcon } = require('../economy/econStore');
                const { fmt } = require('../utils/helpers');
                const users = Object.keys(eData).filter(k => !k.startsWith('__'));
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
                return interaction.reply({ content: `✅ **${users.length} qof** economy dib loo dejiyay.\n₿ Qof walba: **${(5000).toLocaleString()} BTC** | Deyn, bank, assets — eber.`, flags: MessageFlags.Ephemeral });
            }

            // (eco_dnmod_ and eco_dnpay_ removed — deen is now button-only, no modals)

            // ── Shop: Custom name title modal ──
            if (interaction.customId.startsWith('eco_shop_custom_mod_')) {
                const ownerId = interaction.customId.replace('eco_shop_custom_mod_', '');
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
                const { SHOP_ITEMS } = require('../commands/economy/econShop');
                checkEconUser(ownerId);
                const d    = eData[ownerId];
                const item = SHOP_ITEMS['custom'];
                const name = interaction.fields.getTextInputValue('custom_title_name').trim();

                if (!name || name.length < 2)
                    return interaction.reply({ content: '⚠️ Magaca aad gaaban yahay — ugu yaraan 2 xaraf.', flags: MessageFlags.Ephemeral });
                if ((d.btc || 0) < item.price)
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Qiimaha: **${item.price.toLocaleString()} BTC** | Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });

                d.btc = (d.btc || 0) - item.price;
                d.customEconTitle ??= null;
                d.customEconTitle  = name;
                if (!d.econTitles.includes('custom')) d.econTitles.push('custom');
                d.activeEconTitle = 'custom';
                addToTreasury(item.price);
                saveEcon();
                return interaction.reply({ content: `✅ Custom title la sameeay: **${name}** ✍️\nTitle-kaagu hadda wuu firfircoon yahay! **${item.price.toLocaleString()} BTC** la bixiyay.`, flags: MessageFlags.Ephemeral });
            }

            // ── Prediction: USD amount modal ──
            if (interaction.customId.startsWith('pred_amt_usd_')) {
                const ownerId = interaction.customId.replace('pred_amt_usd_', '');
                if (interaction.user.id !== ownerId)
                    return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });

                const { setPending, getPending }  = require('../economy/prediction');
                const {
                    buildTimeEmbed, timeRow, backRow,
                } = require('../commands/economy/trade');

                const raw    = interaction.fields.getTextInputValue('pred_amount');
                const amount = parseFloat(raw);
                if (!amount || isNaN(amount) || amount <= 0)
                    return interaction.reply({ content: '⚠️ Xaddad sax ah geli (tusaale: 500).', flags: MessageFlags.Ephemeral });

                const { econData: eData, checkEconUser } = require('../economy/econStore');
                checkEconUser(ownerId);
                if ((eData[ownerId].btc || 0) < amount)
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Haysataa: **${(eData[ownerId].btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });

                setPending(ownerId, { stakeType: 'btc', stakeAmount: amount, stakeUsd: amount });
                const newPend = getPending(ownerId);
                return interaction.update({
                    embeds:     [buildTimeEmbed(newPend.asset, 'usd', amount, amount)],
                    components: [timeRow(ownerId), backRow(ownerId)],
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
                } = require('../commands/economy/trade');
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
                                `₿ Lacag heshay: **+${sfmt(btcGain)} BTC** (@ ${sfmt(price)} BTC)\n` +
                                `₿ BTC-kaaga hadda: **${sfmt(d.btc)} BTC**\n` +
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
                const { buildShopEmbed, shopRow, shopBackRow }      = require('../commands/economy/trade');
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
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\n💸 Kharash: **${actualCost.toLocaleString()} BTC** | Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
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
                                `💸 Kharash: **${actualCost.toLocaleString()} BTC**\n` +
                                `₿ BTC-kaaga hadda: **${(d.btc || 0).toLocaleString()} BTC**\n` +
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

        // ── Admin tab: Aqoon ──
        if (id.startsWith('admin_aqoon_')) {
            const ownerId = id.replace('admin_aqoon_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { buildAdminAqoonEmbed: bae, adminAqoonMainRow, adminAqoonMidRow, adminAqoonFooterRow } = require('../commands/admin/adminHelpPanel');
            return interaction.update({ embeds: [bae()], components: [adminAqoonMainRow(ownerId), adminAqoonMidRow(ownerId), adminAqoonFooterRow(ownerId)] });
        }

        // ── Admin tab: Economy (tab button only — exact prefix admin_eco_ + uid) ──
        if (id.startsWith('admin_eco_') && !id.startsWith('admin_eco_give') && !id.startsWith('admin_eco_reset') && !id.startsWith('admin_eco_m_') && !id.startsWith('admin_eco_allplayers_') && !id.startsWith('admin_eco_loans_') && !id.startsWith('admin_eco_topup_') && !id.startsWith('admin_eco_treasury_') && !id.startsWith('admin_eco_resetall_')) {
            const ownerId = id.replace('admin_eco_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { buildAdminEconEmbed, adminEcoMainRow, adminEcoMidRow, adminEcoFooterRow, adminEcoCloseRow } = require('../commands/admin/adminEconPanel');
            return interaction.update({ embeds: [buildAdminEconEmbed()], components: [adminEcoMainRow(ownerId), adminEcoMidRow(ownerId), adminEcoFooterRow(ownerId), adminEcoCloseRow(ownerId)] });
        }

        // ── Admin Aqoon: Give IQ button → modal ──
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

        // ── Admin Aqoon: Reset button → modal ──
        if (id.startsWith('admin_aq_reset_')) {
            const ownerId = id.replace('admin_aq_reset_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`admin_aq_m_reset_${ownerId}`).setTitle('🗑️ Reset Aqoon');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setPlaceholder('123456789012345678').setRequired(true)),
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
            const { buildAllPlayersEmbed, adminEcoMainRow, adminEcoMidRow, adminEcoFooterRow, adminEcoCloseRow } = require('../commands/admin/adminEconPanel');
            return interaction.update({ embeds: [buildAllPlayersEmbed(0)], components: [adminEcoMainRow(ownerId), adminEcoMidRow(ownerId), adminEcoFooterRow(ownerId), adminEcoCloseRow(ownerId)] });
        }

        // ── Admin Econ: Loans button ──
        if (id.startsWith('admin_eco_loans_')) {
            const ownerId = id.replace('admin_eco_loans_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { econData: eData } = require('../economy/econStore');
            const { fmt } = require('../utils/helpers');
            const loans = Object.entries(eData)
                .filter(([k, d]) => !k.startsWith('__') && d.loan?.owed > 0)
                .map(([uid, d]) => {
                    const days = Math.floor((Date.now() - d.loan.takenAt) / 86400000);
                    const left = Math.max(0, 3 - days);
                    return `${left === 0 ? '🔴' : '💳'} <@${uid}> — **${d.loan.owed.toLocaleString()} BTC** | ${left === 0 ? '**OVERDUE**' : `${left}d`}`;
                });
            const { adminEcoMainRow, adminEcoMidRow, adminEcoFooterRow, adminEcoCloseRow } = require('../commands/admin/adminEconPanel');
            const loansEmbed = new EmbedBuilder()
                .setTitle(`💳 Deynta (${loans.length})`)
                .setColor('#e74c3c')
                .setDescription(loans.join('\n') || '_Cidna deen kuma jirto._')
                .setFooter({ text: 'Garaad Admin' });
            return interaction.update({ embeds: [loansEmbed], components: [adminEcoMainRow(ownerId), adminEcoMidRow(ownerId), adminEcoFooterRow(ownerId), adminEcoCloseRow(ownerId)] });
        }

        // ── Admin Econ: Top-up Treasury button → modal ──
        if (id.startsWith('admin_eco_topup_')) {
            const ownerId = id.replace('admin_eco_topup_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            if (!require('../utils/admin').isAdmin(ownerId))
                return interaction.reply({ content: '⛔ Admin maahan.', flags: MessageFlags.Ephemeral });
            const { getTreasury } = require('../economy/econStore');
            const t = getTreasury();
            const modal = new ModalBuilder().setCustomId(`admin_eco_m_topup_${ownerId}`).setTitle('🏛️ Treasury Top-up');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('amount').setLabel('Xaddad ku dar khaznadda').setStyle(TextInputStyle.Short)
                        .setPlaceholder(`Hadda: ${fmt((t.balance || 0))} BTC`).setRequired(true)
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
                    new TextInputBuilder().setCustomId('confirm').setLabel('Xaqiiji: qor "RESET" si aad u xaqiijiso').setStyle(TextInputStyle.Short).setPlaceholder('RESET').setRequired(true)
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
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('asset').setLabel('Asset (btc ama gold)').setStyle(TextInputStyle.Short).setPlaceholder('btc').setRequired(true)),
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
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bank').setLabel('Bank (mandeeq ama garaad)').setStyle(TextInputStyle.Short).setPlaceholder('mandeeq').setRequired(true)),
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
                    new TextInputBuilder().setCustomId('amount').setLabel('Xaddad (distribute) ama "UserID xad" (give)').setStyle(TextInputStyle.Short).setPlaceholder(`Khaznad hadda: ${fmt((t.balance || 0))} BTC`).setRequired(false)
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
            const { buildJeebEmbed, jeebRow } = require('../commands/economy/jeeb');
            const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
            const username   = targetUser ? targetUser.username : targetId;
            return interaction.update({ embeds: [buildJeebEmbed(targetId, username)], components: [jeebRow(authorId, targetId)] });
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

            const { claimVote, hasPendingVote } = require('../economy/voteStore');
            const { econData: eData, checkEconUser, saveEcon } = require('../economy/econStore');
            const { userData: uData, saveData }  = require('../store');
            const { checkUser }                  = require('../utils/helpers');
            const { fmt }                        = require('../utils/helpers');

            if (!hasPendingVote(userId))
                return interaction.reply({ content: '⚠️ Vote reward ma jirto — marka hore codeey.', flags: MessageFlags.Ephemeral });

            checkUser(userId);
            checkEconUser(userId);
            claimVote(userId);

            const IQ_GAIN  = 12;
            const AMT      = 250;
            uData[userId].iq = (uData[userId].iq || 0) + IQ_GAIN;
            eData[userId][asset] = (eData[userId][asset] || 0) + AMT;
            saveData();
            saveEcon();

            const icon  = asset === 'gold' ? '🥇' : '₿';
            const label = asset === 'gold' ? 'Gold' : 'BTC';
            return interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Vote Abaalmarinta — Waxaad Heshay!')
                    .setColor('#2ecc71')
                    .setDescription(
                        `🧠 **+${IQ_GAIN} IQ**\n` +
                        `${icon} **+${fmt(AMT)} ${label}**\n\n` +
                        `24 saacadood ka dib mar kale codeey!`
                    )
                    .setFooter({ text: 'Garaad Bot — Mahadsanid vote-gaaga!' })],
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
        if (id.startsWith('trade_accept_')) {
            const ownerId = id.replace('trade_accept_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../commands/economy/trade');
            checkEconUser(ownerId);
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId), tradeCloseRow(ownerId)],
            });
        }

        // ── Prediction: Refresh market ──
        if (id.startsWith('pred_refresh_')) {
            const ownerId = id.replace('pred_refresh_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { getActivePrediction }            = require('../economy/prediction');
            const { buildMarketEmbed, buildActiveEmbed, mainRow, tradeCloseRow, controlRow } = require('../commands/economy/trade');
            checkEconUser(ownerId);
            const active = getActivePrediction(ownerId);
            if (active) {
                return interaction.update({ embeds: [buildActiveEmbed(active)], components: [controlRow(ownerId)] });
            }
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId), tradeCloseRow(ownerId)],
            });
        }

        // ── Prediction: Back to market ──
        if (id.startsWith('pred_back_')) {
            const ownerId = id.replace('pred_back_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { clearPending }                   = require('../economy/prediction');
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../commands/economy/trade');
            checkEconUser(ownerId);
            clearPending(ownerId);
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId), tradeCloseRow(ownerId)],
            });
        }

        // ── Prediction: Cancel prediction setup ──
        if (id.startsWith('pred_cancel_')) {
            const ownerId = id.replace('pred_cancel_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { econData: eData, checkEconUser } = require('../economy/econStore');
            const { clearPending }                   = require('../economy/prediction');
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../commands/economy/trade');
            checkEconUser(ownerId);
            clearPending(ownerId);
            return interaction.update({
                embeds:     [buildMarketEmbed(eData[ownerId])],
                components: [mainRow(ownerId), tradeCloseRow(ownerId)],
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

        // ── Prediction: Time selected → direction buttons ──
        if (/^pred_t_\d+_/.test(id)) {
            const parts   = id.split('_');
            const ownerId = parts[parts.length - 1];
            const minutes = parseInt(parts[2]);
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { setPending, getPending }         = require('../economy/prediction');
            const { buildDirectionEmbed, directionRow } = require('../commands/economy/trade');
            setPending(ownerId, { minutes });
            const pend = getPending(ownerId);
            return interaction.update({
                embeds:     [buildDirectionEmbed(pend.asset, pend.stakeType, pend.stakeAmount, pend.stakeUsd, minutes)],
                components: [directionRow(ownerId)],
            });
        }

        // ── Prediction: Direction selected → confirm ──
        if (id.startsWith('pred_d_up_') || id.startsWith('pred_d_down_')) {
            const isUp    = id.startsWith('pred_d_up_');
            const ownerId = isUp ? id.replace('pred_d_up_', '') : id.replace('pred_d_down_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const dir = isUp ? 'up' : 'down';
            const { setPending, getPending }       = require('../economy/prediction');
            const { buildConfirmEmbed, confirmRow } = require('../commands/economy/trade');
            setPending(ownerId, {
                direction:  dir,
                channelId:  interaction.channelId,
                messageId:  interaction.message.id,
            });
            const pend = getPending(ownerId);
            return interaction.update({
                embeds:     [buildConfirmEmbed(pend.asset, pend.stakeType, pend.stakeAmount, pend.stakeUsd, pend.minutes, dir)],
                components: [confirmRow(ownerId)],
            });
        }

        // ── Prediction: Lock (final confirm) ──
        if (id.startsWith('pred_lock_')) {
            const ownerId = id.replace('pred_lock_', '');
            if (interaction.user.id !== ownerId)
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            const { lockPrediction, getActivePrediction } = require('../economy/prediction');
            const { buildActiveEmbed, controlRow }        = require('../commands/economy/trade');
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
            const { buildSellEmbed, sellRow } = require('../commands/economy/trade');
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
                    .setLabel(`Xaddad (Qiimaha: ${price?.toLocaleString()} BTC | Haysataa: ${bal})`)
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
            const { buildShopEmbed, shopRow } = require('../commands/economy/trade');
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
                    .setLabel(`Tirada (Qiimaha: ${price?.toLocaleString()} BTC/unit | Max: ${maxUnits})`)
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
            const { ASSET_LABELS } = require('../commands/economy/give');
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
            } = require('../commands/economy/ebank');
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
            const label     = isDeposit ? `Dhig (Max: ${maxAmt.toLocaleString()} BTC)` : `Bax (Max: ${maxAmt.toLocaleString()} BTC)`;

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

        // ── Cashflip: Asset button → amount modal ──
        if (id.startsWith('eco_cf_')) {
            const rest    = id.replace('eco_cf_', '');
            const lastUnd = rest.lastIndexOf('_');
            const asset   = rest.substring(0, lastUnd);
            const ownerId = rest.substring(lastUnd + 1);

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            const { ASSET_LABELS } = require('../commands/economy/cashflip');
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
            const { buildDeenEmbed, deenRow, isBankOpen, usedWeeklyLoan, LOAN_MAX, LOAN_OWED } = require('../commands/economy/ebank');
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
                return interaction.reply({ content: `⚠️ Khaznadda lacag ma filan — admin ayaa toddobaadkiiba lacag ku shubaa.\n🏛️ Hadda: **${fmt((getTreasury().balance || 0))} BTC**`, flags: MessageFlags.Ephemeral });
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
            const { buildDeenEmbed, deenRow, LOAN_OWED } = require('../commands/economy/ebank');
            checkEconUser(ownerId);
            const d = eData[ownerId];
            if (!d.loan || d.loan.owed <= 0)
                return interaction.reply({ content: '⚠️ Deen ma jirto.', flags: MessageFlags.Ephemeral });
            if ((d.btc || 0) < d.loan.owed)
                return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nDeentaadu: **${d.loan.owed} BTC** | Haysataa: **${d.btc || 0} BTC**`, flags: MessageFlags.Ephemeral });
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
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../commands/economy/trade');
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
            const { buildMarketEmbed, mainRow, tradeCloseRow } = require('../commands/economy/trade');
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

            const { ASSET_LABEL } = require('../commands/economy/trade');
            const { getPrice }    = require('../economy/market');
            const price           = getPrice(asset);

            const modal = new ModalBuilder()
                .setCustomId(`eco_tmod_${asset}_${ownerId}`)
                .setTitle(`Trade — ${ASSET_LABEL[asset] || asset.toUpperCase()}`);
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('eco_trade_amount')
                    .setLabel(`Xaddadka (Qiimaha: ${price.toLocaleString()} BTC / mid)`)
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
            const { ASSET_LABEL }   = require('../commands/economy/trade');
            checkEconUser(userId);
            const d         = econData[userId];
            const totalCost = Math.round(price * amount);

            let tradeWin = true;
            if (isBuy) {
                if ((d.btc || 0) < totalCost) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid. Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
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
                ? `✅ **${amount} ${asset.toUpperCase()}** iibsatay — **${totalCost.toLocaleString()} BTC**`
                : `❌ Suuqa si xun u guuray — **${totalCost.toLocaleString()} BTC** baad lumisay, asset ma helin.`;

            return interaction.update({ embeds: [
                new EmbedBuilder()
                    .setTitle(isBuy ? buyTitle : `₿ Iibinta — ${ASSET_LABEL[asset] || asset.toUpperCase()}`)
                    .setColor(isBuy ? (tradeWin ? '#2ecc71' : '#e74c3c') : '#3498db')
                    .setDescription(
                        `${isBuy ? buyDesc : `₿ **${amount} ${asset.toUpperCase()}** iibiyay — **${totalCost.toLocaleString()} BTC**`}\n\n` +
                        `**📊 Jeebkaaga Hadda:**\n` +
                        `₿ BTC: **${(d.btc || 0).toLocaleString()} BTC**\n` +
                        `🥇 Gold: **${d.gold}**\n` +
                        `🏦 Banks: **${fmt((d.banks.mandeeq + d.banks.garaad))} BTC**\n\n` +
                        `📊 **Net Worth: ~${fmt(Math.round(net))} BTC**`
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
                        `₿ BTC: **${fmt((d.btc || 0))} BTC**`
                    )
                    .setColor('#2ecc71'),
            ], components: [closeBtn] });
        }

        // ── Economy Shop: Buy title or item via button ──
        if (id.startsWith('eco_shop_')) {
            const key = id.replace('eco_shop_', '');
            const { econData: eData, checkEconUser, saveEcon, addToTreasury } = require('../economy/econStore');
            const { SHOP_ITEMS } = require('../commands/economy/econShop');
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
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nQiimaha: **${item.price.toLocaleString()} BTC** | Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
                }
                d.btc = (d.btc || 0) - item.price;
                d.econTitles.push(key);
                if (!d.activeEconTitle) d.activeEconTitle = key;
                addToTreasury(item.price);
                saveEcon();
                return interaction.reply({ content: `✅ **${item.label}** si guul leh ayaad u iibsatay!\n\`?etitle ${key}\` si aad u dhigto.`, flags: MessageFlags.Ephemeral });
            }

            if (item.type === 'item') {
                if ((d.btc || 0) < item.price) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nQiimaha: **${item.price.toLocaleString()} BTC** | Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
                }
                d.btc = (d.btc || 0) - item.price;
                d.inventory        ??= {};
                d.inventory[key]    = (d.inventory[key] || 0) + 1;
                saveEcon();
                return interaction.reply({ content: `✅ **${item.label}** iibsatay! Jeebkaaga: **${d.inventory[key]}** goor.`, flags: MessageFlags.Ephemeral });
            }

            // Custom name title — show modal
            if (item.type === 'custom') {
                if ((d.btc || 0) < item.price) {
                    return interaction.reply({ content: `⚠️ BTC kugu filna ma lihid.\nQiimaha: **${item.price.toLocaleString()} BTC** | Haysataa: **${(d.btc || 0).toLocaleString()} BTC**`, flags: MessageFlags.Ephemeral });
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
            return startDuelGame(interaction.channel, authorId, targetId, count);
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
