// =====================================================================
// GARAAD BOT - Maareynta Isdhexgalka (Interaction Handler)
// =====================================================================

const { MessageFlags }              = require('discord.js');
const { handleSoloAnswer }          = require('../games/solo');
const { startDuelGame }             = require('../games/duel');
const { sendRushQuestion }          = require('../games/rush');
const { beginQuizGame, refreshLobby } = require('../games/quiz');
const { executeTrade, buildTradeEmbed } = require('../games/trade');
const { userData, saveData, activeBets, activeRush, activeTrades, activeQuiz, activeRows, isUserBusy, tournamentRegistry } = require('../store');
const { checkUser, getLevel, addXp } = require('../utils/helpers');
const { QUIZ_MIN_PLAYERS, QUIZ_MAX_PLAYERS } = require('../config');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function renderRowBoard(board) {
    const symbols = { 0: '⚪', 1: '🔴', 2: '🟡' };
    const header = '1️⃣  2️⃣  3️⃣  4️⃣  5️⃣  6️⃣  7️⃣';
    const rows = board.map(row => row.map(cell => symbols[cell]).join('  '));
    return ['```', header, ...rows, '```'].join('\n');
}

function rowButtons(channelId) {
    const topRow = new ActionRowBuilder();
    const bottomRow = new ActionRowBuilder();
    for (let col = 0; col < 7; col++) {
        const button = new ButtonBuilder()
            .setCustomId(`row_col_${channelId}_${col}`)
            .setLabel(`${col + 1}`)
            .setStyle(ButtonStyle.Primary);

        if (col < 4) {
            topRow.addComponents(button);
        } else {
            bottomRow.addComponents(button);
        }
    }
    return [topRow, bottomRow];
}

function getRowPlayerLabel(playerId) {
    return playerId === 'computer' ? 'Computer 🤖' : `<@${playerId}>`;
}

function pickComputerColumn(board) {
    const valid = [];
    for (let col = 0; col < 7; col++) {
        if (board[0][col] === 0) valid.push(col);
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

function checkRowWin(board, row, col, token) {
    const directions = [ [0, 1], [1, 0], [1, 1], [1, -1] ];
    for (const [dr, dc] of directions) {
        let count = 1;
        for (let step = 1; step < 4; step++) {
            const r = row + dr * step;
            const c = col + dc * step;
            if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) break;
            if (board[r][c] !== token) break;
            count++;
        }
        for (let step = 1; step < 4; step++) {
            const r = row - dr * step;
            const c = col - dc * step;
            if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) break;
            if (board[r][c] !== token) break;
            count++;
        }
        if (count >= 4) return true;
    }
    return false;
}

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== 0));
}

module.exports = function setupInteractionHandler(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const id = interaction.customId;

        // ── Xidhitaanka Caawin ────────────────────────────────────────
        if (id.startsWith('close_help_')) {
            const ownerId = id.split('_')[2];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        if (id.startsWith('close_profile_')) {
            const ownerId = id.replace('close_profile_', '');
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        if (id.startsWith('close_admin_help_')) {
            const ownerId = id.slice('close_admin_help_'.length);
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        if (id.startsWith('close_statistics_')) {
            const ownerId = id.slice('close_statistics_'.length);
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        if (id.startsWith('close_shop_')) {
            const ownerId = id.slice('close_shop_'.length);
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        if (id.startsWith('trade_close_')) {
            const ownerId = id.split('_')[2];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.message.delete().catch(() => {});
        }

        if (id.startsWith('trade_password_')) {
            const ownerId = id.split('_')[2];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            return interaction.reply({ content: 'Isticmaal `?password 1234` si aad u dejiso password sir ah oo aad suuqyada u gasho.', flags: MessageFlags.Ephemeral });
        }

        if (id.startsWith('trade_refresh_')) {
            const ownerId = id.split('_')[2];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            const embed = buildTradeEmbed(ownerId);
            return interaction.update({ embeds: [embed], components: interaction.message.components });
        }

        if (id.startsWith('trade_wallet_')) {
            const ownerId = id.split('_')[2];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            const embed = buildTradeEmbed(ownerId);
            await interaction.update({ embeds: [embed], components: interaction.message.components });
            return interaction.followUp({ content: '💼 Jeebkaaga iyo hantidaada waa la cusbooneysiiyay.', flags: MessageFlags.Ephemeral });
        }

        if (id.startsWith('trade_')) {
            const parts = id.split('_');
            const action = parts[1];
            const asset = parts[2];
            const ownerId = parts[3];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Adiga ma lihid.', flags: MessageFlags.Ephemeral });
            }
            const result = executeTrade(ownerId, asset, action);
            if (!result.success) {
                return interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
            }
            const embed = buildTradeEmbed(ownerId);
            await interaction.update({ embeds: [embed], components: interaction.message.components });
            return interaction.followUp({ content: result.message, flags: MessageFlags.Ephemeral });
        }

        // ── Duel: Aqbal ───────────────────────────────────────────────
        if (id.startsWith('accept_duel_')) {
            const parts    = id.split('_');
            const authorId = parts[2];
            const targetId = parts[3];
            const count    = parseInt(parts[4] || '0'); // 0 = bot wuxuu weydiinayaa
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: 'Adiga laguma casuumin.', flags: MessageFlags.Ephemeral });
            }
            // Hubi labadoodaba inaan ciyaar kale ku jirin
            const aBusy = isUserBusy(authorId);
            if (aBusy) {
                return interaction.reply({ content: `Casuumaha mar hore wuxuu ku jiraa ciyaar **${aBusy}**.`, flags: MessageFlags.Ephemeral });
            }
            const tBusy = isUserBusy(targetId);
            if (tBusy) {
                return interaction.reply({ content: `Adigu mar hore waxaad ku jirtaa ciyaar **${tBusy}**.`, flags: MessageFlags.Ephemeral });
            }
            await interaction.update({
                content:    `⚔️ <@${targetId}> wuu aqbalay! Dagaalku wuu bilaabmayaa...`,
                embeds:     [],
                components: [],
            });
            return startDuelGame(interaction.channel, authorId, targetId, count);
        }

        // ── Duel: Diid ────────────────────────────────────────────────
        if (id.startsWith('decline_duel_')) {
            const targetId = id.split('_')[3];
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: 'Adiga laguma casuumin.', flags: MessageFlags.Ephemeral });
            }
            return interaction.update({ content: '❌ Duel waa la diiday.', embeds: [], components: [] });
        }

        // ── Row: Aqbal ────────────────────────────────────────────────
        if (id.startsWith('row_accept_')) {
            const parts = id.split('_');
            const channelId = parts[2];
            const inviterId = parts[3];
            const targetId = parts[4];
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: 'Adiga laguma casuumin.', flags: MessageFlags.Ephemeral });
            }
            const state = activeRows.get(channelId);
            if (!state || state.status !== 'invited' || state.inviterId !== inviterId || state.targetId !== targetId) {
                return interaction.reply({ content: 'Casuumaadkan ma jiro ama waa dhacay.', flags: MessageFlags.Ephemeral });
            }
            const authorBusy = isUserBusy(inviterId);
            const targetBusy = isUserBusy(targetId);
            if (authorBusy || targetBusy) {
                activeRows.delete(channelId);
                return interaction.reply({ content: 'Mid ka mid ah ciyaartoyda hadda ciyaar kale wuu ku jiraa.', flags: MessageFlags.Ephemeral });
            }
            state.status = 'playing';
            state.players = [inviterId, targetId];
            state.currentPlayer = 0;
            state.board = Array.from({ length: 6 }, () => Array(7).fill(0));

            const embed = new EmbedBuilder()
                .setTitle('▶️ ?row — Ciyaarta waa bilaabatay')
                .setDescription(`Ciyaaryahanka hadda jira: <@${state.players[state.currentPlayer]}> (🔴)\n\n` +
                    `🔴 = Player 1   🟡 = Player 2\n` +
                    `Dooro column 1 ilaa 7 adoo gujinaya button-ka hoos.\n\n${renderRowBoard(state.board)}`)
                .setColor('#3498db');

            return interaction.update({ embeds: [embed], components: rowButtons(channelId) });
        }

        // ── Row: Diid ───────────────────────────────────────────────
        if (id.startsWith('row_decline_')) {
            const parts = id.split('_');
            const channelId = parts[2];
            const targetId = parts[4];
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: 'Adiga laguma casuumin.', flags: MessageFlags.Ephemeral });
            }
            activeRows.delete(channelId);
            return interaction.update({ content: '❌ Row-casuumaad waa la diiday.', embeds: [], components: [] });
        }

        // ── Row: Wareegga column-ka ───────────────────────────────────
        if (id.startsWith('row_col_')) {
            const parts = id.split('_');
            const channelId = parts[2];
            const col = parseInt(parts[3], 10);
            const state = activeRows.get(channelId);
            if (!state || state.status !== 'playing') {
                return interaction.reply({ content: 'Ciyaarta ma bilaaban ama ma jiraan xog la heli karo.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.user.id !== state.players[state.currentPlayer]) {
                return interaction.reply({ content: 'Ma ahan wareeggaaga.', flags: MessageFlags.Ephemeral });
            }
            const board = state.board;
            let placed = false;
            let placedRow = -1;
            for (let row = board.length - 1; row >= 0; row--) {
                if (board[row][col] === 0) {
                    board[row][col] = state.currentPlayer + 1;
                    placed = true;
                    placedRow = row;
                    break;
                }
            }
            if (!placed) {
                return interaction.reply({ content: 'Column-kan wuu buuxsami yahay. Dooro column kale.', flags: MessageFlags.Ephemeral });
            }

            const token = state.currentPlayer + 1;
            const boardText = renderRowBoard(board);
            const winner = checkRowWin(board, placedRow, col, token);
            if (winner) {
                const winnerId = state.players[state.currentPlayer];
                if (winnerId !== 'computer') {
                    checkUser(winnerId);
                    addXp(winnerId, 20);
                    saveData();
                }
                const embed = new EmbedBuilder()
                    .setTitle('🏆 ?row — Guuleystay!')
                    .setDescription(`Guuleystay ${getRowPlayerLabel(winnerId)}!\n\n${boardText}`)
                    .setColor('#2ecc71');
                activeRows.delete(channelId);
                return interaction.update({ embeds: [embed], components: [] });
            }
            if (isBoardFull(board)) {
                const embed = new EmbedBuilder()
                    .setTitle('🤝 ?row — Isku dheellitir')
                    .setDescription(`Gool la helin, ciyaarta waa barbaro.\n\n${boardText}`)
                    .setColor('#95a5a6');
                activeRows.delete(channelId);
                return interaction.update({ embeds: [embed], components: [] });
            }

            if (state.isComputer && state.currentPlayer === 0) {
                state.currentPlayer = 1;
                const computerCol = pickComputerColumn(board);
                let computerRow = -1;
                for (let r = board.length - 1; r >= 0; r--) {
                    if (board[r][computerCol] === 0) {
                        board[r][computerCol] = 2;
                        computerRow = r;
                        break;
                    }
                }
                const computerBoard = renderRowBoard(board);
                const computerWinner = checkRowWin(board, computerRow, computerCol, 2);
                if (computerWinner) {
                    const embed = new EmbedBuilder()
                        .setTitle('😵 ?row — Computer guuleystay')
                        .setDescription(`Computer 🤖 ayaa guuleystay!\n\n${computerBoard}`)
                        .setColor('#e74c3c');
                    activeRows.delete(channelId);
                    return interaction.update({ embeds: [embed], components: [] });
                }
                if (isBoardFull(board)) {
                    const embed = new EmbedBuilder()
                        .setTitle('🤝 ?row — Isku dheellitir')
                        .setDescription(`Gool la helin, ciyaarta waa barbaro.\n\n${computerBoard}`)
                        .setColor('#95a5a6');
                    activeRows.delete(channelId);
                    return interaction.update({ embeds: [embed], components: [] });
                }
                state.currentPlayer = 0;
                const embed = new EmbedBuilder()
                    .setTitle('▶️ ?row — Wareeggaaga')
                    .setDescription(`Computer 🤖 ayaa dooray column ${computerCol + 1}.\n\n` +
                        `Ciyaaryahanka hadda jira: ${getRowPlayerLabel(state.players[state.currentPlayer])} (🔴)\n\n` +
                        `🔴 = Player 1   🟡 = Computer\n` +
                        `Dooro column 1 ilaa 7 adoo gujinaya button-ka hoos.\n\n${computerBoard}`)
                    .setColor('#3498db');
                return interaction.update({ embeds: [embed], components: rowButtons(channelId) });
            }

            state.currentPlayer = 1 - state.currentPlayer;
            const embed = new EmbedBuilder()
                .setTitle('▶️ ?row — Wareegga xiga')
                .setDescription(`Ciyaaryahanka hadda jira: ${getRowPlayerLabel(state.players[state.currentPlayer])} (${state.currentPlayer === 0 ? '🔴' : '🟡'})\n\n` +
                    `🔴 = Player 1   🟡 = Player 2\n` +
                    `Dooro column 1 ilaa 7 adoo gujinaya button-ka hoos.\n\n${boardText}`)
                .setColor('#3498db');

            return interaction.update({ embeds: [embed], components: rowButtons(channelId) });
        }

        // ── Solo: Jawaab ──────────────────────────────────────────────
        if (id.startsWith('q_')) {
            return handleSoloAnswer(interaction);
        }

        // ── Tournament: Register ──────────────────────────────────────
        if (id === 'tournament_register') {
            const uid = interaction.user.id;
            const code = genCode();
            tournamentRegistry.set(uid, { code, at: Date.now() });
            try {
                await interaction.user.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('🏁 Tartan — Code-kaaga')
                        .setDescription(
                            `Code-gaaga gaarka ah waa:\n\n# \`${code}\`\n\n` +
                            `Marka admin-ku furo tartanka channel-ka, qor:\n` +
                            `\`?gal ${code}\` **channel-ka tartanka** gudaheeda.`
                        )
                        .setColor('#2ecc71')],
                });
                return interaction.reply({ content: '✅ Code-gaaga waa laguugu diray **DM**. Fur fariimahaaga gaarka ah.', flags: MessageFlags.Ephemeral });
            } catch {
                return interaction.reply({
                    content: '❌ Ma awoodin inaan kuu dirayo DM. **Fur DM** (Settings → Privacy → Allow DMs) ka dibna isku day mar kale.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // ── Bet: Jawaab ───────────────────────────────────────────────
        if (id.startsWith('bet_')) {
            const parts   = id.split('_');
            const ownerId = parts[2];
            const result  = parts[3]; // 't' ama 'f'
            const amount  = parseInt(parts[4]);

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Khamaartaada qoro!', flags: MessageFlags.Ephemeral });
            }

            await interaction.deferUpdate();
            const bet = activeBets.get(ownerId);
            if (!bet) return;

            checkUser(ownerId);
            let resultMsg;
            if (result === 't') {
                // IQ is quiz-only. Bet uses economy cash + XP.
                userData[ownerId].cash ??= Number.isFinite(userData[ownerId].usdBalance) ? userData[ownerId].usdBalance : 0;
                const win = Math.floor(amount * 0.5);
                userData[ownerId].cash += win;
                addXp(ownerId, 10);
                userData[ownerId].stats.betsWon++;
                resultMsg = `✅ SAX! +$${win} cash / +10 XP\nCash-kaaga hadda: **$${(userData[ownerId].cash || 0).toFixed(2)}**`;
            } else {
                userData[ownerId].cash ??= Number.isFinite(userData[ownerId].usdBalance) ? userData[ownerId].usdBalance : 0;
                userData[ownerId].cash = Math.max(0, (userData[ownerId].cash || 0) - amount);
                userData[ownerId].stats.betsLost++;
                resultMsg = `❌ QALAD! −$${amount} cash\nJawaabta saxda: **${bet.correct}**\nCash-kaaga hadda: **$${(userData[ownerId].cash || 0).toFixed(2)}**`;
            }

            activeBets.delete(ownerId);
            saveData();

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields({ name: 'Natiijo', value: resultMsg });

            return interaction.editReply({ embeds: [updatedEmbed], components: [] });
        }

        // ── Rush: Jawaab ──────────────────────────────────────────────
        if (id.startsWith('rush_')) {
            const parts   = id.split('_');
            const ownerId = parts[2];
            const result  = parts[3]; // 't' ama 'f'

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: 'Ciyaartaada qoro!', flags: MessageFlags.Ephemeral });
            }

            // Rush collector-ku wuxuu maareeyaa — interaction-ku waa la isha mariyaa
            return;
        }

        // ── Quiz Koox: Ku biir ────────────────────────────────────────
        if (id.startsWith('quiz_join_')) {
            const channelId = id.replace('quiz_join_', '');
            const state     = activeQuiz.get(channelId);

            if (!state || state.started) {
                return interaction.reply({ content: 'Lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            }
            if (state.players.has(interaction.user.id)) {
                return interaction.reply({ content: 'Mar hore ayaad ku jirtaa lobby-ga.', flags: MessageFlags.Ephemeral });
            }
            // ⭐ Cap sare oo qarsoon (ma xadidna oo dhab ah)
            if (state.players.size >= QUIZ_MAX_PLAYERS) {
                return interaction.reply({ content: 'Lobby-gu wuu buuxsamay.', flags: MessageFlags.Ephemeral });
            }
            const busy = isUserBusy(interaction.user.id);
            if (busy) {
                return interaction.reply({ content: `Waxaad mar hore ku jirtaa ciyaar **${busy}**! Sug ilaa ay dhammaato.`, flags: MessageFlags.Ephemeral });
            }

            state.players.add(interaction.user.id);
            state.scores[interaction.user.id] = 0;
            await interaction.deferUpdate().catch(() => {});
            // ⭐ Hadda hostka kaliya ayaa bilaabaya — ma jiro auto-start
            return refreshLobby(state);
        }

        // ── Quiz Koox: Ka bax ─────────────────────────────────────────
        // ⭐ Hadda hostka waa ka bixi karaa — host cusub waa qofka xiga
        if (id.startsWith('quiz_leave_')) {
            const channelId = id.replace('quiz_leave_', '');
            const state     = activeQuiz.get(channelId);

            if (!state || state.started) {
                return interaction.reply({ content: 'Lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            }
            if (!state.players.has(interaction.user.id)) {
                return interaction.reply({ content: 'Lobby kuma jirtid.', flags: MessageFlags.Ephemeral });
            }

            const wasHost = interaction.user.id === state.hostId;
            state.players.delete(interaction.user.id);
            delete state.scores[interaction.user.id];

            // Lobby waa la xidhayaa haddii cidina hadhin
            if (state.players.size === 0) {
                if (state.lobbyTimer) clearTimeout(state.lobbyTimer);
                activeQuiz.delete(channelId);
                await interaction.deferUpdate().catch(() => {});
                if (state.message) {
                    await state.message.edit({
                        embeds: [new EmbedBuilder()
                            .setTitle('🚪 Lobby waa la xidhay')
                            .setDescription('Cidina kuma harin lobby-ga.')
                            .setColor('#7f8c8d')],
                        components: [],
                    }).catch(() => {});
                }
                return;
            }

            // ⭐ Wareeji hostnimada haddii hostkii ka baxay
            let hostTransferMsg = null;
            if (wasHost) {
                state.hostId = [...state.players][0];
                hostTransferMsg = `👑 Hostkii hore wuu ka baxay — host cusub waa <@${state.hostId}>.`;
            }

            await interaction.deferUpdate().catch(() => {});
            await refreshLobby(state);

            if (hostTransferMsg && state.message?.channel) {
                await state.message.channel.send(hostTransferMsg).catch(() => {});
            }
            return;
        }

        // ── Quiz Koox: Bilaw ──────────────────────────────────────────
        if (id.startsWith('quiz_start_')) {
            const channelId = id.replace('quiz_start_', '');
            const state     = activeQuiz.get(channelId);

            if (!state || state.started) {
                return interaction.reply({ content: 'Lobby ma jiro ama wuu bilaabmay.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.user.id !== state.hostId) {
                return interaction.reply({ content: 'Kaliya hostku ayaa bilaabi kara.', flags: MessageFlags.Ephemeral });
            }
            if (state.players.size < QUIZ_MIN_PLAYERS) {
                return interaction.reply({ content: `Ugu yaraan ${QUIZ_MIN_PLAYERS} qof ayaa loo baahan yahay. Hadda: ${state.players.size}`, flags: MessageFlags.Ephemeral });
            }

            await interaction.deferUpdate().catch(() => {});
            if (state.message) {
                await state.message.edit({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Lobby waa la xidhay')
                        .setDescription(`Quiz wuxuu ku bilaabmayaa **${state.players.size}** qof.`)
                        .setColor('#2ecc71')],
                    components: [],
                }).catch(() => {});
            }
            return beginQuizGame(state);
        }

        // ── Quiz Koox: Butonka su'aasha ───────────────────────────────
        // (quiz_a_ prefix — collector-ku wuxuu maareeyaa)

        // ── Tuur (Dice Duel): Aqbal / Diid ───────────────────────────
        if (id.startsWith('tuur_accept_') || id.startsWith('tuur_decline_')) {
            const { handleTuurInteraction, activeTuurChallenges } = require('../commands/tuur');
            return handleTuurInteraction(interaction, activeTuurChallenges);
        }
    });
};
