const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 15;
const NIGHT_MS   = 90_000;
const DISCUSS_MS = 40_000;
const VOTE_MS    = 80_000;
const HUNTER_MS  = 30_000;

const ROLE_INFO = {
    wolf:         { emoji: '🐺', label: 'Werewolf',     faction: 'wolf',    color: '#c0392b' },
    alphawolf:    { emoji: '🐺', label: 'Alpha Wolf',   faction: 'wolf',    color: '#922b21' },
    wolfshaman:   { emoji: '🔮', label: 'Wolf Shaman',  faction: 'wolf',    color: '#7d3c98' },
    shapeshifter: { emoji: '🦎', label: 'Shapeshifter', faction: 'wolf',    color: '#a04000' },
    villager:     { emoji: '🧑‍🌾', label: 'Villager',   faction: 'village', color: '#f39c12' },
    seer:         { emoji: '🔮', label: 'Seer',          faction: 'village', color: '#9b59b6' },
    doctor:       { emoji: '💉', label: 'Doctor',        faction: 'village', color: '#27ae60' },
    hunter:       { emoji: '🏹', label: 'Hunter',        faction: 'village', color: '#e67e22' },
    princess:     { emoji: '👸', label: 'Princess',      faction: 'village', color: '#f1948a' },
    king:         { emoji: '👑', label: 'King',          faction: 'village', color: '#f4d03f' },
    knight:       { emoji: '⚔️', label: 'Knight',       faction: 'village', color: '#5d6d7e' },
    lycan:        { emoji: '🐕', label: 'Lycan',         faction: 'village', color: '#784212' },
    witch:        { emoji: '🧙', label: 'Witch',         faction: 'wolf',    color: '#1a5276' },
    necromancer:  { emoji: '💀', label: 'Necromancer',  faction: 'neutral', color: '#212f3d' },
    thief:        { emoji: '🗡️', label: 'Thief',        faction: 'neutral', color: '#616a6b' },
};

const WOLF_SPECIALS    = ['alphawolf', 'wolfshaman', 'shapeshifter', 'witch'];
const VILLAGE_SPECIALS = ['hunter', 'princess', 'king', 'knight', 'lycan'];
const NEUTRAL_ROLES    = ['necromancer', 'thief'];

const activeWW = new Map();

// ── Helpers ──────────────────────────────────────────────────────────

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function isWolfFaction(role) { return ROLE_INFO[role]?.faction === 'wolf'; }

function buildRoleset(count) {
    const wolfCount = count <= 5 ? 1 : count <= 9 ? 2 : count <= 12 ? 3 : 4;
    const roles = ['wolf'];
    const wolfPool = shuffle(['wolf', ...WOLF_SPECIALS]);
    for (let i = 1; i < wolfCount; i++) roles.push(wolfPool[i % wolfPool.length]);
    roles.push('seer');
    if (count >= 6) roles.push('doctor');
    if (count >= 8 && Math.random() > 0.5)
        roles.push(NEUTRAL_ROLES[Math.floor(Math.random() * NEUTRAL_ROLES.length)]);
    const villagePool = shuffle([...VILLAGE_SPECIALS]);
    for (const r of villagePool) {
        if (roles.length >= count - 1) break;
        roles.push(r);
    }
    while (roles.length < count) roles.push('villager');
    return shuffle(roles);
}

function alivePlayers(state) {
    return Object.keys(state.players).filter(uid => state.players[uid].alive);
}

function aliveWolves(state) {
    return Object.keys(state.players).filter(uid => state.players[uid].alive && isWolfFaction(state.players[uid].role));
}

function findAliveRole(state, role) {
    return Object.keys(state.players).find(uid => state.players[uid].alive && state.players[uid].role === role) || null;
}

// Alpha wolf appears as villager on first seer check; lycan appears as wolf; shapeshifter always villager
function seerCheck(state, targetId) {
    const p = state.players[targetId];
    if (!p) return false;
    if (p.role === 'lycan') return true;
    if (p.role === 'shapeshifter') return false;
    if (p.role === 'alphawolf') {
        if (!p.alphaRevealed) { p.alphaRevealed = true; return false; }
        return true;
    }
    return isWolfFaction(p.role);
}

function checkWin(state) {
    const alive  = alivePlayers(state);
    const wolves = alive.filter(uid => isWolfFaction(state.players[uid].role)).length;
    const others = alive.length - wolves;
    if (wolves === 0) return 'village';
    if (wolves >= others) return 'wolves';
    const necroId = findAliveRole(state, 'necromancer');
    if (necroId) {
        const dead = Object.keys(state.players).length - alive.length;
        if (dead > alive.length) return 'necromancer';
    }
    return null;
}

function nightComplete(state) {
    const wolves = aliveWolves(state);
    if (!wolves.every(w => state.night.killVotes[w])) return false;
    if (!state.night.seerDone  && findAliveRole(state, 'seer'))   return false;
    if (!state.night.docDone   && findAliveRole(state, 'doctor')) return false;
    if (!state.night.witchDone && findAliveRole(state, 'witch'))  return false;
    if (!state.night.thiefDone && state.round === 1 && findAliveRole(state, 'thief')) return false;
    return true;
}

// ── UI builders ──────────────────────────────────────────────────────

function buildLobbyEmbed(state) {
    const list  = Object.entries(state.players)
        .map(([uid, p]) => `• <@${uid}> (${p.name})`).join('\n') || '_Cidna weli kuma biirin_';
    const count = Object.keys(state.players).length;
    const wolfCount = count <= 5 ? 1 : count <= 9 ? 2 : count <= 12 ? 3 : 4;
    return new EmbedBuilder()
        .setTitle('🐺 Werewolf — Lobby')
        .setColor('#8e44ad')
        .setDescription(
            `**Gaadhiga:** <@${state.hostId}>\n\n` +
            `**Ka qaybgalayaasha (${count}/${MAX_PLAYERS}):**\n${list}\n\n` +
            `**Wolves:** 🐺×${wolfCount} — 15 role pool, si random ah\n\n` +
            `_Ugu yaraan **${MIN_PLAYERS}** qof — gaadhigu bilow_`
        )
        .setFooter({ text: 'Garaad Games • Werewolf' });
}

function buildSettingsEmbed(roles, playerCount) {
    const counts = {};
    for (const r of roles) counts[r] = (counts[r] || 0) + 1;
    const cardList = Object.entries(counts)
        .map(([r, n]) => `${ROLE_INFO[r].emoji} **${ROLE_INFO[r].label}**${n > 1 ? ` ×${n}` : ''}`)
        .join('\n');
    return new EmbedBuilder()
        .setTitle('⚙️ GAME SETTINGS')
        .setColor('#e74c3c')
        .setDescription(`**${playerCount} players** — Roles si random ah\n\n**CARDS IN PLAY:**\n${cardList}`)
        .setFooter({ text: 'Garaad Games • Werewolf' });
}

function lobbyRows(channelId) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ww_join_${channelId}`).setLabel('✅ Ku biir').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ww_leave_${channelId}`).setLabel('🚪 Ka bax').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ww_start_${channelId}`).setLabel('▶️ Bilow (Host)').setStyle(ButtonStyle.Primary),
    )];
}

function targetButtons(prefix, channelId, targets, style) {
    const rows = [];
    let row = new ActionRowBuilder();
    let n   = 0;
    for (const { uid, name } of targets) {
        if (n > 0 && n % 4 === 0) { rows.push(row); row = new ActionRowBuilder(); }
        row.addComponents(new ButtonBuilder()
            .setCustomId(`${prefix}_${channelId}_${uid}`)
            .setLabel(name.slice(0, 80))
            .setStyle(style));
        n++;
    }
    if (n === 0 || n % 4 !== 0) rows.push(row);
    return rows;
}

// ── Night phase ──────────────────────────────────────────────────────

async function startNight(state, channel, client) {
    state.phase = 'night';
    state.round++;
    state.night = {
        killVotes: {}, protectedId: null,
        seerDone: false, docDone: false, witchDone: false,
        witchHeal: false, witchKill: null, thiefDone: false, timer: null,
    };

    const alive  = alivePlayers(state);
    const wolves = aliveWolves(state);

    await channel.send({ embeds: [
        new EmbedBuilder()
            .setTitle(`🌙 Habeenka ${state.round}aad`)
            .setColor('#2c3e50')
            .setDescription('🌑 **Habeenku wuu yimid — tuulada oo dhan ayaa seexatay.**\n\n🐺 Yeyaasha ayaa dhaqdhaqaaqayaa...\n\n_DM-kooda jeceesha ayaa fariin u imaanaysaa._')
            .setFooter({ text: 'Garaad Games • Werewolf' }),
    ]});

    // DM wolf faction (all wolf types kill together; wolfshaman vote counts x2)
    const wolfNames = wolves.map(w => `${ROLE_INFO[state.players[w].role].emoji} ${state.players[w].name}`).join(', ');
    const killTargets = alive.filter(uid => !isWolfFaction(state.players[uid].role))
        .map(uid => ({ uid, name: state.players[uid].name }));

    const packChatRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ww_wchat_${state.channelId}`)
            .setLabel('💬 Fariin Pack-ka')
            .setStyle(ButtonStyle.Secondary),
    );

    for (const wolfId of wolves) {
        const user = await client.users.fetch(wolfId).catch(() => null);
        if (!user) continue;
        const info = ROLE_INFO[state.players[wolfId].role];
        const extra = state.players[wolfId].role === 'wolfshaman' ? '\n🔮 _Coddaadii wuxuu xoogga leeyahay 2 (pack vote)_' : '';
        await user.send({ embeds: [
            new EmbedBuilder()
                .setTitle(`${info.emoji} ${info.label} — Habeenka`)
                .setColor(info.color)
                .setDescription(`**Pack:** ${wolfNames}${extra}\n\n⬇️ **Doorso cid aad dili doontid:**`)
                .setFooter({ text: '90s gudahood doorso' }),
        ], components: targetButtons('ww_kill', state.channelId, killTargets, ButtonStyle.Danger) }).catch(() => {});
        await user.send({ embeds: [
            new EmbedBuilder()
                .setTitle('💬 Wolf Pack Chat')
                .setColor('#c0392b')
                .setDescription('📨 Pack-kaaga si sir ah fariin ugu dir.\n_(Kaliya wolves ayaa arkaya)_')
                .setFooter({ text: 'Garaad Werewolf • Pack Chat' }),
        ], components: [packChatRow] }).catch(() => {});
    }

    // DM seer
    const seerId = findAliveRole(state, 'seer');
    if (seerId) {
        const user = await client.users.fetch(seerId).catch(() => null);
        if (user) {
            const st = alive.filter(uid => uid !== seerId).map(uid => ({ uid, name: state.players[uid].name }));
            await user.send({ embeds: [
                new EmbedBuilder().setTitle('🔮 Seer — Habeenka').setColor('#9b59b6')
                    .setDescription('⬇️ **Doorso qof aad baadhi doontid:**')
                    .setFooter({ text: '90s gudahood doorso' }),
            ], components: targetButtons('ww_seer', state.channelId, st, ButtonStyle.Primary) }).catch(() => {});
        } else { state.night.seerDone = true; }
    } else { state.night.seerDone = true; }

    // DM doctor
    const docId = findAliveRole(state, 'doctor');
    if (docId) {
        const user = await client.users.fetch(docId).catch(() => null);
        if (user) {
            const dt = alive.map(uid => ({ uid, name: state.players[uid].name }));
            await user.send({ embeds: [
                new EmbedBuilder().setTitle('💉 Doctor — Habeenka').setColor('#27ae60')
                    .setDescription('⬇️ **Doorso qof aad habeenka ilaali doontid:**')
                    .setFooter({ text: '90s gudahood doorso' }),
            ], components: targetButtons('ww_doc', state.channelId, dt, ButtonStyle.Success) }).catch(() => {});
        } else { state.night.docDone = true; }
    } else { state.night.docDone = true; }

    // DM witch
    const witchId = findAliveRole(state, 'witch');
    if (witchId) {
        const wp = state.players[witchId];
        if (wp.witchHealUsed && wp.witchKillUsed) {
            state.night.witchDone = true;
        } else {
            const user = await client.users.fetch(witchId).catch(() => null);
            if (user) {
                const btnRow = new ActionRowBuilder();
                if (!wp.witchHealUsed) btnRow.addComponents(
                    new ButtonBuilder().setCustomId(`ww_witch_${state.channelId}_heal`).setLabel('🧪 Dawow (Heal)').setStyle(ButtonStyle.Success));
                if (!wp.witchKillUsed) btnRow.addComponents(
                    new ButtonBuilder().setCustomId(`ww_witch_${state.channelId}_poison`).setLabel('☠️ Sumu (Poison)').setStyle(ButtonStyle.Danger));
                btnRow.addComponents(
                    new ButtonBuilder().setCustomId(`ww_witch_${state.channelId}_skip`).setLabel('⏩ Xidid').setStyle(ButtonStyle.Secondary));
                await user.send({ embeds: [
                    new EmbedBuilder().setTitle('🧙 Witch — Habeenka').setColor('#1a5276')
                        .setDescription(
                            `🧪 Heal${wp.witchHealUsed ? ' ✅ Used' : ' (Available)'}\n` +
                            `☠️ Poison${wp.witchKillUsed ? ' ✅ Used' : ' (Available)'}\n\n**Maxaad samayn doontaa?**`)
                        .setFooter({ text: '90s gudahood doorso' }),
                ], components: [btnRow] }).catch(() => {});
            } else { state.night.witchDone = true; }
        }
    } else { state.night.witchDone = true; }

    // DM thief (night 1 only)
    const thiefId = state.round === 1 ? findAliveRole(state, 'thief') : null;
    if (thiefId) {
        const user = await client.users.fetch(thiefId).catch(() => null);
        if (user) {
            const pool = shuffle(alive.filter(uid => uid !== thiefId)).slice(0, 2)
                .map(uid => ({ uid, name: state.players[uid].name }));
            await user.send({ embeds: [
                new EmbedBuilder().setTitle('🗡️ Thief — Doorso Role').setColor('#616a6b')
                    .setDescription('**Xad role mid ka mid ah laba qof ee hoose.**\nQofkii aad doorato wuxuu noqon doonaa Villager.\n\n⬇️ **Doorso:**')
                    .setFooter({ text: '90s gudahood — haddaadan dooranin casri ahaan ayaad tahay' }),
            ], components: targetButtons('ww_thief', state.channelId, pool, ButtonStyle.Primary) }).catch(() => {});
        } else { state.night.thiefDone = true; }
    } else { state.night.thiefDone = true; }

    state.night.timer = setTimeout(() => processNight(state, channel, client), NIGHT_MS);
}

async function processNight(state, channel, client) {
    if (state.phase !== 'night') return;
    state.phase = 'processing';
    if (state.night.timer) { clearTimeout(state.night.timer); state.night.timer = null; }

    // Wolf kill tally — wolfshaman votes count x2
    const tally = {};
    for (const [wolfId, targetId] of Object.entries(state.night.killVotes)) {
        const w = state.players[wolfId]?.role === 'wolfshaman' ? 2 : 1;
        tally[targetId] = (tally[targetId] || 0) + w;
    }
    let killTarget = null;
    if (Object.keys(tally).length > 0) {
        killTarget = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    } else {
        const cands = alivePlayers(state).filter(uid => !isWolfFaction(state.players[uid].role));
        if (cands.length > 0) killTarget = cands[Math.floor(Math.random() * cands.length)];
    }

    const saved = killTarget === state.night.protectedId || state.night.witchHeal;
    const nightDeaths = [];
    let killedId = null;
    let knightRevenge = null;

    // Princess trap: wolves targeting princess = instant village win
    if (killTarget && !saved && state.players[killTarget]?.role === 'princess') {
        state.players[killTarget].alive = false;
        await channel.send({ embeds: [
            new EmbedBuilder().setTitle('👸 FEEJIGNAANTA!').setColor('#f1948a')
                .setDescription(`🚨 **Yeyaasha waxay isku deyeen inay **${state.players[killTarget].name}** (Princess) dilaan!**\n\nTuuladu way guulaysatay!`)
                .setFooter({ text: 'Garaad Games • Werewolf' }),
        ]});
        return endGame(state, channel, 'village');
    }

    // Knight: if wolves kill knight, a random wolf dies too
    if (killTarget && !saved && state.players[killTarget]?.role === 'knight') {
        const ws = aliveWolves(state);
        if (ws.length > 0) knightRevenge = ws[Math.floor(Math.random() * ws.length)];
    }

    if (killTarget && !saved) {
        state.players[killTarget].alive = false;
        killedId = killTarget;
        nightDeaths.push(killTarget);
    }

    if (knightRevenge && killedId) {
        state.players[knightRevenge].alive = false;
        nightDeaths.push(knightRevenge);
    }

    if (state.night.witchKill && state.players[state.night.witchKill]?.alive) {
        state.players[state.night.witchKill].alive = false;
        nightDeaths.push(state.night.witchKill);
    }

    await resolveHunter(state, channel, client, nightDeaths,
        () => startDay(state, channel, client, killedId, knightRevenge));
}

async function resolveHunter(state, channel, client, deaths, next) {
    const hunterDeath = deaths.find(uid => state.players[uid]?.role === 'hunter');
    if (!hunterDeath) return next();

    state.phase = 'hunter';
    const name    = state.players[hunterDeath].name;
    const targets = alivePlayers(state).map(uid => ({ uid, name: state.players[uid].name }));

    await channel.send({ embeds: [
        new EmbedBuilder().setTitle('🏹 Hunter — Aarsasho!').setColor('#e67e22')
            .setDescription(`🏹 **${name}** (Hunter) wuu dhintay — laakiin wuxuu xaq u leeyahay inuu qof dilo!\n\n_30s gudahood..._`)
            .setFooter({ text: 'Garaad Games • Werewolf' }),
    ]});

    state.hunterCallback = next;
    state.hunterTimer = setTimeout(() => {
        if (state.phase !== 'hunter') return;
        state.phase = 'processing';
        state.hunterCallback?.();
    }, HUNTER_MS);

    const user = await client.users.fetch(hunterDeath).catch(() => null);
    if (!user || targets.length === 0) { clearTimeout(state.hunterTimer); return next(); }

    await user.send({ embeds: [
        new EmbedBuilder().setTitle('🏹 Hunter — Doorso Cidda Aad Dili Doontid').setColor('#e67e22')
            .setDescription('Waxaad dhintay — laakiin waxaad haysataa mid iska dhibid!\n\n⬇️ **Doorso:**')
            .setFooter({ text: '30s gudahood doorso' }),
    ], components: targetButtons('ww_hunter', state.channelId, targets, ButtonStyle.Danger) }).catch(() => {});
}

// ── Day phase ─────────────────────────────────────────────────────────

async function startDay(state, channel, client, killedId, knightRevenge) {
    state.phase = 'day';
    const win = checkWin(state);
    if (win) return endGame(state, channel, win);

    const alive = alivePlayers(state);
    let desc = killedId
        ? `💀 **${state.players[killedId].name}** ayaa habeenkii la dilay! Doorashiisu: **${ROLE_INFO[state.players[killedId].role].emoji} ${ROLE_INFO[state.players[killedId].role].label}**\n\n`
        : '🛡️ **Cidna kuma dhicin!** — Qof ayaa la badbaadiyay!\n\n';

    if (knightRevenge) {
        const r = ROLE_INFO[state.players[knightRevenge].role];
        desc += `⚔️ Knight-ku intuu dhimanayey wuxuu gaaray **${state.players[knightRevenge].name}** (${r.label})!\n\n`;
    }
    if (state.night.witchKill && !state.players[state.night.witchKill]?.alive) {
        const wk = ROLE_INFO[state.players[state.night.witchKill]?.role];
        desc += `🧙 Witch-ku wuxuu summay **${state.players[state.night.witchKill].name}** (${wk?.label || '?'})!\n\n`;
    }

    await channel.send({ embeds: [
        new EmbedBuilder()
            .setTitle(`☀️ Maalinta ${state.round}aad — Dooda`)
            .setColor('#f39c12')
            .setDescription(desc +
                `**Nool (${alive.length}):** ${alive.map(uid => `<@${uid}>`).join(' ')}\n\n` +
                `💬 **Doodo!** Cod-bixintu **${Math.round(DISCUSS_MS / 1000)}s** gudahood waa furmaysaa.`)
            .setFooter({ text: 'Garaad Games • Werewolf' }),
    ]});

    state.vote = { votes: {}, msgRef: null };

    state.discussTimer = setTimeout(async () => {
        if (state.phase !== 'day') return;
        state.phase = 'vote';
        const vt   = alivePlayers(state).map(uid => ({ uid, name: state.players[uid].name }));
        const rows = [
            ...targetButtons('ww_vote', state.channelId, vt, ButtonStyle.Danger),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ww_skip_${state.channelId}`).setLabel('⏩ Xidid (Skip)').setStyle(ButtonStyle.Secondary)),
        ];
        const voteMsg = await channel.send({ embeds: [
            new EmbedBuilder().setTitle('🗳️ Cod-bixinta — Yey doorso!').setColor('#e74c3c')
                .setDescription(`**Cidda aad u maleynayso inay Yey tahay doorso!**\n👑 King = 2 cod.\n\n⏱️ **${Math.round(VOTE_MS / 1000)}s** ayaad haysataan.`)
                .setFooter({ text: 'Garaad Games • Werewolf' }),
        ], components: rows }).catch(() => null);
        if (voteMsg) state.vote.msgRef = voteMsg;
        state.voteTimer = setTimeout(() => processVotes(state, channel, client), VOTE_MS);
    }, DISCUSS_MS);
}

async function processVotes(state, channel, client) {
    if (state.phase !== 'vote') return;
    state.phase = 'processing';
    if (state.voteTimer)    { clearTimeout(state.voteTimer);    state.voteTimer    = null; }
    if (state.discussTimer) { clearTimeout(state.discussTimer); state.discussTimer = null; }
    if (state.vote?.msgRef) await state.vote.msgRef.edit({ components: [] }).catch(() => {});

    const tally = {};
    for (const [voterId, targetId] of Object.entries(state.vote?.votes || {})) {
        if (targetId === '__skip__') continue;
        const w = state.players[voterId]?.role === 'king' ? 2 : 1;
        tally[targetId] = (tally[targetId] || 0) + w;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    let eliminated = null;
    if (sorted.length > 0 && (sorted.length === 1 || sorted[0][1] > sorted[1][1]))
        eliminated = sorted[0][0];

    if (eliminated) {
        state.players[eliminated].alive = false;
        const eInfo = ROLE_INFO[state.players[eliminated].role];
        await channel.send({ embeds: [
            new EmbedBuilder().setTitle('⚖️ Natiijada Cod-bixinta').setColor('#e74c3c')
                .setDescription(`🗳️ Tuuladu waxay coddkooda u dhaafeen: **${state.players[eliminated].name}**\n\nDoorashiisu: **${eInfo.emoji} ${eInfo.label}**`)
                .setFooter({ text: 'Garaad Games • Werewolf' }),
        ]});
    } else {
        await channel.send({ embeds: [
            new EmbedBuilder().setTitle('⚖️ Cod-bixinta').setColor('#7f8c8d')
                .setDescription('🤝 **Codadku siman yihiin — cidna kuma dhicin!**')
                .setFooter({ text: 'Garaad Games • Werewolf' }),
        ]});
    }

    await resolveHunter(state, channel, client, eliminated ? [eliminated] : [], () => {
        const win = checkWin(state);
        if (win) return endGame(state, channel, win);
        setTimeout(() => startNight(state, channel, client), 4000);
    });
}

// ── End game ──────────────────────────────────────────────────────────

async function endGame(state, channel, winner) {
    state.phase = 'ended';
    if (state.night?.timer)  clearTimeout(state.night.timer);
    if (state.discussTimer)  clearTimeout(state.discussTimer);
    if (state.voteTimer)     clearTimeout(state.voteTimer);
    if (state.hunterTimer)   clearTimeout(state.hunterTimer);

    const cfg = {
        village:     { title: '🎉 Tuuladu Way Guulaysatay!',      color: '#2ecc71', desc: '🧑‍🌾 **Tuuladu waxay dishay dhammaan Yeyasha!**' },
        wolves:      { title: '🐺 Yeyasha Way Guulaysatay!',       color: '#c0392b', desc: '🐺 **Yeyasha waxay awood u yeesheen — tuulada waa la cuno!**' },
        necromancer: { title: '💀 Necromancer-ku Wuu Guulaystay!', color: '#212f3d', desc: '💀 **Dhimashadu waxay awood u yeeshay!**' },
    }[winner] || { title: '🎮 Dhammaad', color: '#95a5a6', desc: '' };

    const reveal = Object.entries(state.players)
        .map(([uid, p]) => `${ROLE_INFO[p.role].emoji} <@${uid}> — **${ROLE_INFO[p.role].label}**${p.alive ? '' : ' ☠️'}`)
        .join('\n');

    await channel.send({ embeds: [
        new EmbedBuilder()
            .setTitle(cfg.title).setColor(cfg.color)
            .setDescription(cfg.desc + '\n\n**Doorashada dadka oo dhan:**\n' + reveal)
            .setFooter({ text: 'Garaad Games • Werewolf' }),
    ]});
    activeWW.delete(state.channelId);
}

// ── startGame ─────────────────────────────────────────────────────────

async function startGame(state, channel, client) {
    const playerIds = Object.keys(state.players);
    const roles     = buildRoleset(playerIds.length);

    playerIds.forEach((uid, i) => Object.assign(state.players[uid], {
        role: roles[i], witchHealUsed: false, witchKillUsed: false, alphaRevealed: false,
    }));

    await channel.send({ embeds: [buildSettingsEmbed(roles, playerIds.length)] });
    await new Promise(r => setTimeout(r, 1500));

    for (const uid of playerIds) {
        const user = await client.users.fetch(uid).catch(() => null);
        if (!user) continue;
        await user.send({ embeds: [
            new EmbedBuilder()
                .setTitle('🃏 Kaadkaaagu Waa La Diyaariyay!')
                .setColor('#8e44ad')
                .setDescription(
                    `**${state.players[uid].name}** — ciyaartu waa bilaabatay!\n\n` +
                    `🎭 Doorashadaada waa la gacan geliyay.\n\n` +
                    `⬇️ **Guji badhanka si aad u aragto cidda aad tahay:**`
                )
                .setFooter({ text: 'Garaad Games • Werewolf — Qof kale ha u tustid! 🤫' }),
        ], components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ww_reveal_${state.channelId}_${uid}`)
                    .setLabel('🃏 Kaadhka Fur')
                    .setStyle(ButtonStyle.Primary),
            ),
        ]}).catch(() => {});
    }

    await channel.send({ embeds: [
        new EmbedBuilder()
            .setTitle('🐺 Werewolf — Ciyaartu Bilaabatay!').setColor('#8e44ad')
            .setDescription(`**${playerIds.length} qof** ayaa ka ciyaaraysa.\n\nDoorashooyinka DM-kooda ayaa loo diray — eeg!\n\n🌙 Habeenku wuxuu bilaabmayaa...`)
            .setFooter({ text: 'Garaad Games • Werewolf' }),
    ]});

    await new Promise(r => setTimeout(r, 3000));
    await startNight(state, channel, client);
}

// ── Command ───────────────────────────────────────────────────────────

module.exports = {
    activeWW, buildLobbyEmbed, lobbyRows, startGame, startNight,
    processNight, processVotes, endGame, nightComplete, resolveHunter,
    seerCheck, ROLE_INFO, MIN_PLAYERS, MAX_PLAYERS,
    aliveWolves, alivePlayers, isWolfFaction,

    async cmdWerewolf(message) {
        const channelId = message.channel.id;
        if (activeWW.has(channelId))
            return message.reply('⚠️ Channel-kan ciyaar ayaa hadda socota. Sug ilaa ay dhammaato.');
        const uid   = message.author.id;
        const name  = message.member?.displayName || message.author.username;
        const state = {
            channelId, hostId: uid, phase: 'lobby', round: 0,
            players:      { [uid]: { alive: true, role: null, name, witchHealUsed: false, witchKillUsed: false, alphaRevealed: false } },
            night: {}, vote: {}, lobbyMsg: null,
            discussTimer: null, voteTimer: null, hunterTimer: null, hunterCallback: null,
        };
        activeWW.set(channelId, state);
        const msg = await message.reply({ embeds: [buildLobbyEmbed(state)], components: lobbyRows(channelId) });
        state.lobbyMsg = msg;
        return msg;
    },
};
