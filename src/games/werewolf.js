// =====================================================================
// CIYAARTA: Mafia — Af-Soomaali
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const games = new Map();

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 100;
const PLAYERS_PER_MAFIA = 5;
const TARGETS_PER_PAGE = 20;
const NIGHT_SECONDS = 60;
const DAY_SECONDS = 45;
const VOTE_SECONDS = 60;

const ROLES = {
    mafia: {
        emoji: '🔪',
        name: 'Killer Mafia',
        color: '#c0392b',
        dm: 'Habeenkii qof dooro oo dil. Mafia kale way kula jiraan, laakiin sirta ha bixin.',
    },
    citizen: {
        emoji: '👥',
        name: 'Shacab',
        color: '#2980b9',
        dm: 'Maalintii la hadal dadka, kadib codee qofka aad u malaynayso inuu Mafia yahay.',
    },
};

function mafiaCount(playerCount) {
    return Math.max(1, Math.floor(playerCount / PLAYERS_PER_MAFIA));
}

function assignRoles(playerCount) {
    const roles = Array(mafiaCount(playerCount)).fill('mafia');
    while (roles.length < playerCount) roles.push('citizen');

    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
}

function alivePlayers(game) {
    return [...game.players.entries()].filter(([, player]) => player.alive);
}

function isMafia(role) {
    return role === 'mafia';
}

function checkWin(game) {
    const alive = alivePlayers(game);
    const mafia = alive.filter(([, player]) => isMafia(player.role));
    const citizens = alive.filter(([, player]) => !isMafia(player.role));

    if (mafia.length === 0) return 'citizens';
    if (mafia.length >= citizens.length) return 'mafia';
    return null;
}

async function fetchName(uid, client) {
    try {
        const user = await client.users.fetch(uid);
        return user.username;
    } catch {
        return 'User';
    }
}

function pageCount(targets) {
    return Math.max(1, Math.ceil(targets.length / TARGETS_PER_PAGE));
}

async function targetRows(targets, client, pickPrefix, pagePrefix, page = 0) {
    const pages = pageCount(targets);
    const safePage = Math.min(Math.max(page, 0), pages - 1);
    const visible = targets.slice(safePage * TARGETS_PER_PAGE, (safePage + 1) * TARGETS_PER_PAGE);
    const buttons = [];

    for (const [uid] of visible) {
        const name = await fetchName(uid, client);
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`${pickPrefix}_${uid}`)
                .setLabel(name.slice(0, 20))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    if (pages > 1) {
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`${pagePrefix}_${safePage - 1}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(safePage === 0),
            new ButtonBuilder()
                .setCustomId(`${pagePrefix}_${safePage + 1}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(safePage >= pages - 1),
        ));
    }

    return { rows, page: safePage, pages };
}

// ── Lobby ─────────────────────────────────────────────────────────────

async function lobbyEmbed(game, client) {
    const shown = [...game.players.keys()].slice(0, 30);
    const names = await Promise.all(shown.map(async uid => `• ${await fetchName(uid, client)}`));
    const more = game.players.size > shown.length ? `\n...iyo ${game.players.size - shown.length} kale` : '';

    return new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('🔪 Mafia — Lobby')
        .setDescription(
            `**Ciyaaryahanada (${game.players.size}/${MAX_PLAYERS}):**\n` +
            `${names.join('\n') || '_Cidna ma jirto_'}${more}\n\n` +
            `Min: **${MIN_PLAYERS} qof**\n` +
            `Killer Mafia: **1 qof 5 ciyaaryahan kasta** (5=1, 10=2, 15=3).`
        );
}

function lobbyRow(hostId, canStart) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ww_join_${hostId}`).setLabel('🙋 Ku Biir').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ww_leave_${hostId}`).setLabel('🚪 Ka Bax').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ww_start_${hostId}`).setLabel('▶ Bilow').setStyle(ButtonStyle.Primary).setDisabled(!canStart),
        new ButtonBuilder().setCustomId(`ww_cancel_${hostId}`).setLabel('✖ Jooji').setStyle(ButtonStyle.Danger),
    );
}

// ── Game start ────────────────────────────────────────────────────────

async function startGame(game, client) {
    const playerIds = [...game.players.keys()];
    const roles = assignRoles(playerIds.length);
    const mafiaIds = [];

    playerIds.forEach((uid, index) => {
        game.players.set(uid, { role: roles[index], alive: true });
        if (roles[index] === 'mafia') mafiaIds.push(uid);
    });

    const playerList = await Promise.all(playerIds.slice(0, 40).map(async uid => `• ${await fetchName(uid, client)}`));
    const extra = playerIds.length > playerList.length ? `\n...iyo ${playerIds.length - playerList.length} kale` : '';

    await game.textChannel.send({
        content: '@everyone',
        embeds: [new EmbedBuilder()
            .setColor('#c0392b')
            .setTitle('🔪 Mafia — Ciyaartu way bilaabatay!')
            .setDescription(
                `${playerIds.length} qof ayaa ciyaaraya.\n\n` +
                `${playerList.join('\n')}${extra}\n\n` +
                `🔪 Killer Mafia: **${mafiaIds.length}**\n` +
                `👥 Shacab: **${playerIds.length - mafiaIds.length}**\n\n` +
                `Qof kasta DM ayuu ka helayaa doorkiisa.`
            )],
    });

    for (const [uid, { role }] of game.players) {
        const roleInfo = ROLES[role];
        const mafiaTeam = role === 'mafia' && mafiaIds.length > 1
            ? `\n\n🔪 **Mafia kale:** ${mafiaIds.filter(id => id !== uid).map(id => `<@${id}>`).join(', ')}`
            : '';

        try {
            const user = await client.users.fetch(uid);
            await user.send({ embeds: [new EmbedBuilder()
                .setColor(roleInfo.color)
                .setTitle(`${roleInfo.emoji} Doorkaaga`)
                .setDescription(
                    `Waxaad tahay **${roleInfo.name}**.\n\n` +
                    `${roleInfo.dm}${mafiaTeam}\n\n` +
                    `Sirtaada ha sheegin.`
                )]});
        } catch {}
    }

    await beginNight(game, client);
}

// ── Night ─────────────────────────────────────────────────────────────

async function beginNight(game, client) {
    game.phase = 'night';
    game.nightActions = { mafiaVotes: new Map() };

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#1a252f')
        .setTitle(`🌙 Habeenka ${game.round}`)
        .setDescription(
            `Dadku way seexdeen.\n\n` +
            `🔪 Mafia waxay DM ku dooranayaan qof ay dilaan.\n` +
            `⏳ **${NIGHT_SECONDS} seconds**`
        )]});

    const alive = alivePlayers(game);
    const targets = alive.filter(([, player]) => !isMafia(player.role));

    for (const [uid, player] of alive) {
        if (!isMafia(player.role) || !targets.length) continue;

        try {
            const user = await client.users.fetch(uid);
            const { rows, page, pages } = await targetRows(
                targets,
                client,
                `ww_night_mafia_${game.guildId}`,
                `ww_page_night_${game.guildId}`,
                0
            );
            await user.send({
                embeds: [new EmbedBuilder()
                    .setColor('#c0392b')
                    .setTitle('🔪 Killer Mafia')
                    .setDescription(`Qof aad dilaysaan dooro.\nBogga **${page + 1}/${pages}**`)],
                components: rows,
            }).catch(() => {});
        } catch {}
    }

    game.nightTimer = setTimeout(() => resolveNight(game, client), NIGHT_SECONDS * 1000);
}

async function resolveNight(game, client) {
    clearTimeout(game.nightTimer);
    game.phase = 'resolving';

    let killed = null;
    const votes = game.nightActions?.mafiaVotes || new Map();

    if (votes.size) {
        const tally = new Map();
        for (const targetId of votes.values()) tally.set(targetId, (tally.get(targetId) || 0) + 1);
        killed = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    } else {
        const victims = alivePlayers(game).filter(([, player]) => !isMafia(player.role));
        if (victims.length) killed = victims[Math.floor(Math.random() * victims.length)][0];
    }

    let desc = '🛡️ Habeenka cidna ma dhiman.';
    if (killed && game.players.get(killed)?.alive) {
        game.players.get(killed).alive = false;
        const name = await fetchName(killed, client);
        desc = `☠️ **${name}** habeenkii waa la dilay. Wuxuu ahaa **👥 Shacab**.`;
        try {
            const user = await client.users.fetch(killed);
            await user.send('☠️ Habeenka waxaa ku dilay Mafia. Ciyaarta waad ka baxday.').catch(() => {});
        } catch {}
    }

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🌅 Subaxdii')
        .setDescription(desc)]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);
    return beginDay(game, client);
}

// ── Day ───────────────────────────────────────────────────────────────

async function beginDay(game, client) {
    game.phase = 'day';
    game.votes = new Map();

    const alive = alivePlayers(game);
    const shown = alive.slice(0, 40);
    const names = await Promise.all(shown.map(async ([uid]) => `• ${await fetchName(uid, client)}`));
    const extra = alive.length > shown.length ? `\n...iyo ${alive.length - shown.length} kale` : '';

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle(`☀️ Maalinta ${game.round}`)
        .setDescription(
            `Dadku way tooseen. Ka dooda cidda Mafia ah.\n\n` +
            `**Kuwa nool (${alive.length}):**\n${names.join('\n')}${extra}\n\n` +
            `💬 **${DAY_SECONDS} seconds** kadib codayn ayaa bilaabanaysa.`
        )]});

    game.dayTimer = setTimeout(() => beginVoting(game, client), DAY_SECONDS * 1000);
}

async function beginVoting(game, client, page = 0) {
    game.phase = 'vote';
    game.votes ??= new Map();

    const alive = alivePlayers(game);
    const { rows, page: safePage, pages } = await targetRows(
        alive,
        client,
        `ww_vote_${game.guildId}`,
        `ww_page_vote_${game.guildId}`,
        page
    );

    const payload = {
        embeds: [new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle(`🗳️ Codeynta — Maalinta ${game.round}`)
            .setDescription(
                `Yaa Killer Mafia ah?\n\n` +
                `Bogga **${safePage + 1}/${pages}**\n` +
                `⏳ **${VOTE_SECONDS} seconds**`
            )],
        components: rows,
    };

    if (game.voteMsg) {
        await game.voteMsg.edit(payload).catch(() => {});
    } else {
        game.voteMsg = await game.textChannel.send(payload);
        game.voteTimer = setTimeout(() => resolveVote(game, client), VOTE_SECONDS * 1000);
    }
}

async function resolveVote(game, client) {
    clearTimeout(game.voteTimer);
    if (game.voteMsg) await game.voteMsg.edit({ components: [] }).catch(() => {});

    const tally = new Map();
    for (const targetId of game.votes.values()) tally.set(targetId, (tally.get(targetId) || 0) + 1);

    let desc = '🤷 Cidna ma codeyn. Wareeg kale ayaa bilaabanaya.';
    if (tally.size) {
        const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
            desc = '🤝 Codadku way isku dhaceen. Qof lama saarin.';
        } else {
            const eliminated = sorted[0][0];
            const player = game.players.get(eliminated);
            const name = await fetchName(eliminated, client);
            player.alive = false;
            desc = `🪓 **${name}** waa la saaray. Wuxuu ahaa **${ROLES[player.role].emoji} ${ROLES[player.role].name}**.`;

            try {
                const user = await client.users.fetch(eliminated);
                await user.send(`🪓 Codayn ayaa lagugu saaray. Waxaad ahayd ${ROLES[player.role].name}.`).catch(() => {});
            } catch {}
        }
    }

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📊 Natiijada Codaynta')
        .setDescription(desc)]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);

    game.round++;
    return beginNight(game, client);
}

// ── End ───────────────────────────────────────────────────────────────

async function endGame(game, client, winner) {
    clearTimeout(game.nightTimer);
    clearTimeout(game.dayTimer);
    clearTimeout(game.voteTimer);
    game.phase = 'ended';
    games.delete(game.guildId);

    const roleReveal = await Promise.all([...game.players.entries()].map(async ([uid, player]) => {
        const name = await fetchName(uid, client);
        const role = ROLES[player.role];
        return `${player.alive ? '✅' : '☠️'} **${name}** — ${role.emoji} ${role.name}`;
    }));
    const revealText = roleReveal.join('\n');
    const safeReveal = revealText.length > 3000
        ? `${revealText.slice(0, 3000)}\n...iyo ciyaaryahano kale`
        : revealText;

    const citizensWon = winner === 'citizens';
    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor(citizensWon ? '#27ae60' : '#c0392b')
        .setTitle(citizensWon ? '🎉 Shacabkii way guuleysteen!' : '🔪 Killer Mafia way guuleysteen!')
        .setDescription(
            `${citizensWon ? 'Mafia oo dhan waa la saaray.' : 'Mafia waxay la wareegtay magaalada.'}\n\n` +
            `**Doorarka oo dhan:**\n${safeReveal}`
        )
        .setFooter({ text: 'Garaad Bot • Mafia' })]});
}

function cancelGame(guildId) {
    const game = games.get(guildId);
    if (!game) return;
    clearTimeout(game.nightTimer);
    clearTimeout(game.dayTimer);
    clearTimeout(game.voteTimer);
    games.delete(guildId);
}

module.exports = {
    games,
    cancelGame,
    lobbyEmbed,
    lobbyRow,
    startGame,
    resolveNight,
    resolveVote,
    beginVoting,
    beginDay,
    endGame,
    checkWin,
    targetRows,
    alivePlayers,
    isMafia,
    MIN_PLAYERS,
    MAX_PLAYERS,
};
