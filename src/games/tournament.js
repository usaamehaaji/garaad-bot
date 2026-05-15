// =====================================================================
// TARTAN — Tournament (New Flow)
//
// 1. Admin: ?tartan → Bot posts to ANNOUNCE channel (24h registration)
// 2. Users click "📝 Diiwaan Geli" → code DM instantly
// 3. After 24h → auto-close, admin gets DM panel
// 4. Admin: clicks "▶️ Fur Tartanka" in DM (or ?tartan_bilow)
// 5. Bot posts in GAME channel: ?gal CODE
// 6. Users join with code, admin starts rounds
//
// Wareegyada: R1=25 | R2=20 | Final=15 su'aalood
// Dhibco: < 5s = 40pts | 18s = 5pts (timed)
// =====================================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const { isAdmin }            = require('../utils/admin');
const {
    activeTournament,
    tournamentRegistry,
    userData,
    saveData,
} = require('../store');
const { checkUser }          = require('../utils/helpers');
const { econData, checkEconUser, saveEcon } = require('../economy/econStore');
const { markUserPlayed }     = require('../utils/reminders');
const {
    pickQuestionsForGame,
    markSeenForUsersInGame,
    noQuestionsLeftEmbed,
} = require('../utils/questions');
const { getAnswerOptions } = require('../utils/questionOptions');
const {
    PREFIX,
    GLOBAL_WAIT_MS,
    SOLO_FAST_MS,
    SOLO_MAX_SCORE,
    SOLO_MIN_SCORE,
    TOURNAMENT_MIN_PLAYERS,
    TOURNAMENT_R1_QUESTIONS,
    TOURNAMENT_R2_QUESTIONS,
    TOURNAMENT_FINAL_QUESTIONS,
} = require('../config');

// ── Channel IDs ──────────────────────────────────────────────────────
const ANNOUNCE_CHANNEL_ID = '1490233695624364123';
const GAME_CHANNEL_ID     = '1504430434895921193';
const VC_CHANNEL_ID       = '1504130784368525553';
const REG_DURATION_MS     = 24 * 60 * 60 * 1000; // 24 saacadood

const ROUND_LABELS = {
    1: { name: 'Wareegga 1aad',        color: '#e67e22', questions: TOURNAMENT_R1_QUESTIONS    },
    2: { name: 'Wareegga 2aad (Semi)', color: '#8e44ad', questions: TOURNAMENT_R2_QUESTIONS    },
    3: { name: 'Final 🏆',             color: '#c0392b', questions: TOURNAMENT_FINAL_QUESTIONS },
};

function calcScore(ms) {
    if (ms <= SOLO_FAST_MS) return SOLO_MAX_SCORE;
    const ratio = (ms - SOLO_FAST_MS) / (GLOBAL_WAIT_MS - SOLO_FAST_MS);
    return Math.max(SOLO_MIN_SCORE, Math.round(SOLO_MAX_SCORE - (SOLO_MAX_SCORE - SOLO_MIN_SCORE) * ratio));
}

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function roundQuestionCount(idx) {
    return ROUND_LABELS[idx]?.questions ?? TOURNAMENT_R1_QUESTIONS;
}

function computeSurvivors(survivorIds, roundScoreMap, roundIdx) {
    const list = [...survivorIds]
        .map(id => [id, roundScoreMap[id] || 0])
        .sort((a, b) => b[1] - a[1]);

    let keepCount;
    if (roundIdx === 1) {
        const eliminate = Math.max(1, Math.floor(list.length / 6));
        keepCount = Math.max(2, list.length - eliminate);
    } else {
        const eliminate = Math.max(1, Math.floor(list.length / 5));
        const afterElim = Math.max(2, list.length - eliminate);
        keepCount = Math.max(2, Math.floor(afterElim / 2));
    }
    return list.slice(0, keepCount).map(x => x[0]);
}

// ─────────────────────────────────────────────────────────────────────
// Announcement Embed & Buttons
// ─────────────────────────────────────────────────────────────────────
function buildAnnounceEmbed(deadline, regCount, closed = false) {
    const timeLeft = Math.max(0, deadline - Date.now());
    const hours    = Math.floor(timeLeft / 3600000);
    const mins     = Math.floor((timeLeft % 3600000) / 60000);

    const regStatus = closed
        ? `🔒 **Diiwaangelinta waa la xiray** · **${regCount}** qof ayaa diiwaangeliyay`
        : `⏰ **Diiwaangelinta xirnaanaysaa:** ${hours > 0 ? `${hours}s ` : ''}${mins}d\n👥 **Diiwaangeliyay:** **${regCount}** qof\n\n_Riix 📝 Diiwaan Geli si aad code u heshid_ ⬇️`;

    return new EmbedBuilder()
        .setTitle('🏆 TARTAN — Garaad Quiz Tournament')
        .setColor(closed ? '#95a5a6' : '#e67e22')
        .setDescription(
            `@everyone — **Tartan ayaa bilaabmayaa!** 🎉\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 **WAREEGYADA:**\n` +
            `🔸 Wareeg 1 — **${TOURNAMENT_R1_QUESTIONS} su'aalood**\n` +
            `🔸 Wareeg 2 (Semi-Final) — **${TOURNAMENT_R2_QUESTIONS} su'aalood**\n` +
            `🔸 Final 🏆 — **${TOURNAMENT_FINAL_QUESTIONS} su'aalood**\n\n` +
            `⚡ Dhibco: < 5s = **40pts** · 18s = **5pts** (ku xidhan xawliga)\n` +
            `🧠 MCQ (ABCD) + Run/Been · Af-Soomaali\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 **TILAABOOYINKA:**\n` +
            `**1.** Riix **📝 Diiwaan Geli** — code DM-kaaga ku yimaadaa isla markiiba\n` +
            `**2.** Marka admin game furo: tag 💬 <#${GAME_CHANNEL_ID}>\n` +
            `**3.** Qor: \`${PREFIX}gal CODE\` (code-kaagu DM-ka ayuu ku jiraa)\n\n` +
            `🎙️ **Voice Channel:** <#${VC_CHANNEL_ID}>\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏆 **Guuleystaha:** **Champion 🏆** title + abaalmarin\n\n` +
            regStatus
        )
        .setFooter({ text: 'Garaad Quiz Tournament • ?tartan_status — xaaladda' });
}

function buildAnnounceButtons(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tournament_rules')
            .setLabel('📖 Xeerarka')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('tournament_register')
            .setLabel('📝 Diiwaan Geli')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
    );
}

// ─────────────────────────────────────────────────────────────────────
// Auto-close registration after 24h → DM admin panel
// ─────────────────────────────────────────────────────────────────────
async function closeRegistration(state) {
    if (!activeTournament.has(GAME_CHANNEL_ID)) return;
    if (state._regTimer) { clearTimeout(state._regTimer); state._regTimer = null; }
    if (state.stage !== 'registration') return;
    state.stage = 'join';

    const regCount = tournamentRegistry.size;

    // Disable buttons on announcement message
    try {
        const ch  = await state.client.channels.fetch(ANNOUNCE_CHANNEL_ID);
        const msg = await ch.messages.fetch(state.announceMsgId);
        await msg.edit({
            embeds:     [buildAnnounceEmbed(0, regCount, true)],
            components: [buildAnnounceButtons(true)],
        });
    } catch {}

    // Send admin DM with control panel
    try {
        const admin = await state.client.users.fetch(state.adminId);
        await admin.send({
            embeds: [new EmbedBuilder()
                .setTitle('🏁 Tartan — Diiwaangelinta Waa Dhammaatay')
                .setColor('#2ecc71')
                .setDescription(
                    `✅ **24 saacadood waa dhammaadeen**\n\n` +
                    `👥 **Diiwaangeliyay:** **${regCount}** qof\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `**Marka aad diyaar tahay:**\n` +
                    `Riix **▶️ Fur Tartanka** — bot wuxuu <#${GAME_CHANNEL_ID}> ku qori doonaa\n` +
                    `Kadib dadka waxay qori karaan \`${PREFIX}gal CODE\``
                )
            ],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`tartan_open_${GAME_CHANNEL_ID}`)
                    .setLabel('▶️ Fur Tartanka')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`tartan_reg_count_${GAME_CHANNEL_ID}`)
                    .setLabel('👥 Tirada')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`tartan_cancel_${GAME_CHANNEL_ID}`)
                    .setLabel('🛑 Jooji')
                    .setStyle(ButtonStyle.Danger),
            )],
        });
    } catch {}
}

// ─────────────────────────────────────────────────────────────────────
// Open game phase — post in GAME channel (called by button or cmdOpen)
// ─────────────────────────────────────────────────────────────────────
async function openGamePhase(client, adminId) {
    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (!state || state.stage !== 'join') return false;

    const gameChannel = await client.channels.fetch(GAME_CHANNEL_ID).catch(() => null);
    if (!gameChannel) return false;

    state.channel = gameChannel;
    const regCount = tournamentRegistry.size;

    await gameChannel.send({
        embeds: [new EmbedBuilder()
            .setTitle('🏁 Tartan — Albaabka Waa Furan Yahay!')
            .setColor('#2ecc71')
            .setDescription(
                `**Admin:** <@${adminId}>\n` +
                `👥 **Diiwaangeliyay:** **${regCount}** qof\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📝 **Si aad u biirtid tartanka:**\n` +
                `Qor: \`${PREFIX}gal CODE\`\n` +
                `_(code-kaagu DM-kaaga tartan ayuu ku jiraa)_\n\n` +
                `🎙️ Voice Channel: <#${VC_CHANNEL_ID}>\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `_Marka dadku diyaar yihiin, admin ayaa wareegga bilaabi doona._`
            )
        ],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tartan_bilow_next_${GAME_CHANNEL_ID}`)
                .setLabel('🚀 Bilow Wareeg 1aad (Admin Only)')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`tartan_bilow_status_${GAME_CHANNEL_ID}`)
                .setLabel('👥 Tirada Hadda')
                .setStyle(ButtonStyle.Secondary),
        )],
    });
    return true;
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan — Admin: dhawaaq + bilow 24h registration
// ─────────────────────────────────────────────────────────────────────
async function cmdAnnounce(message) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Kaliya **admin** ayaa tartan ku dhawaaqin kara.');
    }
    if (activeTournament.has(GAME_CHANNEL_ID)) {
        return message.reply(`⚠️ Tartan horeba socdaa. Jooji marka hore: \`${PREFIX}tartan_jooji\``);
    }

    const announceChannel = await message.client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
    if (!announceChannel) {
        return message.reply('⚠️ Announcement channel-ka la heyn waayay.');
    }

    const deadline = Date.now() + REG_DURATION_MS;
    tournamentRegistry.clear();

    const state = {
        channelId:            GAME_CHANNEL_ID,
        adminId:              message.author.id,
        client:               message.client,
        stage:                'registration',
        roundIdx:             0,
        players:              new Set(),
        survivors:            new Set(),
        totalScores:          {},
        roundScores:          {},
        prevRoundQuestions:   [],
        _nextSurvivors:       null,
        questions:            [],
        currentQ:             0,
        channel:              null,
        registrationDeadline: deadline,
        announceMsgId:        null,
        _regTimer:            null,
    };
    activeTournament.set(GAME_CHANNEL_ID, state);

    const msg = await announceChannel.send({
        content:    '@everyone',
        embeds:     [buildAnnounceEmbed(deadline, 0)],
        components: [buildAnnounceButtons(false)],
    });
    state.announceMsgId = msg.id;

    // 24h auto-close
    state._regTimer = setTimeout(() => closeRegistration(state), REG_DURATION_MS);

    return message.reply(
        `✅ **Announcement waa la daabacay!** → <#${ANNOUNCE_CHANNEL_ID}>\n` +
        `⏰ Diiwaangelinta waxay xirnaanaysaa **24 saacadood** kadib.\n` +
        `Marka ay xirnaato waxaad heli doontaa **DM panel** si aad tartanka u furato.`
    );
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan_bilow — Admin: force-open game (early or after 24h)
// ─────────────────────────────────────────────────────────────────────
async function cmdOpen(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Kaliya admin.');

    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (!state) return message.reply(`⚠️ Tartan ma jiro. Ugu horreyn \`${PREFIX}tartan\` qoro.`);

    if (state.stage === 'registration') {
        // Early close
        if (state._regTimer) { clearTimeout(state._regTimer); state._regTimer = null; }
        await closeRegistration(state);
        // closeRegistration sets stage to 'join'
    }

    if (state.stage !== 'join') {
        return message.reply('⚠️ Tartan heer kale ayuu ku jiraa (play ama pause).');
    }

    const ok = await openGamePhase(message.client, message.author.id);
    if (!ok) return message.reply('⚠️ Game channel-ka la heyn waayay.');
    return message.reply(`✅ **Game channel waa la furay!** → <#${GAME_CHANNEL_ID}>`);
}

// ─────────────────────────────────────────────────────────────────────
// ?isdiiwaangeli / ?diiwaan — User: hel code (command backup)
// ─────────────────────────────────────────────────────────────────────
async function cmdRegister(message) {
    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (!state || state.stage !== 'registration') {
        return message.reply('⚠️ Diiwaangelinta waa la xiray ama tartan ma jiro.');
    }
    await sendRegistrationCode(message.author, { reply: (o) => message.reply(o) });
}

// Shared helper — send code via DM (used by button + command)
async function sendRegistrationCode(user, replyTarget) {
    const uid  = user.id;
    const code = genCode();
    tournamentRegistry.set(uid, { code, at: Date.now() });
    try {
        await user.send({
            embeds: [new EmbedBuilder()
                .setTitle('🏁 Tartan — Code-kaaga Gaarka ah')
                .setDescription(
                    `✅ **Waxaad ku guulaysatay diiwaangelinta!**\n\n` +
                    `Code-gaaga waa:\n\n# \`${code}\`\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `**Marka admin game furo:**\n` +
                    `1. Tag 💬 <#${GAME_CHANNEL_ID}>\n` +
                    `2. Qor: \`${PREFIX}gal ${code}\`\n\n` +
                    `⚠️ **Code-kan ha u shegin qof kale — kuu gaarka ah!**`
                )
                .setColor('#2ecc71')
                .setFooter({ text: 'Garaad Quiz Tournament' })],
        });
        return replyTarget?.reply({ content: '✅ **Code-gaaga waa laguugu diray DM!** Fur farrimahaaga gaarka ah.', flags: 64 });
    } catch {
        return replyTarget?.reply({ content: '❌ DM-kaaga ma furan. Settings → Privacy → Allow DMs ka fur, ka dibna isku day.', flags: 64 });
    }
}

// ─────────────────────────────────────────────────────────────────────
// ?gal [code] — Join (game channel only)
// ─────────────────────────────────────────────────────────────────────
async function cmdJoin(message, args) {
    if (message.channel.id !== GAME_CHANNEL_ID) {
        return message.reply(`⚠️ \`${PREFIX}gal\` kaliya <#${GAME_CHANNEL_ID}> ku qor!`);
    }

    const code = (args[0] || '').trim().toUpperCase();
    if (!code) return message.reply(`⚠️ Code-ka qor! Tusaale: \`${PREFIX}gal ABC123\``);

    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (!state || state.stage !== 'join') {
        return message.reply(`⚠️ Albaabka tartanka weli ma furan. Sug admin.`);
    }

    const reg = tournamentRegistry.get(message.author.id);
    if (!reg || reg.code !== code) {
        return message.reply(
            `❌ **Code khalad** ama **maadan diiwaangelinin!**\n\n` +
            `• Haddii code-kaagu DM-ka ku jiro: hubi saxnimada\n` +
            `• Haddii kale: riix **📝 Diiwaan Geli** <#${ANNOUNCE_CHANNEL_ID}>`
        );
    }
    if (state.players.has(message.author.id)) {
        return message.reply('✅ Mar hore ayaad tartanka ku jirtaa! Sug bilaabidda.');
    }

    state.players.add(message.author.id);
    state.totalScores[message.author.id] = 0;
    checkUser(message.author.id);

    const list = [...state.players].map((id, i) => `${i + 1}. <@${id}>`).join('\n');
    return message.reply(
        `✅ **<@${message.author.id}> wuu ku biiray tartanka!** 🎉\n\n` +
        `**Ka qaybgalayaasha (${state.players.size}):**\n${list}`
    );
}

// ─────────────────────────────────────────────────────────────────────
// ?admin_next — bilow / sii wad wareeg
// ─────────────────────────────────────────────────────────────────────
async function cmdAdminNext(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Kaliya admin.');
    message.delete().catch(() => {});

    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (!state) return message.channel.send(`⚠️ Tartan ma jiro.`);

    if (state.prevRoundQuestions?.length > 0) {
        const recap  = state.prevRoundQuestions.map((q, i) => `**${i + 1}.** ${q.question}\n↳ ✅ **${q.correct}**`).join('\n\n');
        const chunks = [];
        let cur      = '';
        for (const line of recap.split('\n\n')) {
            if ((cur + '\n\n' + line).length > 3800) { chunks.push(cur); cur = line; }
            else { cur = cur ? cur + '\n\n' + line : line; }
        }
        if (cur) chunks.push(cur);
        for (let i = 0; i < chunks.length; i++) {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`📋 ${ROUND_LABELS[state.roundIdx]?.name || 'Wareeg'} — Su'aalihii & Jawaabihii${chunks.length > 1 ? ` (${i+1}/${chunks.length})` : ''}`)
                    .setDescription(chunks[i])
                    .setColor('#7f8c8d')],
            });
        }
        state.prevRoundQuestions = [];
    }

    if (state.stage === 'join') {
        if (state.players.size < TOURNAMENT_MIN_PLAYERS) {
            return message.channel.send(`⚠️ Ugu yaraan **${TOURNAMENT_MIN_PLAYERS}** qof. Hadda: **${state.players.size}**`);
        }
        state.survivors = new Set(state.players);
        state.roundIdx  = 1;
        return beginRound(state, message.channel);
    }
    if (state.stage === 'pause') {
        const next           = state._nextSurvivors || [];
        state.survivors      = new Set(next);
        state._nextSurvivors = null;
        if (state.survivors.size === 0) {
            activeTournament.delete(GAME_CHANNEL_ID);
            return message.channel.send('❌ Cidna kuma hartay — tartan waa la joojiyay.');
        }
        state.roundIdx += 1;
        return beginRound(state, message.channel);
    }
    return message.channel.send('⚠️ Hadda admin_next looma isticmaali karo — sug wareeggu dhammaado.');
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan_jooji
// ─────────────────────────────────────────────────────────────────────
async function cmdStop(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Kaliya admin.');
    if (!activeTournament.has(GAME_CHANNEL_ID)) return message.reply('⚠️ Tartan ma jiro.');
    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (state?._regTimer) clearTimeout(state._regTimer);
    activeTournament.delete(GAME_CHANNEL_ID);
    return message.reply('🛑 **Tartan-ka waa la joojiyay.**');
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan_status
// ─────────────────────────────────────────────────────────────────────
async function cmdStatus(message) {
    const state = activeTournament.get(GAME_CHANNEL_ID);
    if (!state) return message.reply('⚠️ Hadda ma jiro tartan soconaya.');

    const stageLabels = {
        registration: '📝 Diiwaangelinta socotaa (24h)',
        join:         '🟢 Albaabka furan — `?gal CODE`',
        play:         '🔴 Wareeggu socdaa',
        pause:        '🟡 Joog — admin sug `?admin_next`',
    };
    const regCount = tournamentRegistry.size;

    const sorted = [...state.survivors]
        .map(id => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1]);

    const board = sorted.slice(0, 8).map(([id, sc], i) => {
        const icon = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        return `${icon} <@${id}> — **${sc}pts**`;
    }).join('\n') || '_Ma jiraan ka qaybgalayaal_';

    const totalQ   = state.questions?.length || 0;
    const answered = state.currentQ || 0;

    await message.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('📊 Tartan — Xaaladda Hadda')
            .setDescription(
                `**Xaaladda:** ${stageLabels[state.stage] || state.stage}\n` +
                `**Wareeg:** ${ROUND_LABELS[state.roundIdx]?.name || '—'}\n` +
                `**Diiwaangeliyay:** ${regCount} qof\n` +
                `**Tartamayaasha:** ${state.survivors.size || state.players.size} qof\n` +
                (totalQ > 0 ? `**Su'aalo hadhay:** ${Math.max(0, totalQ - answered)} / ${totalQ}\n\n` : '\n') +
                `**🏅 Dhibcaha:**\n${board}`
            )
            .setColor('#3498db')
            .setFooter({ text: 'Garaad Quiz — Tartan Status' })],
    });
}

// ─────────────────────────────────────────────────────────────────────
// beginRound
// ─────────────────────────────────────────────────────────────────────
async function beginRound(state, channel) {
    state.channel = channel;
    const n      = roundQuestionCount(state.roundIdx);
    const meta   = ROUND_LABELS[state.roundIdx];
    const picked = pickQuestionsForGame(state.adminId, 'tournament', n);

    if (!picked || picked.length === 0) {
        activeTournament.delete(GAME_CHANNEL_ID);
        return channel.send({ embeds: [noQuestionsLeftEmbed('Admin')] });
    }

    let useN = n;
    if (picked.length < n) {
        useN = picked.length;
        await channel.send(`📚 Su'aalo cusub: **${useN}** kaliya (halkii ${n}).`);
    }

    state.questions          = picked;
    state.prevRoundQuestions = [];
    state.currentQ           = 0;
    state.roundScores        = {};
    for (const id of state.survivors) state.roundScores[id] = 0;
    state.stage = 'play';

    for (const id of state.survivors) markUserPlayed(id);

    let elimInfo = '';
    if (state.roundIdx === 1) {
        const toElim = Math.max(1, Math.floor(state.survivors.size / 6));
        const toKeep = Math.max(2, state.survivors.size - toElim);
        elimInfo = `⚠️ Dhammaadka: **${toElim}** qof baxayaa — **${toKeep}** qof Wareeg 2-da galeysa`;
    } else if (state.roundIdx === 2) {
        const toElim = Math.max(1, Math.floor(state.survivors.size / 5));
        const afterE = Math.max(2, state.survivors.size - toElim);
        const toFin  = Math.max(2, Math.floor(afterE / 2));
        elimInfo = `⚠️ Dhammaadka: **${toFin}** qof kaliya Final-ka galeysa`;
    } else {
        elimInfo = `🏆 **Final** — Guuleystaha hal qof! **Champion 🏆** title!`;
    }

    const playersList = [...state.survivors].map((id, i) => `${i + 1}. <@${id}>`).join('\n');

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`🏁 ${meta.name} — Bilaabmay!`)
            .setDescription(
                `**Ka qaybgalayaasha:** ${state.survivors.size} qof\n` +
                `**Su'aalo:** ${useN}\n` +
                `**Dhibco/su'aal:** < 5s = **40pts** · 18s = **5pts**\n\n` +
                `${elimInfo}\n\n` +
                `**Tartamayaasha:**\n${playersList}\n\n` +
                `_Su'aalaha waxay bilaabmayaan 3 ilbiriqsi gudahood..._`
            )
            .setColor(meta.color)],
    });

    setTimeout(() => sendQuestion(state), 3000);
}

// ─────────────────────────────────────────────────────────────────────
// sendQuestion
// ─────────────────────────────────────────────────────────────────────
async function sendQuestion(state) {
    if (!activeTournament.has(GAME_CHANNEL_ID) || state.stage !== 'play') return;
    const totalQ = state.questions.length;

    if (state.currentQ >= totalQ) {
        for (const id of state.survivors) {
            state.totalScores[id] = (state.totalScores[id] || 0) + (state.roundScores[id] || 0);
        }
        if (state.roundIdx === 3) return finishTournament(state);
        return endRoundPause(state);
    }

    const channel = state.channel;
    if (!channel) { activeTournament.delete(GAME_CHANNEL_ID); return; }

    const q         = state.questions[state.currentQ];
    const playerIds = [...state.survivors];
    markSeenForUsersInGame(playerIds, 'tournament', q._idx);
    saveData();

    state.prevRoundQuestions.push({ question: q.question, correct: q.correct });

    const answeredBy     = new Set();
    const correctAnswers = [];
    const startTime      = Date.now();

    const meta    = ROUND_LABELS[state.roundIdx];
    const isTF    = ['tf', 'truefalse', 'bool'].includes((q.type || '').toLowerCase());
    const typeTag = isTF ? '🔀 **Run / Been**' : '📝 **ABCD**';

    const embed = new EmbedBuilder()
        .setTitle(`🏁 ${meta.name} — Su'aal ${state.currentQ + 1}/${totalQ}`)
        .setDescription(
            `## ${q.question}\n\n` +
            `${typeTag} · ⏱️ ${GLOBAL_WAIT_MS / 1000}s\n` +
            `⚡ < 5s = **40pts** · 18s = **5pts** — tartamayaasha: **${state.survivors.size}**`
        )
        .setColor(meta.color);

    const qEntries = getAnswerOptions(q);
    if (qEntries.length === 0) {
        state.currentQ++;
        setTimeout(() => sendQuestion(state), 400);
        return;
    }

    const correctLabel = qEntries.find(e => e.isCorrect)?.label ?? String(q.correct);

    const buttons = qEntries.map((e, index) =>
        new ButtonBuilder()
            .setCustomId(`tna_${GAME_CHANNEL_ID}_${state.roundIdx}_${state.currentQ}_${index}_${e.isCorrect ? 't' : 'f'}`)
            .setLabel(e.label.slice(0, 80))
            .setStyle(isTF
                ? (e.label === 'Run' ? ButtonStyle.Success : ButtonStyle.Danger)
                : ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (!msg) { activeTournament.delete(GAME_CHANNEL_ID); return; }

    const prefix    = `tna_${GAME_CHANNEL_ID}_${state.roundIdx}_${state.currentQ}_`;
    const filter    = (i) => i.customId.startsWith(prefix) && state.survivors.has(i.user.id);
    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS });

    collector.on('collect', async (interaction) => {
        const uid = interaction.user.id;
        if (answeredBy.has(uid)) {
            return interaction.reply({ content: '⚠️ Mar hore ayaad jawaab bixisay!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        answeredBy.add(uid);
        const isCorrect = interaction.customId.endsWith('_t');
        const timeTaken = Date.now() - startTime;

        if (isCorrect) {
            const pts  = calcScore(timeTaken);
            const rank = correctAnswers.length + 1;
            correctAnswers.push({ uid, timeMs: timeTaken, pts });
            const medal = ['🥇', '🥈', '🥉'][rank - 1] || `${rank}aad`;
            await interaction.reply({
                content: `✅ **SAX!** ${medal} — **+${pts} pts** (${(timeTaken / 1000).toFixed(1)}s)`,
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Khalad. Isku day su\'aasha xiga!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    });

    collector.on('end', async () => {
        for (const { uid, pts } of correctAnswers) {
            state.roundScores[uid] = (state.roundScores[uid] || 0) + pts;
        }

        let resultLine;
        if (correctAnswers.length === 0) {
            resultLine = `⏰ Cidna si sax ah uma jawaabin.\n✅ Jawaabta saxda: **${correctLabel}**`;
        } else {
            const topList = correctAnswers.slice(0, 5)
                .map(({ uid, timeMs, pts }, i) => {
                    const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                    return `${medal} <@${uid}> — ${(timeMs / 1000).toFixed(1)}s → **+${pts}pts**`;
                }).join('\n');
            resultLine = `✅ Jawaabta saxda: **${correctLabel}**\n\n${topList}`;
        }

        const board = [...state.survivors]
            .map(id => [id, state.roundScores[id] || 0])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id, sc], i) => `${i + 1}. <@${id}> — **${sc}pts**`)
            .join('\n');

        const sumEmbed = EmbedBuilder.from(embed)
            .setDescription(`## ${q.question}\n\n${resultLine}\n\n📊 **Dhibcaha Wareegga:**\n${board || '—'}`);

        await msg.edit({ embeds: [sumEmbed], components: [] }).catch(() => {});
        state.currentQ += 1;
        setTimeout(() => sendQuestion(state), 2500);
    });
}

// ─────────────────────────────────────────────────────────────────────
// endRoundPause
// ─────────────────────────────────────────────────────────────────────
async function endRoundPause(state) {
    const channel        = state.channel;
    const nextSurvivors  = computeSurvivors(state.survivors, state.roundScores, state.roundIdx);
    state._nextSurvivors = nextSurvivors;

    const eliminated = [...state.survivors].filter(id => !nextSurvivors.includes(id));
    const remaining  = nextSurvivors;

    const totalBoard = [...state.survivors]
        .map(id => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1])
        .map(([id, sc], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            const tag   = eliminated.includes(id) ? '❌ Eliminated' : '✅ Qualified';
            return `${medal} <@${id}> — **${sc}pts** · ${tag}`;
        }).join('\n');

    const nextRoundName  = state.roundIdx === 1
        ? `Wareegga 2aad (${TOURNAMENT_R2_QUESTIONS} su'aalood)`
        : `Final 🏆 (${TOURNAMENT_FINAL_QUESTIONS} su'aalood)`;
    const remainingList  = remaining.map((id, i) => `✅ ${i + 1}. <@${id}> — Qualified`).join('\n');
    const eliminatedList = eliminated.length > 0
        ? eliminated.map(id => `❌ <@${id}> — Eliminated · Players Out`).join('\n')
        : '_Cidna ma bixin_';

    state.stage      = 'pause';
    state.roundScores = {};
    if (!channel) return;

    const nextLabel = state.roundIdx === 1
        ? `🚀 Bilow Wareeg 2aad (${TOURNAMENT_R2_QUESTIONS} su'aalood)`
        : `🏆 Bilow Final (${TOURNAMENT_FINAL_QUESTIONS} su'aalood)`;

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`⏸️ ${ROUND_LABELS[state.roundIdx].name} — Dhamaaday!`)
            .setDescription(
                `**📊 Dhibcaha Guud:**\n${totalBoard}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `**❌ Eliminated — Players Out (${eliminated.length}):**\n${eliminatedList}\n\n` +
                `**✅ Qualified — ${nextRoundName} (${remaining.length}):**\n${remainingList}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `⬇️ **Admin:** Riix badhanka si wareegga xiga loo bilaabo`
            )
            .setColor('#f39c12')],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tournament_admin_next_${GAME_CHANNEL_ID}`)
                .setLabel(nextLabel)
                .setStyle(ButtonStyle.Danger),
        )],
    });
}

// ─────────────────────────────────────────────────────────────────────
// finishTournament
// ─────────────────────────────────────────────────────────────────────
async function finishTournament(state) {
    const channel = state.channel;
    activeTournament.delete(GAME_CHANNEL_ID);

    const sorted = [...state.survivors]
        .map(id => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        if (channel) await channel.send({ embeds: [new EmbedBuilder().setTitle('🏁 Tartan').setDescription('Cidna kuma hadhin.').setColor('#95a5a6')] });
        return;
    }

    const [winId, winScore] = sorted[0];

    checkUser(winId);
    if (!userData[winId].ownedTitles) userData[winId].ownedTitles = [];
    if (!userData[winId].ownedTitles.includes('champion')) userData[winId].ownedTitles.push('champion');
    userData[winId].activeTitle = 'champion';
    checkEconUser(winId);
    econData[winId].usd += 500;
    saveEcon();
    saveData();

    const allScores = sorted.map(([id, sc], i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        const extra = i === 0 ? ' 👑 GUULEYSTAHA' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : '';
        return `${medal} <@${id}> — **${sc}pts**${extra}`;
    }).join('\n');

    if (channel) {
        await channel.send({
            content: '@everyone',
            embeds: [new EmbedBuilder()
                .setTitle('🏆  T A R T A N  —  D H A M A A D A Y !')
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `👑  **GUULEYSTAHA**\n` +
                    `## <@${winId}>\n` +
                    `🏆 **Champion** title ayaa kuu galay!\n` +
                    `📊 Dhibcahaaga guud: **${winScore}pts**\n` +
                    `💰 Bonus: **+$500 USD**\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**🏅 Natiijada Guud:**\n\n${allScores}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `_Mahadsanid ka qaybgalashada Tartan Garaad Quiz! 🎉_`
                )
                .setColor('#FFD700')
                .setFooter({ text: 'Garaad Quiz — Tournament' })],
        });
    }
}

module.exports = {
    cmdAnnounce,
    cmdRegister,
    cmdOpen,
    cmdJoin,
    cmdAdminNext,
    cmdStop,
    cmdStatus,
    beginRound,
    openGamePhase,
    sendRegistrationCode,
    GAME_CHANNEL_ID,
    ANNOUNCE_CHANNEL_ID,
};
