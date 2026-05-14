const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ROWS = 6;
const COLS = 7;
const CELL = ['⭕', '🔴', '🟡'];
const SYM  = ['🔴', '🟡'];

const activeC4 = new Map(); // gameId → state

function genId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function newBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function renderBoard(board) {
    return '1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣\n' +
        board.map(r => r.map(c => CELL[c]).join(' ')).join('\n');
}

function drop(board, col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === 0) { board[r][col] = player; return true; }
    }
    return false;
}

function hasWon(board, p) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== p) continue;
            for (const [dr, dc] of dirs) {
                let n = 1, nr = r+dr, nc = c+dc;
                while (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===p) { n++; nr+=dr; nc+=dc; }
                if (n >= 4) return true;
            }
        }
    }
    return false;
}

function isFull(board) {
    return board[0].every(c => c !== 0);
}

function buildEmbed(state, headline) {
    const { board, players, turn } = state;
    const text = headline || `${SYM[turn]} **<@${players[turn]}>** — turn-kaagu yahay!`;
    return new EmbedBuilder()
        .setTitle('🔴🟡 4 in a Row — Garaad Games')
        .setColor(turn === 0 ? '#e74c3c' : '#f1c40f')
        .setDescription(text + '\n\n' + renderBoard(board))
        .setFooter({ text: 'Garaad Games • 4 in a Row' });
}

function colRows(gameId, turn, board) {
    const style = turn === 0 ? ButtonStyle.Danger : ButtonStyle.Primary;
    const row1  = new ActionRowBuilder();
    const row2  = new ActionRowBuilder();
    for (let c = 0; c < 5; c++) {
        row1.addComponents(new ButtonBuilder()
            .setCustomId(`c4_col_${c}_${gameId}`)
            .setLabel(`${c + 1}`)
            .setStyle(style)
            .setDisabled(board[0][c] !== 0));
    }
    for (let c = 5; c < COLS; c++) {
        row2.addComponents(new ButtonBuilder()
            .setCustomId(`c4_col_${c}_${gameId}`)
            .setLabel(`${c + 1}`)
            .setStyle(style)
            .setDisabled(board[0][c] !== 0));
    }
    row2.addComponents(new ButtonBuilder()
        .setCustomId(`c4_resign_${gameId}`)
        .setLabel('🏳️ Iska Dhiib')
        .setStyle(ButtonStyle.Secondary));
    return [row1, row2];
}

module.exports = {
    activeC4,
    buildEmbed,
    colRows,
    drop,
    hasWon,
    isFull,
    newBoard,
    genId,

    async cmdChallenge(message) {
        const target = message.mentions.users.first();
        if (!target || target.bot || target.id === message.author.id) {
            return message.reply('⚠️ Isticmaal: **`?4inrow @qof`** — qof ciyaar la ciyaar.');
        }
        const cId    = message.author.id;
        const tId    = target.id;
        const gameId = genId();

        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🔴🟡 4 in a Row — Casuumad')
                .setColor('#3498db')
                .setDescription(
                    `🔴 <@${cId}> wuxuu ku casuumayaa 🟡 <@${tId}> ciyaarta **4 in a Row!**\n\n` +
                    `<@${tId}> — aqbal mise diid?`
                )
                .setFooter({ text: 'Garaad Games • 4 in a Row' }),
        ], components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`c4_accept_${cId}_${tId}_${gameId}`)
                    .setLabel('✅ Aqbal')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`c4_decline_${cId}_${tId}`)
                    .setLabel('❌ Diid')
                    .setStyle(ButtonStyle.Danger),
            ),
        ]});
    },
};
