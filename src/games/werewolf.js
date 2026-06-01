// =====================================================================
// CIYAARTA: Werewolf (Af-Soomaali)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const games = new Map();

const ROLES = {
    wolf:     { emoji: '🐍', name: 'Dilaaga',          color: '#c0392b' },
    seer:     { emoji: '👁️', name: 'Aragti',            color: '#8e44ad' },
    doctor:   { emoji: '🏅', name: 'Dhaqtar',           color: '#27ae60' },
    villager: { emoji: '🔥', name: 'Dad Caadi',         color: '#2980b9' },
};

function assignRoles(n) {
    const roles = [];
    roles.push('wolf');
    if (n >= 10) roles.push('wolf');
    roles.push('seer');
    if (n >= 7) roles.push('doctor');
    while (roles.length < n) roles.push('villager');
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
}

function alivePlayers(game) {
    return [...game.players.entries()].filter(([, p]) => p.alive);
}

function checkWin(game) {
    const alive  = alivePlayers(game);
    const wolves = alive.filter(([, p]) => p.role === 'wolf');
    const others = alive.filter(([, p]) => p.role !== 'wolf');
    if (wolves.length === 0)          return 'dad';
    if (wolves.length >= others.length) return 'dilaagayaal';
    return null;
}

async function fetchName(uid, client) {
    try { const u = await client.users.fetch(uid); return u.username; } catch { return `<@${uid}>`; }
}

// ── Lobby ─────────────────────────────────────────────────────────────

async function lobbyEmbed(game, client) {
    const names = await Promise.all([...game.players.keys()].map(async (uid, i) => {
        const n = await fetchName(uid, client);
        return `• ${n}`;
    }));
    return new EmbedBuilder()
        .setColor('#2c3e50')
        .setDescription(
            `**🐺 CIYAARTU WAA DIYAARANAYSAA!**\n\n` +
            `**Ciyaaryahanada (${game.players.size}/12):**\n` +
            `${names.join('\n') || '_Cidna ma jirto_'}\n\n` +
            `Min: **5 qof** — Host ayaa bilaabi kara.`
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
    const roles     = assignRoles(playerIds.length);
    const wolves    = [];

    playerIds.forEach((uid, i) => {
        game.players.set(uid, { role: roles[i], alive: true });
        if (roles[i] === 'wolf') wolves.push(uid);
    });

    // Count roles
    const wolfCount     = roles.filter(r => r === 'wolf').length;
    const doctorCount   = roles.filter(r => r === 'doctor').length;
    const seerCount     = roles.filter(r => r === 'seer').length;
    const villagerCount = roles.filter(r => r === 'villager').length;

    // Player list
    const nameList = await Promise.all(playerIds.map(async uid => {
        const n = await fetchName(uid, client);
        return `• ${n}`;
    }));

    // Role summary line
    const roleSummary = [
        wolfCount   ? `🐍 ${wolfCount} Dilaagayaal${wolfCount > 1 ? ' (is yaqaanaan)' : ''}` : '',
        seerCount   ? `👁️ ${seerCount} Aragti` : '',
        doctorCount ? `🏅 ${doctorCount} Dhaqtar` : '',
        villagerCount ? `🔥 ${villagerCount} Dad Caadi` : '',
    ].filter(Boolean).join(' • ');

    await game.textChannel.send({
        content: `@everyone`,
        embeds: [new EmbedBuilder()
            .setColor('#e74c3c')
            .setDescription(
                `**CIYAARTU WAA BILAABANTAY!**\n` +
                `${playerIds.length} ciyaaryahan ayaa ka qayb galaya!\n\n` +
                `${nameList.join('\n')}\n\n` +
                `${roleSummary}\n\n` +
                `Qof kasta wuxuu helay DM doorcooda. Ciyaartu waxay bilaabaneysaa...`
            )
        ],
    });

    // DM each player their role
    for (const [uid, { role }] of game.players) {
        const r = ROLES[role];
        try {
            const u = await client.users.fetch(uid);
            const wolfExtra = role === 'wolf' && wolves.length > 1
                ? `\n\n🐍 **Dilaagayaasha kale:** ${wolves.filter(w => w !== uid).map(w => `<@${w}>`).join(', ')}`
                : '';

            const dmLines = {
                wolf:     `Habeenkii qof dooro oo dil.\nMaalintii is qarso — Dad Caadi ha kuu garanaynin!`,
                seer:     `Habeenkii qof dooro — Dilaaga miyuu yahay ogaan doontaa.\nMaalintii codeey.`,
                doctor:   `Habeenkii qof dooro oo badbaadi dilka.\nNafsadaada sidoo kale badbaadin kartaa.`,
                villager: `Maalintii u codeey dilaaga. Fikirkaaga isticmaal!`,
            }[role];

            await u.send({ embeds: [
                new EmbedBuilder()
                    .setColor(r.color)
                    .setDescription(
                        `**🎭 Doorkaaga — SIRTA KEEN!**\n\n` +
                        `**${r.emoji} Waxaad tahay ${r.name.toUpperCase()} AH!**\n` +
                        `${dmLines}` +
                        wolfExtra +
                        `\n\n*Tani waa sir — ciyaartoyda kale ha u sheegin!*`
                    )
            ]});
        } catch {}
    }

    await beginNight(game, client);
}

// ── Night ─────────────────────────────────────────────────────────────

async function beginNight(game, client) {
    game.phase        = 'night';
    game.nightActions = { wolfVotes: new Map(), seerTarget: null, doctorTarget: null };

    const alive = alivePlayers(game);

    // Night announcement
    const hasDoctor = [...game.players.values()].some(p => p.role === 'doctor' && p.alive);
    const hasSeer   = [...game.players.values()].some(p => p.role === 'seer'   && p.alive);

    const lines = [
        `🌙 Habeenku wuu soo gudgalay... Dadku waa seexday.\n`,
        `🐍 Dilaagayaashu waxay dooranayaan qof ay dilaan (DM).`,
        hasSeer   ? `👁️ Aragtidu wuxuu dooranayaa qof uu baro (DM).`            : '',
        hasDoctor ? `🏅 Dhaqtarku wuxuu dooranayaa qof uu u badbaadıyo (DM).`  : '',
        `\n⏳ **60 sekund**`,
    ].filter(Boolean).join('\n');

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setColor('#1a252f')
            .setDescription(`**🌙 Habeenka ${game.round}**\n\n${lines}`)
    ]});

    // Send DM action buttons
    for (const [uid, { role, alive: isAlive }] of game.players) {
        if (!isAlive || !['wolf', 'seer', 'doctor'].includes(role)) continue;

        const targets = role === 'wolf'
            ? alive.filter(([, p]) => p.role !== 'wolf')
            : alive.filter(([tid]) => tid !== uid);

        const u = await client.users.fetch(uid).catch(() => null);
        if (!u || !targets.length) continue;

        const style = { wolf: ButtonStyle.Danger, seer: ButtonStyle.Primary, doctor: ButtonStyle.Success }[role];
        const label = {
            wolf:   '🐍 Cidda dilaysaa dooro:',
            seer:   '👁️ Cidda baranaysaa dooro:',
            doctor: '🏅 Cidda badbaadisaysaa dooro:',
        }[role];

        const buttons = [];
        for (const [tid] of targets.slice(0, 5)) {
            const tn = await fetchName(tid, client);
            buttons.push(new ButtonBuilder()
                .setCustomId(`ww_night_${role}_${game.guildId}_${tid}`)
                .setLabel(tn.slice(0, 20))
                .setStyle(style));
        }

        await u.send({
            embeds: [new EmbedBuilder().setColor('#2c3e50').setDescription(`**${label}**`)],
            components: [new ActionRowBuilder().addComponents(buttons)],
        }).catch(() => {});
    }

    game.nightTimer = setTimeout(() => resolveNight(game, client), 60_000);
}

async function resolveNight(game, client) {
    clearTimeout(game.nightTimer);
    game.phase = 'resolving';
    const na = game.nightActions;

    // Wolf kill
    let killed = null;
    if (na.wolfVotes.size > 0) {
        const tally = new Map();
        for (const t of na.wolfVotes.values()) tally.set(t, (tally.get(t) || 0) + 1);
        killed = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    } else {
        const victims = alivePlayers(game).filter(([, p]) => p.role !== 'wolf');
        if (victims.length) killed = victims[Math.floor(Math.random() * victims.length)][0];
    }

    if (killed && na.doctorTarget === killed) killed = null;

    let desc = '';
    if (killed) {
        game.players.get(killed).alive = false;
        const n = await fetchName(killed, client);
        desc = `☠️ **${n}** habeenka la dilay!\n_Doorkoodu wuxuu ahaa: ${ROLES[game.players.get(killed).role]?.name}_`;
        try { const u = await client.users.fetch(killed); await u.send('☠️ **Habeenka waxaa lagu dilay.** Daawo — hadal kari mayside.').catch(() => {}); } catch {}
    } else {
        desc = `🛡️ **Habeenka cidna ma dhimin!** Dhaqtar ayaa qof badbaadiyay.`;
    }

    // Seer result
    if (na.seerTarget) {
        const tRole  = game.players.get(na.seerTarget)?.role;
        const seerId = [...game.players.entries()].find(([, p]) => p.role === 'seer' && p.alive)?.[0];
        if (seerId) {
            const tn = await fetchName(na.seerTarget, client);
            try {
                const su = await client.users.fetch(seerId);
                await su.send(`👁️ **${tn}** — ${tRole === 'wolf' ? '🐍 **DILAAGA AH!**' : `✅ Dilaaga ma aha (${ROLES[tRole]?.name})`}`).catch(() => {});
            } catch {}
        }
    }

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setColor('#e67e22')
            .setDescription(`**🌅 Maalinta waxaa dhacay:**\n\n${desc}`)
    ]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);
    await beginDay(game, client);
}

// ── Day ───────────────────────────────────────────────────────────────

async function beginDay(game, client) {
    game.phase = 'day';
    game.votes = new Map();

    const alive = alivePlayers(game);
    const names = await Promise.all(alive.map(async ([uid]) => `• ${await fetchName(uid, client)}`));

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setColor('#f39c12')
            .setDescription(
                `**☀️ Maalinta ${game.round}**\n\n` +
                `Dadku wey tooseen. Ku hadla — dilaaga baaro!\n\n` +
                `**Kuwa Nool (${alive.length}):**\n${names.join('\n')}\n\n` +
                `💬 **45 sekund** — Codayntu waxay bilaaban doontaa...`
            )
    ]});

    game.dayTimer = setTimeout(() => beginVoting(game, client), 45_000);
}

async function beginVoting(game, client) {
    game.phase = 'vote';
    game.votes = new Map();

    const alive   = alivePlayers(game);
    const buttons = [];
    for (const [uid] of alive.slice(0, 25)) {
        const label = (await fetchName(uid, client)).slice(0, 20);
        buttons.push(new ButtonBuilder()
            .setCustomId(`ww_vote_${game.guildId}_${uid}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary));
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    const voteMsg = await game.textChannel.send({
        embeds: [new EmbedBuilder()
            .setColor('#f39c12')
            .setDescription(
                `**☀️ Maalinta ${game.round} — Codeynta**\n` +
                `Yaa dilaagu yahay?\n\n` +
                `**${alive.length} qof** ayaa nool. Buttons-ka hoose guji si aad u codeeyso.\n` +
                `⏳ **60 sekund**`
            )
        ],
        components: rows,
    });

    game.voteMsg    = voteMsg;
    game.voteTimer  = setTimeout(() => resolveVote(game, client), 60_000);
}

async function resolveVote(game, client) {
    clearTimeout(game.voteTimer);
    if (game.voteMsg) await game.voteMsg.edit({ components: [] }).catch(() => {});

    const tally = new Map();
    for (const t of game.votes.values()) tally.set(t, (tally.get(t) || 0) + 1);

    let desc = '';
    if (!tally.size) {
        desc = '🤷 **Cidna ma codeeyin!** Wareeg kale.';
    } else {
        const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
            desc = '🤝 **Tie! Qof kama saarin** — wareeg kale.';
        } else {
            const eliminated = sorted[0][0];
            game.players.get(eliminated).alive = false;
            const role = game.players.get(eliminated).role;
            const r    = ROLES[role];
            const n    = await fetchName(eliminated, client);
            const wasWolf = role === 'wolf';
            desc = `🪓 **${n}** la saaray!\n${wasWolf ? `🐍 **DILAAGA AHAA! Guul Dad Caadi!**` : `✅ Dilaaga ma ahayn — **${r.emoji} ${r.name}** ahaa`}`;
            try { const u = await client.users.fetch(eliminated); await u.send(`🪓 Ciyaartii lagaa saaray. ${wasWolf ? 'Dilaaga ahayd.' : 'Dilaaga ma ahayn.'}`).catch(() => {}); } catch {}
        }
    }

    await game.textChannel.send({ embeds: [
        new EmbedBuilder().setColor('#9b59b6').setDescription(`**📊 Natiijada Codaynta**\n\n${desc}`)
    ]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);

    game.round++;
    await beginNight(game, client);
}

// ── End ───────────────────────────────────────────────────────────────

async function endGame(game, client, winner) {
    clearTimeout(game.nightTimer);
    clearTimeout(game.dayTimer);
    clearTimeout(game.voteTimer);
    game.phase = 'ended';
    games.delete(game.guildId);

    const dadWon = winner === 'dad';

    const roleReveal = await Promise.all([...game.players.entries()].map(async ([uid, { role, alive }]) => {
        const n = await fetchName(uid, client);
        const r = ROLES[role];
        return `${alive ? '✅' : '☠️'} **${n}** — ${r.emoji} ${r.name}`;
    }));

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setColor(dadWon ? '#27ae60' : '#e74c3c')
            .setDescription(
                `**${dadWon ? '🎉 DAD CAADU WAY GUULAYSTEEN!' : '🐍 DILAAGAYAASHU WAY GUULAYSTEEN!'}**\n\n` +
                `${dadWon ? 'Dhammaan dilaagayaasha la saaray!' : 'Dilaagayaashu waxay xukunka qaataan!'}\n\n` +
                `**Doorarka oo dhan:**\n${roleReveal.join('\n')}`
            )
            .setFooter({ text: 'Garaad Bot • Werewolf' })
    ]});
}

function cancelGame(guildId) {
    const game = games.get(guildId);
    if (!game) return;
    clearTimeout(game.nightTimer);
    clearTimeout(game.dayTimer);
    clearTimeout(game.voteTimer);
    games.delete(guildId);
}

module.exports = { games, cancelGame, lobbyEmbed, lobbyRow, startGame, resolveNight, resolveVote, beginVoting, endGame };
