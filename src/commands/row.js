// =====================================================================
// AMARKA: ?row @user ama ?row computer
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { activeRows, isUserBusy } = require('../store');
const { PREFIX } = require('../config');

const COMPUTER_ALIASES = ['computer', 'bot'];

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
        if (col < 4) topRow.addComponents(button);
        else bottomRow.addComponents(button);
    }
    return [topRow, bottomRow];
}

module.exports = async function rowCommand(message, args) {
    const author = message.author;
    const target = message.mentions.users.first();
    const isComputer = args[0] && COMPUTER_ALIASES.includes(args[0].toLowerCase());
    const channelId = message.channel.id;

    if (!target && !isComputer) {
        return message.reply(`Fadlan tilmaam adeegsiga: \`${PREFIX}row @user\` ama \`${PREFIX}row computer\`.`);
    }

    if (!isComputer && target.id === author.id) {
        return message.reply('Waxaad iskaa isku casuumi karin. Dooro user kale.');
    }

    if (activeRows.has(channelId)) {
        return message.reply('Kani channel horey wuxuu ku jiraa ciyaar ama casuumaad Row. Sug ilaa ay dhammaato.');
    }

    if (isUserBusy(author.id)) {
        return message.reply('Waxaad horey ciyaar ku jirtaa, dhamee ka hor intaadan bilaabin ?row.');
    }

    if (!isComputer && isUserBusy(target.id)) {
        return message.reply(`${target.username} hadda ciyaar ama hawl kale ayuu ku jiraa.`);
    }

    if (isComputer) {
        const board = Array.from({ length: 6 }, () => Array(7).fill(0));
        const embed = new EmbedBuilder()
            .setTitle('?row computer — Ciyaarta waa bilaabatay')
            .setDescription(`${author} ayaa bilaabay ciyaar computer.

Ciyaaryahanka hadda jira: ${author} (🔴)

🔴 = Player 1   🟡 = Computer
Dooro column 1 ilaa 7 adoo gujinaya button-ka hoos.

${renderRowBoard(board)}`)
            .setColor('#3498db');

        const inviteMessage = await message.reply({ embeds: [embed], components: rowButtons(channelId) });
        activeRows.set(channelId, {
            status: 'playing',
            players: [author.id, 'computer'],
            currentPlayer: 0,
            board,
            channelId,
            isComputer: true,
            createdAt: Date.now(),
            messageId: inviteMessage.id,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('?row @user — Casuumaad')
        .setDescription(`${author} ayaa casuumay ${target} inuu ku ciyaaro 4-in-a-row.

Haddii ${target} uu aqbalo, ciyaarta waxay bilaaban doontaa isla channel-kan.`)
        .setColor('#f1c40f')
        .setFooter({ text: '4-In-A-Row | Accept or Decline' });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`row_accept_${channelId}_${author.id}_${target.id}`)
            .setLabel('Aqbal')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`row_decline_${channelId}_${author.id}_${target.id}`)
            .setLabel('Diid')
            .setStyle(ButtonStyle.Danger),
    );

    const inviteMessage = await message.reply({ embeds: [embed], components: [buttons] });

    activeRows.set(channelId, {
        status: 'invited',
        inviterId: author.id,
        targetId: target.id,
        messageId: inviteMessage.id,
        channelId,
        createdAt: Date.now(),
    });
};
