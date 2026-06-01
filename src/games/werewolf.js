// =====================================================================
// CIYAARTA: Werewolf
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const games = new Map(); // guildId -> game state

const ROLES = {
    wolf: {
        emoji: '🐺', name: 'Werewolf', color: '#c0392b',
        desc: 'Habeenkii qof dooro oo dil. Maalintii is qarso.',
        thumbnail: 'https://i.imgur.com/KmGVAzk.png',
        card: [
            '```',
            '╔══════════════════════╗',
            '║   🐺  WEREWOLF  🐺   ║',
            '║  ──────────────────  ║',
            '║  ● Habeenkii:  DIL   ║',
            '║  ● Maalintii: QARSO  ║',
            '║  ● Kooxda: WOLVES    ║',
            '╚══════════════════════╝',
            '```',
        ].join('\n'),
    },
    seer: {
        emoji: '🔮', name: 'Seer', color: '#8e44ad',
        desc: 'Habeenkii qof baro — Werewolf miyuu yahay?',
        thumbnail: 'https://i.imgur.com/8YWXQNM.png',
        card: [
            '```',
            '╔══════════════════════╗',
            '║     🔮  SEER  🔮     ║',
            '║  ──────────────────  ║',
            '║  ● Habeenkii: BARO   ║',
            '║  ● Maalintii: CODEEY ║',
            '║  ● Awood: Wolf ogow  ║',
            '╚══════════════════════╝',
            '```',
        ].join('\n'),
    },
    doctor: {
        emoji: '💊', name: 'Doctor', color: '#27ae60',
        desc: 'Habeenkii qof dooro oo badbaadi dilka.',
        thumbnail: 'https://i.imgur.com/5QQ3hkQ.png',
        card: [
            '```',
            '╔══════════════════════╗',
            '║   💊  DOCTOR  💊     ║',
            '║  ──────────────────  ║',
            '║  ● Habeenkii: DAAWI  ║',
            '║  ● Maalintii: CODEEY ║',
            '║  ● Awood: Qof badbaadi║',
            '╚══════════════════════╝',
            '```',
        ].join('\n'),
    },
    villager: {
        emoji: '🏘️', name: 'Villager', color: '#2980b9',
        desc: 'Maalintii sawiraha raadso oo codeey si aad werewolf u saarto.',
        thumbnail: 'https://i.imgur.com/placeholder.png',
        card: [
            '```',
            '╔══════════════════════╗',
            '║  🏘️  VILLAGER  🏘️   ║',
            '║  ──────────────────  ║',
            '║  ● Awood: Codayn     ║',
            '║  ● Hadal + Baro      ║',
            '║  ● Saaro Wolf!       ║',
            '╚══════════════════════╝',
            '```',
        ].join('\n'),
    },
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
    const alive = alivePlayers(game);
    const wolves = alive.filter(([, p]) => p.role === 'wolf');
    const others = alive.filter(([, p]) => p.role !== 'wolf');
    if (wolves.length === 0) return 'villagers';
    if (wolves.length >= others.length) return 'wolves';
    return null;
}

// ── Embeds ────────────────────────────────────────────────────────────

async function lobbyEmbed(game, client) {
    const names = await Promise.all([...game.players.keys()].map(async (uid, i) => {
        let name = `<@${uid}>`;
        try { const u = await client.users.fetch(uid); name = `@${u.username}`; } catch {}
        return `${i + 1}. ${name}`;
    }));
    return new EmbedBuilder()
        .setTitle('🐺 Werewolf — Lobby')
        .setColor('#7f8c8d')
        .setDescription(
            `**Ciyaaryahanada (${game.players.size}/12):**\n${names.join('\n') || '_Cidna ma jirto_'}\n\n` +
            `Min: **5 qof** · Max: **12 qof**\n` +
            `Host kaliya ayaa bilaabi kara.`
        )
        .setFooter({ text: 'Garaad Bot • Werewolf' });
}

function lobbyRow(hostId, canStart) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ww_join_${hostId}`).setLabel('🙋 Ku Biir').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ww_leave_${hostId}`).setLabel('🚪 Ka Bax').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ww_start_${hostId}`).setLabel('▶ Bilow').setStyle(ButtonStyle.Primary).setDisabled(!canStart),
        new ButtonBuilder().setCustomId(`ww_cancel_${hostId}`).setLabel('✖ Jooji').setStyle(ButtonStyle.Danger),
    );
}

// ── Night action DM buttons ────────────────────────────────────────────

async function sendNightDM(uid, role, targets, guildId, client) {
    const u = await client.users.fetch(uid).catch(() => null);
    if (!u) return;

    const actionText = {
        wolf:   '🐺 **Cidda dilaysaa dooro:**',
        seer:   '🔮 **Cidda baranaysaa dooro:**',
        doctor: '💊 **Cidda badbaadisaysaa dooro:**',
    }[role];

    const style = { wolf: ButtonStyle.Danger, seer: ButtonStyle.Primary, doctor: ButtonStyle.Success }[role];

    const buttons = [];
    for (const [tid] of targets.slice(0, 5)) {
        let label = tid;
        try { const tu = await client.users.fetch(tid); label = tu.username; } catch {}
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`ww_night_${role}_${guildId}_${tid}`)
                .setLabel(label)
                .setStyle(style)
        );
    }

    await u.send({
        embeds: [new EmbedBuilder().setColor('#2c3e50').setDescription(actionText)],
        components: buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [],
    }).catch(() => {});
}

// ── Game flow ──────────────────────────────────────────────────────────

async function startGame(game, client) {
    const playerIds = [...game.players.keys()];
    const roles = assignRoles(playerIds.length);
    const wolves = [];

    playerIds.forEach((uid, i) => {
        game.players.set(uid, { role: roles[i], alive: true });
        if (roles[i] === 'wolf') wolves.push(uid);
    });

    // DM everyone their role card
    for (const [uid, { role }] of game.players) {
        const r = ROLES[role];
        try {
            const u = await client.users.fetch(uid);
            const wolfExtra = role === 'wolf' && wolves.length > 1
                ? `\n🐺 **Wolves kale:** ${wolves.filter(w => w !== uid).map(w => `<@${w}>`).join(', ')}`
                : '';
            await u.send({ embeds: [
                new EmbedBuilder()
                    .setColor(r.color)
                    .setTitle(`🃏 Doorkaaga La Siiyay`)
                    .setDescription(
                        r.card +
                        `\n**${r.emoji} ${r.name}**\n${r.desc}` +
                        wolfExtra
                    )
                    .addFields(
                        { name: '📜 Sharciga', value: r.desc, inline: false },
                        { name: '🔒 Sir ah', value: 'Ha u sheegin ciyaaryahanada kale!', inline: false },
                    )
                    .setFooter({ text: `Garaad Werewolf • Wareeg ${game.round}` })
                    .setTimestamp()
            ]});
        } catch {}
    }

    await beginNight(game, client);
}

async function beginNight(game, client) {
    game.phase = 'night';
    game.nightActions = { wolfVotes: new Map(), seerDone: false, doctorTarget: null };

    const alive = alivePlayers(game);
    const names = await Promise.all(alive.map(async ([uid]) => {
        let n = `<@${uid}>`; try { const u = await client.users.fetch(uid); n = `@${u.username}`; } catch {} return n;
    }));

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setTitle(`🌙 Habeenka — Wareeg ${game.round}`)
            .setColor('#2c3e50')
            .setDescription(
                `Habeenku wuu yimid. **Qofkii doorkaaga qabo shaqadaada samaynayaa.**\n\n` +
                `📩 Werewolf, Seer, Doctor — DM-kooda ayaa la diraysaa\n\n` +
                `**Kuwa Nool (${alive.length}):** ${names.join(', ')}\n\n` +
                `⏳ **40 ilbiriqsi**`
            )
    ]});

    for (const [uid, { role, alive: isAlive }] of game.players) {
        if (!isAlive) continue;
        const targets = role === 'wolf'
            ? alive.filter(([tid, tp]) => tp.role !== 'wolf') // wolves can't kill each other
            : alive.filter(([tid]) => tid !== uid);           // others can't target themselves
        if (['wolf', 'seer', 'doctor'].includes(role)) {
            await sendNightDM(uid, role, targets, game.guildId, client);
        }
    }

    game.nightTimer = setTimeout(() => resolveNight(game, client), 40_000);
}

async function resolveNight(game, client) {
    clearTimeout(game.nightTimer);
    game.phase = 'resolving';

    const na = game.nightActions;

    // Wolf kill — majority vote
    let killed = null;
    if (na.wolfVotes.size > 0) {
        const tally = new Map();
        for (const t of na.wolfVotes.values()) tally.set(t, (tally.get(t) || 0) + 1);
        killed = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    } else {
        const victims = alivePlayers(game).filter(([, p]) => p.role !== 'wolf');
        if (victims.length) killed = victims[Math.floor(Math.random() * victims.length)][0];
    }

    // Doctor save
    if (killed && na.doctorTarget === killed) killed = null;

    let desc = '';
    if (killed) {
        game.players.get(killed).alive = false;
        let n = `<@${killed}>`; try { const u = await client.users.fetch(killed); n = `**@${u.username}**`; } catch {}
        desc = `☠️ ${n} habeenka la dilay!`;
        try { const u = await client.users.fetch(killed); await u.send('☠️ **Waxaa lagu dilay habeenka.** Daawo kaliya — hadal kari mayside.').catch(() => {}); } catch {}
    } else {
        desc = `🛡️ **Habeenka cidna ma dhimin!** Doctor ayaa qof badbaadiyay.`;
    }

    // Seer result
    if (na.seerTarget) {
        const tRole = game.players.get(na.seerTarget)?.role;
        const seerId = [...game.players.entries()].find(([, p]) => p.role === 'seer' && p.alive)?.[0];
        if (seerId) {
            let tn = na.seerTarget; try { const u = await client.users.fetch(na.seerTarget); tn = u.username; } catch {}
            try {
                const su = await client.users.fetch(seerId);
                await su.send(`🔮 **${tn}** — ${tRole === 'wolf' ? '🐺 **WEREWOLF AH!**' : `👨 Werewolf ma aha (${ROLES[tRole]?.name})`}`).catch(() => {});
            } catch {}
        }
    }

    await game.textChannel.send({ embeds: [
        new EmbedBuilder().setTitle('🌅 Maalinta Waxaa Dhacay').setColor('#e67e22').setDescription(desc)
    ]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);
    await beginDay(game, client);
}

async function beginDay(game, client) {
    game.phase = 'day';
    game.votes = new Map();

    const alive = alivePlayers(game);
    const names = await Promise.all(alive.map(async ([uid]) => {
        let n = `<@${uid}>`; try { const u = await client.users.fetch(uid); n = `@${u.username}`; } catch {} return n;
    }));

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setTitle(`☀️ Maalinta — Wareeg ${game.round}`)
            .setColor('#f39c12')
            .setDescription(
                `**Kuwa Nool (${alive.length}):** ${names.join(', ')}\n\n` +
                `💬 **45 ilbiriqsi** — Ku hadla channel-ka! Cidda werewolf ah baaro.\n` +
                `⏳ Cod bixinta waxay bilaabi doontaa 45 ilbiriqsi...`
            )
    ]});

    game.dayTimer = setTimeout(() => beginVoting(game, client), 45_000);
}

async function beginVoting(game, client) {
    game.phase = 'vote';
    game.votes = new Map();

    const alive = alivePlayers(game);
    const buttons = [];
    for (const [uid] of alive.slice(0, 25)) {
        let label = uid.slice(-4);
        try { const u = await client.users.fetch(uid); label = u.username.slice(0, 20); } catch {}
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
            .setTitle('🗳️ Codaynta — Cidda Saari?')
            .setColor('#e74c3c')
            .setDescription(`Qofkii ugu cod badan waa la saari doonaa.\n⏳ **30 ilbiriqsi**`)
        ],
        components: rows,
    });

    game.voteMsg = voteMsg;
    game.voteTimer = setTimeout(() => resolveVote(game, client), 30_000);
}

async function resolveVote(game, client) {
    clearTimeout(game.voteTimer);
    if (game.voteMsg) await game.voteMsg.edit({ components: [] }).catch(() => {});

    const tally = new Map();
    for (const t of game.votes.values()) tally.set(t, (tally.get(t) || 0) + 1);

    let desc = '';
    let eliminated = null;

    if (!tally.size) {
        desc = '🤷 **Cidna ma codeeyin!** Wareeg kale.';
    } else {
        const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
            desc = '🤝 **Tie! Qof kama saarin** — wareeg kale.';
        } else {
            eliminated = sorted[0][0];
            game.players.get(eliminated).alive = false;
            const role = game.players.get(eliminated).role;
            const r = ROLES[role];
            let n = `<@${eliminated}>`; try { const u = await client.users.fetch(eliminated); n = `@${u.username}`; } catch {}
            desc = `🪓 **${n}** la saaray!\n${role === 'wolf' ? '🐺 **WEREWOLF AHAA! Guul!**' : `👨 Werewolf ma ahayn — **${r.emoji} ${r.name}** ahaa`}`;
            try { const u = await client.users.fetch(eliminated); await u.send(`🪓 Ciyaartii lagaa saaray. ${role === 'wolf' ? 'Werewolf ahayd.' : 'Werewolf ma ahayn.'}`).catch(() => {}); } catch {}
        }
    }

    await game.textChannel.send({ embeds: [
        new EmbedBuilder().setTitle('📊 Natiijada Codaynta').setColor('#9b59b6').setDescription(desc)
    ]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);

    game.round++;
    await beginNight(game, client);
}

async function endGame(game, client, winner) {
    clearTimeout(game.nightTimer);
    clearTimeout(game.dayTimer);
    clearTimeout(game.voteTimer);
    game.phase = 'ended';
    games.delete(game.guildId);

    const isVillagers = winner === 'villagers';

    const roleReveal = await Promise.all([...game.players.entries()].map(async ([uid, { role, alive }]) => {
        let n = `<@${uid}>`; try { const u = await client.users.fetch(uid); n = `@${u.username}`; } catch {}
        const r = ROLES[role];
        return `${alive ? '✅' : '☠️'} **${n}** — ${r.emoji} ${r.name}`;
    }));

    await game.textChannel.send({ embeds: [
        new EmbedBuilder()
            .setTitle(isVillagers ? '🎉 Villagers Waa Guulaysteen!' : '🐺 Werewolves Waa Guulaysteen!')
            .setColor(isVillagers ? '#27ae60' : '#e74c3c')
            .setDescription(
                `${isVillagers ? '👨 Villagers dhammaan werewolves ka saareen!' : '🐺 Werewolves xukunka qaataan!'}\n\n` +
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
