// =====================================================================
// GARAAD BOT - Maareynta Isdhexgalka (Interaction Handler)
// =====================================================================

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleSoloAnswer, handleSoloLeaderboard } = require('../games/solo');
const { startDuelGame }     = require('../games/duel');
const { beginQuizGame, refreshLobby: refreshQuizLobby } = require('../games/quiz');
const { beginRound } = require('../games/tournament');
const { beginBlitzGame, refreshLobby: refreshBlitzLobby } = require('../games/blitz');
const { userData, activeQuiz, activeBlitz, activeTournament, isUserBusy, tournamentRegistry, saveData } = require('../store');
const { checkUser }         = require('../utils/helpers');
const { isAdmin }           = require('../utils/admin');
const { QUIZ_MIN_PLAYERS, QUIZ_MAX_PLAYERS, DUEL_STAKE_IQ, TOURNAMENT_MIN_PLAYERS, TOURNAMENT_R1_QUESTIONS, TOURNAMENT_R2_QUESTIONS, TOURNAMENT_FINAL_QUESTIONS } = require('../config');
const { exchangeQuizPoints } = require('../utils/quizPoints');
const { buildAqoonEmbed, buildDhaqaaleEmbed } = require('../commands/help');
const { buildAdminAqoonEmbed, buildAdminDhaqaaleEmbed } = require('../commands/admin/adminHelpPanel');

// ── Economy Removed reply ────────────────────────────────────────────
function replyEconomyRemoved(interaction) {
    return interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [new EmbedBuilder()
            .setTitle('🚧 Economy Game — Update Ayaa Socda')
            .setColor('#e74c3c')
            .setDescription(
                `Nidaamka dhaqaalaha waa dib u dhisayaa.\n` +
                `**Dhammaan amarrada dhaqaalaha waa joojiyay si ku-meel-gaadh ah.**\n\n` +
                `_Iska sug — economy game cusub ayaa dhici doona! 🚀_`
            )],
    }).catch(() => {});
}

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

const BLITZ_MIN_PLAYERS = 2;
const BLITZ_MAX_PLAYERS = 50;

module.exports = function setupInteractionHandler(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const id = interaction.customId;

        // ── Help tab: Aqoon ──
        if (id.startsWith('help_aqoon_')) {
            const ownerId = id.replace('help_aqoon_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_aqoon_${ownerId}`)
                    .setLabel('🧠 Aqoon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`help_dhaqaale_${ownerId}`)
                    .setLabel('💰 Dhaqaale')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_help_${ownerId}`)
                    .setLabel('Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );
            return interaction.update({ embeds: [buildAqoonEmbed()], components: [row] });
        }

        // ── Help tab: Dhaqaale ──
        if (id.startsWith('help_dhaqaale_')) {
            const ownerId = id.replace('help_dhaqaale_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_aqoon_${ownerId}`)
                    .setLabel('🧠 Aqoon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`help_dhaqaale_${ownerId}`)
                    .setLabel('💰 Dhaqaale')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_help_${ownerId}`)
                    .setLabel('Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );
            return interaction.update({ embeds: [buildDhaqaaleEmbed()], components: [row] });
        }

        // ── Admin tab: Aqoon ──
        if (id.startsWith('admin_aqoon_')) {
            const ownerId = id.replace('admin_aqoon_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_aqoon_${ownerId}`)
                    .setLabel('🧠 Aqoon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`admin_dhaqaale_${ownerId}`)
                    .setLabel('💰 Dhaqaale')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_admin_help_${ownerId}`)
                    .setLabel('Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );
            return interaction.update({ embeds: [buildAdminAqoonEmbed()], components: [row] });
        }

        // ── Admin tab: Dhaqaale ──
        if (id.startsWith('admin_dhaqaale_')) {
            const ownerId = id.replace('admin_dhaqaale_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_aqoon_${ownerId}`)
                    .setLabel('🧠 Aqoon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`admin_dhaqaale_${ownerId}`)
                    .setLabel('💰 Dhaqaale')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_admin_help_${ownerId}`)
                    .setLabel('Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );
            return interaction.update({ embeds: [buildAdminDhaqaaleEmbed()], components: [row] });
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

        // ── Economy Buttons — DHAMI LA SAARAY ──
        if (
            id.startsWith('suuqa_refresh_')   || id.startsWith('suuqa_buy_')     || id.startsWith('suuqa_sell_')    ||
            id.startsWith('tajiriin_refresh_') || id.startsWith('cashflip_again_')|| id.startsWith('kubays_again_')  ||
            id.startsWith('trade_')            || id === 'jeeb_open_trade'
        ) {
            return replyEconomyRemoved(interaction);
        }

        // ── Top toggle ──
        if (id.startsWith('top_toggle_')) {
            const parts   = id.split('_');
            const newMode = parts[2];
            const ownerId = parts[3];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }
            const topCmd = require('../commands/top');
            const fakeMsg = {
                author:   interaction.user,
                mentions: { users: { first: () => null } },
                reply: async (payload) => interaction.update(payload).catch(() => {}),
            };
            return topCmd(fakeMsg, [newMode]);
        }

        // ── Trade Buttons — DHAMI LA SAARAY ──
        if (id.startsWith('trade_') || id === 'jeeb_open_trade') {
            return replyEconomyRemoved(interaction);
        }

        // ── Solo Answer ──
        if (id.startsWith('q_')) return handleSoloAnswer(interaction);

        // ── Solo Leaderboard button (NEW) ──
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

        // ── Tournament Rules button (PUBLIC — anyone can see) ──
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

        // ── Tournament Count button (dadkuba arki karaan — PUBLIC) ──
        if (id === 'tournament_count_admin') {
            const count = tournamentRegistry ? tournamentRegistry.size : 0;

            // Admin: show list; everyone else: show count only
            if (isAdmin(interaction.user.id)) {
                const list = [...(tournamentRegistry?.keys() || [])].slice(0, 25).map((uid, i) => `${i + 1}. <@${uid}>`).join('\n');
                return interaction.reply({
                    content: `👥 **Is-diiwaangashay:** ${count} qof\n\n${list || '_Cidna weli ma diiwaangalin_'}`,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                return interaction.reply({
                    content: `👥 **Is-diiwaangashay:** ${count} qof`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // ── Tournament Register button (from ?tartan) ──
        if (id === 'tournament_register') {
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
                            `2. Channel-ka tartanka tartanka u tag\n` +
                            `3. Qor: \`?gal ${code}\`\n\n` +
                            `⚠️ **Code-kan ha u shegin qof kale — kuu gaarka ah!**`
                        )
                        .setColor('#2ecc71')
                        .setFooter({ text: 'Garaad Quiz Tournament' })],
                });
                return interaction.reply({
                    content: '✅ **Code-gaaga waa laguugu diray DM!** Fur farrimahaaga gaarka ah si aad u aragto.',
                    flags: MessageFlags.Ephemeral,
                });
            } catch {
                return interaction.reply({
                    content: '❌ Ma awoodin inaan kuu dirayo DM. **Fur DM** (Settings → Privacy → Allow DMs from server members) ka dibna isku day mar kale.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // ── Tartan Bilow: Status button (public) ──
        if (id.startsWith('tartan_bilow_status_')) {
            const cid   = id.replace('tartan_bilow_status_', '');
            const state = activeTournament ? activeTournament.get(cid) : null;
            const count = state ? state.players.size : 0;
            return interaction.reply({
                content: `👥 Ka qaybgalayaasha channel-kan: **${count}** qof`,
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }

        // ── Tartan Bilow: Next (admin only) ──
        if (id.startsWith('tartan_bilow_next_')) {
            if (!isAdmin(interaction.user.id)) {
                return interaction.reply({
                    content: '⛔ Kaliya **admin** ayaa bilaabi kara wareegga!',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            const cid   = id.replace('tartan_bilow_next_', '');
            const state = activeTournament ? activeTournament.get(cid) : null;
            if (!state || state.stage !== 'join') {
                return interaction.reply({
                    content: '⚠️ Tartan lama heli karo ama mar hore wuu bilaabmay.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            if (state.players.size < TOURNAMENT_MIN_PLAYERS) {
                return interaction.reply({
                    content: `⚠️ Ugu yaraan **${TOURNAMENT_MIN_PLAYERS}** qof ayaa loo baahan yahay. Hadda: **${state.players.size}**`,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            await interaction.reply({
                content: '▶️ Wareegga 1aad waa la bilaabayaa...',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});

            // Bilow wareegga 1aad
            state.survivors = new Set(state.players);
            state.roundIdx  = 1;
            const tournament = require('../games/tournament');
            // Use a fake message to trigger beginRound via cmdAdminNext-like path
            const fakeMsg = {
                author:  interaction.user,
                channel: interaction.channel,
                reply:   async () => {},
            };
            // Directly manipulate state to trigger beginRound
            // (cmdAdminNext is exported but needs message.channel)
            const { pickQuestionsForGame, noQuestionsLeftEmbed, markSeenForUsersInGame } = require('../utils/questions');
            const { markUserPlayed } = require('../utils/reminders');
            const { getAnswerOptions } = require('../utils/questionOptions');
            const channel = interaction.channel;

            state.channel = channel;
            state.stage   = 'pause'; // Temporarily set to pause so cmdAdminNext works
            state._nextSurvivors = [...state.survivors];
            state.roundIdx = 0; // Will be incremented to 1

            // Call cmdAdminNext via fake message
            return tournament.cmdAdminNext(fakeMsg);
        }

        // ── Tournament Admin Next Button — Wareeg 1/2/3 bilow (admin only) ──
        if (id.startsWith('tournament_admin_next_')) {
            if (!isAdmin(interaction.user.id)) {
                return interaction.reply({
                    content: '⛔ Kaliya **admin** ayaa badhankaan isticmaali kara.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            const cid   = id.replace('tournament_admin_next_', '');
            const state = activeTournament ? activeTournament.get(cid) : null;

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

        // ── Mamul (Admin Panel) buttons ──
        if (id.startsWith('mamul_aqoon_') || id.startsWith('mamul_dhaqaale_') || id.startsWith('close_mamul_')) {
            const { buildMamulAqoonEmbed, buildMamulDhaqaaleEmbed } = require('./admin/mamul');
            const ownerId = id.split('_').pop();
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '⚠️ Farriintaas adiga kuma codsanin.', flags: MessageFlags.Ephemeral });
            }

            if (id.startsWith('close_mamul_')) {
                return interaction.message.delete().catch(() => {});
            }

            const isAqoon = id.startsWith('mamul_aqoon_');
            const embed   = isAqoon ? buildMamulAqoonEmbed() : buildMamulDhaqaaleEmbed();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mamul_aqoon_${ownerId}`)
                    .setLabel('🧠 Aqoon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`mamul_dhaqaale_${ownerId}`)
                    .setLabel('💰 Dhaqaale')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`close_mamul_${ownerId}`)
                    .setLabel('Iska xir')
                    .setStyle(ButtonStyle.Danger),
            );
            return interaction.update({ embeds: [embed], components: [row] });
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
            const { ok, text } = exchangeQuizPoints(interaction.user.id, mode);
            return interaction.reply({ content: text, flags: MessageFlags.Ephemeral });
        }

        // ── Blitz Lobby ──
        if (id.startsWith('blitz_join_')) {
            const channelId = id.replace('blitz_join_', '');
            const state = activeBlitz.get(channelId);
            if (!state || state.started) return interaction.reply({ content: 'Blitz lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            if (state.players.has(interaction.user.id)) return interaction.reply({ content: 'Mar hore ayaad ku jirtaa lobby-ga.', flags: MessageFlags.Ephemeral });
            if (state.players.size >= BLITZ_MAX_PLAYERS) return interaction.reply({ content: 'Lobby-gu wuu buuxsamay.', flags: MessageFlags.Ephemeral });
            const busy = isUserBusy(interaction.user.id);
            if (busy) return interaction.reply({ content: `Waxaad mar hore ku jirtaa ciyaar **${busy}**!`, flags: MessageFlags.Ephemeral });
            state.players.add(interaction.user.id);
            state.scores[interaction.user.id] = 0;
            await interaction.deferUpdate().catch(() => {});
            return refreshBlitzLobby(state);
        }

        if (id.startsWith('blitz_leave_')) {
            const channelId = id.replace('blitz_leave_', '');
            const state = activeBlitz.get(channelId);
            if (!state || state.started) return interaction.reply({ content: 'Blitz lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            if (!state.players.has(interaction.user.id)) return interaction.reply({ content: 'Lobby kuma jirtid.', flags: MessageFlags.Ephemeral });
            const wasHost = interaction.user.id === state.hostId;
            state.players.delete(interaction.user.id);
            delete state.scores[interaction.user.id];
            if (state.players.size === 0) {
                if (state.lobbyTimer) clearTimeout(state.lobbyTimer);
                activeBlitz.delete(channelId);
                await interaction.deferUpdate().catch(() => {});
                if (state.lobbyMsg) await state.lobbyMsg.edit({ embeds: [new EmbedBuilder().setTitle('🚪 Blitz Lobby waa la xidhay').setDescription('Cidina kuma harin.').setColor('#7f8c8d')], components: [] }).catch(() => {});
                return;
            }
            if (wasHost) {
                state.hostId = [...state.players][0];
                if (state.lobbyMsg?.channel) await state.lobbyMsg.channel.send(`👑 Host cusub: <@${state.hostId}>.`).catch(() => {});
            }
            await interaction.deferUpdate().catch(() => {});
            return refreshBlitzLobby(state);
        }

        if (id.startsWith('blitz_start_')) {
            const channelId = id.replace('blitz_start_', '');
            const state = activeBlitz.get(channelId);
            if (!state || state.started) return interaction.reply({ content: 'Blitz lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            if (interaction.user.id !== state.hostId) return interaction.reply({ content: 'Kaliya hostku ayaa bilaabi kara.', flags: MessageFlags.Ephemeral });
            if (state.players.size < BLITZ_MIN_PLAYERS) return interaction.reply({ content: `Ugu yaraan ${BLITZ_MIN_PLAYERS} qof. Hadda: ${state.players.size}`, flags: MessageFlags.Ephemeral });
            await interaction.deferUpdate().catch(() => {});
            if (state.lobbyMsg) await state.lobbyMsg.edit({ embeds: [new EmbedBuilder().setTitle('✅ Blitz Lobby waa la xidhay').setDescription(`Blitz wuxuu ku bilaabmayaa **${state.players.size}** qof.`).setColor('#2ecc71')], components: [] }).catch(() => {});
            return beginBlitzGame(state);
        }

        if (id === 'blitz_pts_xp' || id === 'blitz_pts_iq') {
            const mode = id === 'blitz_pts_xp' ? 'xp' : 'iq';
            const { ok, text } = exchangeQuizPoints(interaction.user.id, mode);
            return interaction.reply({ content: ok ? `⚡ ${text}` : text, flags: MessageFlags.Ephemeral });
        }
    });
};
