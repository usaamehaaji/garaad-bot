// =====================================================================
// CIYAARTA: Werewolf — Af-Soomaali (Full Roles)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const games = new Map();

const ROLES = {
    // ── Wolf team ──
    wolf:     { emoji: '🐍', name: 'Dilaaga',    color: '#c0392b', team: 'wolf',
                dm: 'Habeenkii qof dooro oo dil. Maalintii is qarso!' },
    // ── Villager team — special ──
    seer:     { emoji: '👁️', name: 'Aragti',      color: '#8e44ad', team: 'village',
                dm: 'Habeenkii qof dooro — Dilaaga miyuu yahay ogaan doontaa.' },
    doctor:   { emoji: '🏅', name: 'Dhaqtar',     color: '#27ae60', team: 'village',
                dm: 'Habeenkii qof dooro oo badbaadi dilka. Nafsadaada sidoo kale.' },
    mayor:    { emoji: '🎖️', name: 'Mayor',        color: '#e67e22', team: 'village',
                dm: 'Codadaadu waxay u xisaabantaan 2 cod! Maalintii codeey.' },
    princess: { emoji: '👸', name: 'Princess',     color: '#ff69b4', team: 'village',
                dm: 'Hadduu Dilaagu kugu dilo, isagaa dhinta adna way ku sii noolaan doontaa!' },
    king:     { emoji: '👑', name: 'King',         color: '#f1c40f', team: 'village',
                dm: 'Haddaad dhimatid, qof aad dooran karto wuxuu helayaa awoodooda.' },
    elin:     { emoji: '🏹', name: 'Elin',         color: '#e74c3c', team: 'village',
                dm: 'Haddaad la saarto ama la dilid, qof dooran kartaa oo aad naftiisa la qaadid!' },
    druid:    { emoji: '🌿', name: 'Duruid',       color: '#1abc9c', team: 'village',
                dm: 'Habeenkii qof ka mid ah shacabka (Villager) dooro oo badbaadi.' },
    necro:    { emoji: '💀', name: 'Necro',        color: '#7f8c8d', team: 'village',
                dm: 'Habeenkii qof dhintay dib u soo celi — hal mar oo kaliya!' },
    // ── Base villager ──
    villager: { emoji: '🔥', name: 'Dad Caadi',   color: '#2980b9', team: 'village',
                dm: 'Maalintii u codeey dilaaga. Fikirkaaga isticmaal!' },
};

// Role assignment by player count
function assignRoles(n) {
    const roles = ['wolf', 'seer'];
    if (n >= 6)  roles.push('doctor');
    if (n >= 7)  roles.push('mayor');
    if (n >= 8)  roles.push('princess');
    if (n >= 9)  roles.push('elin');
    if (n >= 10) { roles.push('wolf'); roles.push('king'); }
    if (n >= 11) roles.push('druid');
    if (n >= 12) roles.push('necro');
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

function deadPlayers(game) {
    return [...game.players.entries()].filter(([, p]) => !p.alive);
}

function checkWin(game) {
    const alive  = alivePlayers(game);
    const wolves = alive.filter(([, p]) => p.role === 'wolf');
    const others = alive.filter(([, p]) => p.role !== 'wolf');
    if (wolves.length === 0)             return 'dad';
    if (wolves.length >= others.length)  return 'dilaagayaal';
    return null;
}

async function fetchName(uid, client) {
    try { const u = await client.users.fetch(uid); return u.username; } catch { return `User`; }
}

function makeButtons(targets, customIdPrefix, style, max = 5) {
    return targets.slice(0, max).map(([uid, label]) =>
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_${uid}`)
            .setLabel(String(label).slice(0, 20))
            .setStyle(style)
    );
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

    // Count each role
    const roleCounts = {};
    for (const r of roles) roleCounts[r] = (roleCounts[r] || 0) + 1;

    // Player list
    const nameList = await Promise.all(playerIds.map(async uid => `• ${await fetchName(uid, client)}`));

    // Role summary
    const roleSummary = Object.entries(roleCounts)
        .map(([r, cnt]) => `${ROLES[r].emoji} ${cnt} ${ROLES[r].name}${cnt > 1 && r === 'wolf' ? ' (is yaqaanaan)' : ''}`)
        .join(' • ');

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
            await u.send({ embeds: [new EmbedBuilder()
                .setColor(r.color)
                .setDescription(
                    `**🎭 Doorkaaga — SIRTA KEEN!**\n\n` +
                    `**${r.emoji} Waxaad tahay ${r.name.toUpperCase()} AH!**\n` +
                    `${r.dm}${wolfExtra}\n\n` +
                    `*Tani waa sir — ciyaartoyda kale ha u sheegin!*`
                )
            ]});
        } catch {}
    }

    await beginNight(game, client);
}

// ── Night ─────────────────────────────────────────────────────────────

async function beginNight(game, client) {
    game.phase        = 'night';
    game.nightActions = {
        wolfVotes:    new Map(),
        seerTarget:   null,
        doctorTarget: null,
        druidTarget:  null,
        necroTarget:  null,
    };

    const alive     = alivePlayers(game);
    const dead      = deadPlayers(game);
    const hasDoctor = [...game.players.values()].some(p => p.role === 'doctor'   && p.alive);
    const hasSeer   = [...game.players.values()].some(p => p.role === 'seer'     && p.alive);
    const hasDruid  = [...game.players.values()].some(p => p.role === 'druid'    && p.alive);
    const hasNecro  = [...game.players.values()].some(p => p.role === 'necro'    && p.alive) && dead.length > 0;

    const lines = [
        `🌙 Habeenku wuu soo gudgalay... Dadku waa seexday.\n`,
        `🐍 Dilaagayaashu waxay dooranayaan qof ay dilaan (DM).`,
        hasSeer   ? `👁️ Aragtidu wuxuu dooranayaa qof uu baro (DM).`             : '',
        hasDoctor ? `🏅 Dhaqtarku wuxuu dooranayaa qof uu u badbaadıyo (DM).`   : '',
        hasDruid  ? `🌿 Duruidu wuxuu dooranayaa shacab uu badbaadıyo (DM).`    : '',
        hasNecro  ? `💀 Necro wuxuu dooranayaa qof dhintay uu baro (DM).`       : '',
        `\n⏳ **60 sekund**`,
    ].filter(Boolean).join('\n');

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#1a252f')
        .setDescription(`**🌙 Habeenka ${game.round}**\n\n${lines}`)
    ]});

    // Send DMs to special roles
    for (const [uid, { role, alive: isAlive }] of game.players) {
        if (!isAlive) continue;

        const sendDM = async (labelText, targets, style, prefix) => {
            const u = await client.users.fetch(uid).catch(() => null);
            if (!u || !targets.length) return;
            const btns = [];
            for (const [tid] of targets.slice(0, 5)) {
                const tn = await fetchName(tid, client);
                btns.push(new ButtonBuilder()
                    .setCustomId(`ww_night_${prefix}_${game.guildId}_${tid}`)
                    .setLabel(tn.slice(0, 20))
                    .setStyle(style));
            }
            await u.send({
                embeds: [new EmbedBuilder().setColor('#2c3e50').setDescription(`**${labelText}**`)],
                components: [new ActionRowBuilder().addComponents(btns)],
            }).catch(() => {});
        };

        if (role === 'wolf') {
            const targets = alive.filter(([, p]) => p.role !== 'wolf');
            await sendDM('🐍 Cidda dilaysaa dooro:', targets, ButtonStyle.Danger, 'wolf');
        } else if (role === 'seer') {
            const targets = alive.filter(([tid]) => tid !== uid);
            await sendDM('👁️ Cidda baranaysaa dooro:', targets, ButtonStyle.Primary, 'seer');
        } else if (role === 'doctor') {
            await sendDM('🏅 Cidda badbaadisaysaa dooro:', alive.filter(([tid]) => tid !== uid), ButtonStyle.Success, 'doctor');
        } else if (role === 'druid') {
            const targets = alive.filter(([tid]) => tid !== uid);
            if (targets.length) await sendDM('🌿 Cidda badbaadisaysaa dooro (good ama evil):', targets, ButtonStyle.Success, 'druid');
        } else if (role === 'necro' && dead.length > 0 && !game.necroUsed) {
            await sendDM('💀 Qof dhintay dooro — dib u soo celi (hal mar kaliya):', dead, ButtonStyle.Secondary, 'necro');
        }
    }

    game.nightTimer = setTimeout(() => resolveNight(game, client), 60_000);
}

async function resolveNight(game, client) {
    clearTimeout(game.nightTimer);
    game.phase = 'resolving';
    const na = game.nightActions;

    // Wolf kill — majority vote or random
    let killed = null;
    if (na.wolfVotes.size > 0) {
        const tally = new Map();
        for (const t of na.wolfVotes.values()) tally.set(t, (tally.get(t) || 0) + 1);
        killed = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    } else {
        const victims = alivePlayers(game).filter(([, p]) => p.role !== 'wolf');
        if (victims.length) killed = victims[Math.floor(Math.random() * victims.length)][0];
    }

    let desc = '';

    // Princess passive: if wolf kills Princess, a wolf dies instead
    if (killed && game.players.get(killed)?.role === 'princess') {
        const aliveWolves = alivePlayers(game).filter(([, p]) => p.role === 'wolf');
        if (aliveWolves.length) {
            const deadWolf = aliveWolves[Math.floor(Math.random() * aliveWolves.length)][0];
            game.players.get(deadWolf).alive = false;
            const wn = await fetchName(deadWolf, client);
            const pn = await fetchName(killed, client);
            desc += `👸 **${pn}** (Princess) dilayeen laakiin...\n🐍 **${wn}** (Dilaaga) baa dhintay! Princess waxay badbaashay!\n\n`;
            try { const u = await client.users.fetch(deadWolf); await u.send('☠️ Princess waad dileen — Princess ayaa kuu dilay. Waa lagaa saaray!').catch(() => {}); } catch {}
            killed = null;
        }
    }

    // Doctor save
    if (killed && na.doctorTarget === killed) { killed = null; desc += `🛡️ Dhaqtar ayaa qof badbaadiyay!\n\n`; }

    // Druid save (villagers only)
    if (killed && na.druidTarget === killed && game.players.get(killed)?.role === 'villager') {
        killed = null; desc += `🌿 Duruid ayaa shacab badbaadiyay!\n\n`;
    }

    if (killed) {
        const killedRole = game.players.get(killed).role;
        game.players.get(killed).alive = false;
        const n = await fetchName(killed, client);
        desc += `☠️ **${n}** habeenka la dilay! _(${ROLES[killedRole].emoji} ${ROLES[killedRole].name})_`;
        try { const u = await client.users.fetch(killed); await u.send('☠️ **Habeenka waxaa lagu dilay.** Daawo — hadal kari mayside.').catch(() => {}); } catch {}

        // Elin revenge when killed at night
        if (killedRole === 'elin') {
            await triggerElinRevenge(killed, game, client, 'habeenka');
            return; // triggerElinRevenge will continue the game
        }

        // King succession when killed at night
        if (killedRole === 'king') {
            await triggerKingSuccession(killed, game, client, desc);
            return;
        }
    } else if (!desc) {
        desc = `🛡️ **Habeenka cidna ma dhimin!**`;
    }

    // Seer result
    if (na.seerTarget) {
        const tRole  = game.players.get(na.seerTarget)?.role;
        const seerId = [...game.players.entries()].find(([, p]) => p.role === 'seer' && p.alive)?.[0];
        if (seerId && tRole) {
            const tn = await fetchName(na.seerTarget, client);
            try {
                const su = await client.users.fetch(seerId);
                await su.send(`👁️ **${tn}** — ${tRole === 'wolf' ? '🐍 **DILAAGA AH!**' : `✅ Dilaaga ma aha (${ROLES[tRole].emoji} ${ROLES[tRole].name})`}`).catch(() => {});
            } catch {}
        }
    }

    // Necro: revive one dead player (once per game)
    if (na.necroTarget && !game.necroUsed) {
        const revived = game.players.get(na.necroTarget);
        if (revived && !revived.alive) {
            revived.alive    = true;
            game.necroUsed   = true;
            const tn = await fetchName(na.necroTarget, client);
            desc += `\n\n💀 **Necro** wuxuu dib u soo celiyay: **${tn}** — wuu noolaaday!`;
            try { const u = await client.users.fetch(na.necroTarget); await u.send('💀 **Necro ayaa kuu soo nooleeyay!** Ciyaarta ayaad ku soo noqotay.').catch(() => {}); } catch {}
        }
    }

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#e67e22')
        .setDescription(`**🌅 Maalinta waxaa dhacay:**\n\n${desc}`)
    ]});

    const result = checkWin(game);
    if (result) return endGame(game, client, result);
    await beginDay(game, client);
}

// ── Elin revenge ───────────────────────────────────────────────────────
async function triggerElinRevenge(elinId, game, client, context) {
    const targets = alivePlayers(game).filter(([tid]) => tid !== elinId);
    if (!targets.length) {
        await continueAfterSpecial(game, client);
        return;
    }

    try {
        const u   = await client.users.fetch(elinId);
        const btns = [];
        for (const [tid] of targets.slice(0, 5)) {
            const tn = await fetchName(tid, client);
            btns.push(new ButtonBuilder()
                .setCustomId(`ww_elin_${game.guildId}_${tid}`)
                .setLabel(tn.slice(0, 20))
                .setStyle(ButtonStyle.Danger));
        }
        await u.send({
            embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(
                `🏹 **ELIN — Aakhir-dambe!**\n` +
                `${context === 'habeenka' ? 'Habeenka waxaa lagu dilay' : 'Codeyn lagaa saaray'} — qof dooro oo naftiisa la qaado!\n⏳ 20 sekund`
            )],
            components: [new ActionRowBuilder().addComponents(btns)],
        }).catch(() => {});
    } catch {}

    game.elinPending = elinId;
    game.elinTimer = setTimeout(() => {
        game.elinPending = null;
        continueAfterSpecial(game, client);
    }, 20_000);
}

// ── King succession ────────────────────────────────────────────────────
async function triggerKingSuccession(kingId, game, client, nightDesc) {
    const targets = alivePlayers(game).filter(([, p]) => p.team !== 'wolf');
    if (!targets.length) {
        await postNightResult(game, client, nightDesc);
        return;
    }

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#f1c40f')
        .setDescription(`**🌅 Maalinta waxaa dhacay:**\n\n${nightDesc}\n\n👑 **King wuu dhintay** — DM-ka ayuu ku dooran doona kii ku xiga!`)
    ]});

    try {
        const u    = await client.users.fetch(kingId);
        const btns = [];
        for (const [tid] of targets.slice(0, 5)) {
            const tn = await fetchName(tid, client);
            btns.push(new ButtonBuilder()
                .setCustomId(`ww_king_${game.guildId}_${tid}`)
                .setLabel(tn.slice(0, 20))
                .setStyle(ButtonStyle.Primary));
        }
        await u.send({
            embeds: [new EmbedBuilder().setColor('#f1c40f').setDescription(
                `👑 **KING — Kii ku xiga dooro!**\nQofka aad doorato wuxuu helayaa Seer awood (habeen kii danbe qof baran karaa).\n⏳ 20 sekund`
            )],
            components: [new ActionRowBuilder().addComponents(btns)],
        }).catch(() => {});
    } catch {}

    game.kingPending = kingId;
    game.kingTimer = setTimeout(async () => {
        game.kingPending = null;
        const result = checkWin(game);
        if (result) return endGame(game, client, result);
        await beginDay(game, client);
    }, 20_000);
}

async function continueAfterSpecial(game, client) {
    const result = checkWin(game);
    if (result) return endGame(game, client, result);

    if (game.phase === 'night' || game.phase === 'resolving') {
        await beginDay(game, client);
    } else {
        game.round++;
        await beginNight(game, client);
    }
}

async function postNightResult(game, client, desc) {
    await game.textChannel.send({ embeds: [new EmbedBuilder()
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

    await game.textChannel.send({ embeds: [new EmbedBuilder()
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

    game.voteMsg   = voteMsg;
    game.voteTimer = setTimeout(() => resolveVote(game, client), 60_000);
}

async function resolveVote(game, client) {
    clearTimeout(game.voteTimer);
    if (game.voteMsg) await game.voteMsg.edit({ components: [] }).catch(() => {});

    // Tally — Mayor counts as 2
    const tally = new Map();
    for (const [voterId, target] of game.votes) {
        const voterRole = game.players.get(voterId)?.role;
        const weight    = voterRole === 'mayor' ? 2 : 1;
        tally.set(target, (tally.get(target) || 0) + weight);
    }

    let desc = '';
    if (!tally.size) {
        desc = '🤷 **Cidna ma codeeyin!** Wareeg kale.';
    } else {
        const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
            desc = '🤝 **Tie! Qof kama saarin** — wareeg kale.';
        } else {
            const eliminated = sorted[0][0];
            const role       = game.players.get(eliminated).role;
            const r          = ROLES[role];
            game.players.get(eliminated).alive = false;
            const n    = await fetchName(eliminated, client);
            const wolf = role === 'wolf';
            desc = `🪓 **${n}** la saaray!\n${wolf ? `🐍 **DILAAGA AHAA! Guul!**` : `✅ Dilaaga ma ahayn — **${r.emoji} ${r.name}** ahaa`}`;
            try { const u = await client.users.fetch(eliminated); await u.send(`🪓 Ciyaartii lagaa saaray. ${wolf ? 'Dilaaga ahayd.' : 'Dilaaga ma ahayn.'}`).catch(() => {}); } catch {}

            // Elin revenge when voted out
            if (role === 'elin') {
                await game.textChannel.send({ embeds: [new EmbedBuilder().setColor('#9b59b6').setDescription(`**📊 Natiijada Codaynta**\n\n${desc}`)] });
                await triggerElinRevenge(eliminated, game, client, 'codeyn');
                return;
            }

            // King succession when voted out
            if (role === 'king') {
                await game.textChannel.send({ embeds: [new EmbedBuilder().setColor('#9b59b6').setDescription(`**📊 Natiijada Codaynta**\n\n${desc}`)] });
                await triggerKingSuccession(eliminated, game, client, desc);
                return;
            }
        }
    }

    await game.textChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#9b59b6')
        .setDescription(`**📊 Natiijada Codaynta**\n\n${desc}`)
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
    clearTimeout(game.elinTimer);
    clearTimeout(game.kingTimer);
    game.phase = 'ended';
    games.delete(game.guildId);

    const dadWon = winner === 'dad';

    const roleReveal = await Promise.all([...game.players.entries()].map(async ([uid, { role, alive }]) => {
        const n = await fetchName(uid, client);
        const r = ROLES[role];
        return `${alive ? '✅' : '☠️'} **${n}** — ${r.emoji} ${r.name}`;
    }));

    await game.textChannel.send({ embeds: [new EmbedBuilder()
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
    clearTimeout(game.elinTimer);
    clearTimeout(game.kingTimer);
    games.delete(guildId);
}

module.exports = { games, cancelGame, lobbyEmbed, lobbyRow, startGame, resolveNight, resolveVote, beginVoting, beginDay, endGame, checkWin, continueAfterSpecial };
