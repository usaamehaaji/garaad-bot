// =====================================================================
// TARTAN — Tournament Game
// ?tartan (admin announce + Register button)
// ?tartan_bilow (admin furo albaabka)
// ?isdiiwaangeli (user hel code DM)
// ?gal CODE (user ku biir channel-ka)
// ?admin_next (admin bilow/sii wad wareeg)
// ?tartan_status (xaaladda tartanka)
// ?tartan_jooji (admin jooji)
//
// Wareegyada: R1=25 | R2=20 | Final=15 su'aalood
// Dhibco: max 40 (<5s) → min 5 (18s) — ku xidhan xawliga
// Su'aalo: MCQ (ABCD) + True/False (Run/Been)
// Ka-saar: R1→R2 baxa 1/6 | R2→Final badh baxaan
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
    activeQuiz,
    userData,
    saveData,
} = require('../store');
const { checkUser, addXp }   = require('../utils/helpers');
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

const ROUND_LABELS = {
    1: { name: 'Wareegga 1aad',        color: '#e67e22', questions: TOURNAMENT_R1_QUESTIONS    },
    2: { name: 'Wareegga 2aad (Semi)', color: '#8e44ad', questions: TOURNAMENT_R2_QUESTIONS    },
    3: { name: 'Final 🏆',             color: '#c0392b', questions: TOURNAMENT_FINAL_QUESTIONS },
};

// ── Xisaabi dhibco ku xidhan xawliga ─────────────────────────────────
function calcScore(timeMsAnswered) {
    if (timeMsAnswered <= SOLO_FAST_MS) return SOLO_MAX_SCORE;
    const ratio = (timeMsAnswered - SOLO_FAST_MS) / (GLOBAL_WAIT_MS - SOLO_FAST_MS);
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

// ── Ka-saarida ─────────────────────────────────────────────────────────
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
// ?tartan — Admin: dhawaaq + Register button (dadkuba arki karaan)
// ─────────────────────────────────────────────────────────────────────
async function cmdAnnounce(message) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Kaliya **admin** ayaa tartan ku dhawaaqin kara.');
    }

    const embed = new EmbedBuilder()
        .setTitle('🏁 TARTAN — Garaad Quiz Tournament')
        .setColor('#e67e22')
        .setDescription(
            `@everyone — **Tartan ayaa bilaabmayaa!** 🎉\n\n` +

            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 **TILAABOOYINKA:**\n\n` +
            `**1️⃣** Guji **📝 Register** — code DM-kaaga kuugu yimaadaa\n` +
            `**2️⃣** Tag **Voice Channel** tartanka (haddii la rabay)\n` +
            `**3️⃣** Marka admin \`${PREFIX}tartan_bilow\` qoro, channel-ka qor:\n` +
            `   → \`${PREFIX}gal CODE\` (code-kaaga DM-ka ku jira)\n` +
            `**4️⃣** Admin qoraa \`${PREFIX}admin_next\` si wareegga bilaabo\n\n` +

            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📚 **WAREEGYADA & SU'AALAHA:**\n\n` +
            `🔸 **Wareeg 1** — **${TOURNAMENT_R1_QUESTIONS} su'aalood** (ABCD + Run/Been)\n` +
            `🔸 **Wareeg 2** (Semi-Final) — **${TOURNAMENT_R2_QUESTIONS} su'aalood**\n` +
            `🔸 **Final** 🏆 — **${TOURNAMENT_FINAL_QUESTIONS} su'aalood**\n\n` +
            `⚡ **Dhibco:** < 5s = **40pts** · 18s = **5pts** (ku xidhan xawliga)\n` +
            `🧠 Su'aalo: Af-Soomaali (diini · taariikh · xisaab · grammar · juqraafi)\n\n` +

            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏆 **ABAALMARINTA:**\n` +
            `**Guuleystaha:** Title **Champion 🏆** + abaal marin\n\n` +
            `_Diiwaan gali hoos! ⬇️_`
        )
        .setFooter({ text: `Garaad Quiz • ${PREFIX}tartan_status — xaaladda tartanka` });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tournament_register')
            .setLabel('📝 Register — Diiwaan Geli')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('tournament_count_admin')
            .setLabel('👥 Tirada Ka Qaybgalayaasha')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('tournament_rules')
            .setLabel('📖 Xeerarka')
            .setStyle(ButtonStyle.Secondary),
    );

    const cid  = message.channel.id;
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tournament_admin_next_${cid}`)
            .setLabel('🚀 Bilow Wareeg 1aad — Admin')
            .setStyle(ButtonStyle.Danger),
    );

    return message.channel.send({ content: '@everyone', embeds: [embed], components: [row1, row2] });
}

// ─────────────────────────────────────────────────────────────────────
// ?isdiiwaangeli — User: hel code DM
// ─────────────────────────────────────────────────────────────────────
async function cmdRegister(message) {
    const uid  = message.author.id;
    const code = genCode();
    tournamentRegistry.set(uid, { code, at: Date.now() });
    try {
        await message.author.send({
            embeds: [new EmbedBuilder()
                .setTitle('🏁 Tartan — Code-kaaga Gaarka ah')
                .setDescription(
                    `✅ **Waxaad ku guulaysatay diiwaangelinta!**\n\n` +
                    `Code-gaaga waa:\n\n# \`${code}\`\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `**Tillaabooyinka:**\n` +
                    `1. Sug ilaa admin \`${PREFIX}tartan_bilow\` qoro\n` +
                    `2. Channel-ka tartanka u tag\n` +
                    `3. Qor: \`${PREFIX}gal ${code}\`\n\n` +
                    `⚠️ **Code-kan ha u shegin qof kale — kuu gaarka ah!**`
                )
                .setColor('#2ecc71')
                .setFooter({ text: 'Garaad Quiz Tournament' })],
        });
        return message.reply('✅ **Code-gaaga waa laguugu diray DM!** Fur farrimahaaga gaarka ah si aad u aragto.');
    } catch {
        return message.reply(
            '❌ Ma awoodin inaan kuu dirayo DM. **Fur DM** (Settings → Privacy → Allow DMs from server members) ka dibna isku day mar kale.'
        );
    }
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan_bilow — Admin: fur albaabka ?gal
// ─────────────────────────────────────────────────────────────────────
async function cmdOpen(message) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Kaliya **admin** ayaa furi kara tartanka.');
    }
    const cid = message.channel.id;
    if (activeQuiz.has(cid)) {
        return message.reply('⚠️ Channel-kan quiz koox ayaa ka socda. Sug ama channel kale isticmaal.');
    }
    if (activeTournament.has(cid)) {
        return message.reply('⚠️ Tartan hore ayaa channel-kan ku jira. Jooji marka hore: `?tartan_jooji`');
    }

    const regCount = tournamentRegistry.size;

    const state = {
        channelId:          cid,
        adminId:            message.author.id,
        stage:              'join',
        roundIdx:           0,
        players:            new Set(),
        survivors:          new Set(),
        totalScores:        {},
        roundScores:        {},
        prevRoundQuestions: [],
        _nextSurvivors:     null,
        questions:          [],
        currentQ:           0,
        channel:            message.channel,
    };
    activeTournament.set(cid, state);

    const embed = new EmbedBuilder()
        .setTitle('🏁 Tartan — Albaabka Waa Furan Yahay!')
        .setColor('#2ecc71')
        .setDescription(
            `**Admin:** <@${state.adminId}>\n\n` +
            `👥 Is-diiwaangeliyay (hore): **${regCount}** qof\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 **Sida loo biiray:**\n` +
            `Qofkii code DM-ka ku haya wuxuu qori karaa:\n` +
            `\`\`\`${PREFIX}gal CODE\`\`\`\n` +
            `*(ka diiwaangelinayside: \`${PREFIX}isdiiwaangeli\` isku day)*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ Marka dadku diyaar yihiin, **admin** qor:\n` +
            `\`${PREFIX}admin_next\` — Bilow Wareegga 1aad (${TOURNAMENT_R1_QUESTIONS} su\'aalood)`
        )
        .setFooter({ text: `${PREFIX}tartan_status — eeg tirada · ${PREFIX}tartan_jooji — jooji` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tartan_bilow_status_${cid}`)
            .setLabel('👥 Tirada Hadda')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`tartan_bilow_next_${cid}`)
            .setLabel('▶️ Bilow Wareegga (Admin Only)')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`close_tartan_${message.author.id}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
}

// ─────────────────────────────────────────────────────────────────────
// ?gal [code] — kaliya channel tartanka
// ─────────────────────────────────────────────────────────────────────
async function cmdJoin(message, args) {
    const code = (args[0] || '').trim().toUpperCase();
    if (!code) {
        return message.reply(`⚠️ Code-ka qor! Tusaale: \`${PREFIX}gal ABC123\``);
    }

    const cid   = message.channel.id;
    const state = activeTournament.get(cid);
    if (!state || state.stage !== 'join') {
        return message.reply('⚠️ Hadda albaabka tartanka lama furin ama tartan ma jiro channel-kan. Sug admin inuu \`' + PREFIX + 'tartan_bilow\` qoro.');
    }
    const reg = tournamentRegistry.get(message.author.id);
    if (!reg || reg.code !== code) {
        return message.reply(
            `❌ **Code khalad** ama **maadan is diiwaangalin!**\n\n` +
            `• Haddii code-kaaga DM-ka ku jiro: hubi saxnimada\n` +
            `• Haddii kale: qor \`${PREFIX}isdiiwaangeli\` si aad code u heshid`
        );
    }
    if (state.players.has(message.author.id)) {
        return message.reply('✅ Mar hore ayaad tartanka ku jirtaa! Sug bilaabidda.');
    }
    state.players.add(message.author.id);
    state.totalScores[message.author.id] = state.totalScores[message.author.id] || 0;
    checkUser(message.author.id);

    const list = [...state.players].map((id, i) => `${i + 1}. <@${id}>`).join('\n');
    await message.reply(
        `✅ **<@${message.author.id}> wuu ku biiray tartanka!** 🎉\n\n` +
        `**Ka qaybgalayaasha (${state.players.size}):**\n${list}`
    );
}

// ─────────────────────────────────────────────────────────────────────
// ?admin_next — bilow wareeg / xiga (admin only)
// ─────────────────────────────────────────────────────────────────────
async function cmdAdminNext(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Kaliya admin.');

    message.delete().catch(() => {});

    const cid   = message.channel.id;
    const state = activeTournament.get(cid);
    if (!state) return message.channel.send(`⚠️ Tartan channel-kan ma jiro. Ugu horreyn \`${PREFIX}tartan_bilow\`.`);

    // Soo tus su'aalihii wareegii hore
    if (state.prevRoundQuestions && state.prevRoundQuestions.length > 0) {
        const recap = state.prevRoundQuestions
            .map((q, i) => `**${i + 1}.** ${q.question}\n↳ ✅ **${q.correct}**`)
            .join('\n\n');

        const chunks = [];
        let current  = '';
        for (const line of recap.split('\n\n')) {
            if ((current + '\n\n' + line).length > 3800) {
                chunks.push(current);
                current = line;
            } else {
                current = current ? current + '\n\n' + line : line;
            }
        }
        if (current) chunks.push(current);

        for (let i = 0; i < chunks.length; i++) {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`📋 ${ROUND_LABELS[state.roundIdx]?.name || 'Wareeg'} — Su'aalihii & Jawaabihii ${chunks.length > 1 ? `(${i+1}/${chunks.length})` : ''}`)
                    .setDescription(chunks[i])
                    .setColor('#7f8c8d')],
            });
        }
        state.prevRoundQuestions = [];
    }

    if (state.stage === 'join') {
        if (state.players.size < TOURNAMENT_MIN_PLAYERS) {
            return message.channel.send(
                `⚠️ Ugu yaraan **${TOURNAMENT_MIN_PLAYERS}** qof ayaa loo baahan yahay. Hadda: **${state.players.size}** qof.`
            );
        }
        state.survivors = new Set(state.players);
        state.roundIdx  = 1;
        return beginRound(state, message.channel);
    }

    if (state.stage === 'pause') {
        const nextSurvivors = state._nextSurvivors || [];
        state.survivors     = new Set(nextSurvivors);
        state._nextSurvivors = null;
        if (state.survivors.size === 0) {
            activeTournament.delete(cid);
            return message.channel.send('❌ Cidna kuma hartay — tartan waa la joojiyay.');
        }
        state.roundIdx += 1;
        return beginRound(state, message.channel);
    }

    return message.channel.send('⚠️ Hadda admin_next looma isticmaali karo — sug inta wareeggu dhammaado.');
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan_jooji — Admin: jooji tartan
// ─────────────────────────────────────────────────────────────────────
async function cmdStop(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Kaliya admin.');
    const cid = message.channel.id;
    if (!activeTournament.has(cid)) return message.reply('⚠️ Channel-kan tartan ma jiro.');
    activeTournament.delete(cid);
    return message.reply('🛑 **Tartan-ka waa la joojiyay.** Channel-ka ayaa la xoroobay.');
}

// ─────────────────────────────────────────────────────────────────────
// Bilow wareeg
// ─────────────────────────────────────────────────────────────────────
async function beginRound(state, channel) {
    state.channel = channel;
    const n       = roundQuestionCount(state.roundIdx);
    const meta    = ROUND_LABELS[state.roundIdx];
    const picked  = pickQuestionsForGame(state.adminId, 'tournament', n);

    if (!picked || picked.length === 0) {
        activeTournament.delete(state.channelId);
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

    // Tilmaan tirada dadka la saari doono
    let elimInfo = '';
    if (state.roundIdx === 1) {
        const toElim = Math.max(1, Math.floor(state.survivors.size / 6));
        const toKeep = Math.max(2, state.survivors.size - toElim);
        elimInfo = `⚠️ Dhammaadka: **${toElim}** qof baxayaa — **${toKeep}** qof ayaa Wareeg 2-da galeysa`;
    } else if (state.roundIdx === 2) {
        const toElim = Math.max(1, Math.floor(state.survivors.size / 5));
        const afterE = Math.max(2, state.survivors.size - toElim);
        const toFin  = Math.max(2, Math.floor(afterE / 2));
        elimInfo = `⚠️ Dhammaadka: **${toFin}** qof kaliya ayaa Final-ka galeysa`;
    } else {
        elimInfo = `🏆 **Final** — Guuleystaha hal qof ayaa noqon doona! **Champion 🏆** title!`;
    }

    // Muuji dadka ku jira
    const playersList = [...state.survivors].map((id, i) => `${i + 1}. <@${id}>`).join('\n');

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`🏁 ${meta.name} — Bilaabmay!`)
            .setDescription(
                `**Ka qaybgalayaasha:** ${state.survivors.size} qof\n` +
                `**Su'aalo:** ${useN} su'aalood\n` +
                `**Nooca:** MCQ (ABCD) + Run/Been (True/False)\n` +
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
// Su'aal kasta
// ─────────────────────────────────────────────────────────────────────
async function sendQuestion(state) {
    if (!activeTournament.has(state.channelId) || state.stage !== 'play') return;
    const totalQ = state.questions.length;

    if (state.currentQ >= totalQ) {
        for (const id of state.survivors) {
            state.totalScores[id] = (state.totalScores[id] || 0) + (state.roundScores[id] || 0);
        }
        if (state.roundIdx === 3) return finishTournament(state);
        return endRoundPause(state);
    }

    const channel = state.channel;
    if (!channel) { activeTournament.delete(state.channelId); return; }

    const q         = state.questions[state.currentQ];
    const playerIds = [...state.survivors];
    markSeenForUsersInGame(playerIds, 'tournament', q._idx);
    saveData();

    state.prevRoundQuestions.push({ question: q.question, correct: q.correct });

    const answeredBy     = new Set();
    const correctAnswers = [];
    const startTime      = Date.now();

    const meta    = ROUND_LABELS[state.roundIdx];
    const isTF    = (q.type || '').toLowerCase() === 'tf' ||
                    (q.type || '').toLowerCase() === 'truefalse' ||
                    (q.type || '').toLowerCase() === 'bool';
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
            .setCustomId(
                `tna_${state.channelId}_${state.roundIdx}_${state.currentQ}_${index}_${e.isCorrect ? 't' : 'f'}`
            )
            .setLabel(e.label.slice(0, 80))
            .setStyle(isTF
                ? (e.label === 'Run' ? ButtonStyle.Success : ButtonStyle.Danger)
                : ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (!msg) { activeTournament.delete(state.channelId); return; }

    const prefix    = `tna_${state.channelId}_${state.roundIdx}_${state.currentQ}_`;
    const filter    = (i) => i.customId.startsWith(prefix) && state.survivors.has(i.user.id);
    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS });

    collector.on('collect', async (interaction) => {
        const uid = interaction.user.id;
        if (answeredBy.has(uid)) {
            return interaction.reply({
                content: '⚠️ Mar hore ayaad jawaab bixisay!',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
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
            await interaction.reply({
                content: '❌ Khalad. Isku day su\'aasha xiga!',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
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
                })
                .join('\n');
            resultLine = `✅ Jawaabta saxda: **${correctLabel}**\n\n${topList}`;
        }

        const board = [...state.survivors]
            .map(id => [id, state.roundScores[id] || 0])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id, sc], i) => `${i + 1}. <@${id}> — **${sc}pts**`)
            .join('\n');

        const sumEmbed = EmbedBuilder.from(embed)
            .setDescription(
                `## ${q.question}\n\n${resultLine}\n\n📊 **Dhibcaha Wareegga (Sare-saraha):**\n${board || '—'}`
            );

        await msg.edit({ embeds: [sumEmbed], components: [] }).catch(() => {});
        state.currentQ += 1;
        setTimeout(() => sendQuestion(state), 2500);
    });
}

// ─────────────────────────────────────────────────────────────────────
// Dhammaadka wareeg — muuji natijada + dadka baxaya
// ─────────────────────────────────────────────────────────────────────
async function endRoundPause(state) {
    const channel = state.channel;

    const nextSurvivors  = computeSurvivors(state.survivors, state.roundScores, state.roundIdx);
    state._nextSurvivors = nextSurvivors;

    const eliminated = [...state.survivors].filter(id => !nextSurvivors.includes(id));
    const remaining  = nextSurvivors;

    const totalBoard = [...state.survivors]
        .map(id => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1])
        .map(([id, sc], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            const isOut = eliminated.includes(id);
            return `${medal} <@${id}> — **${sc}pts** ${isOut ? '❌ _baxaya_' : '✅'}`;
        })
        .join('\n');

    const nextRoundName  = state.roundIdx === 1 ? `Wareegga 2aad (${TOURNAMENT_R2_QUESTIONS} su'aalood)` : `Final 🏆 (${TOURNAMENT_FINAL_QUESTIONS} su'aalood)`;
    const remainingList  = remaining.map((id, i) => `✅ ${i + 1}. <@${id}>`).join('\n');
    const eliminatedList = eliminated.length > 0
        ? eliminated.map(id => `❌ <@${id}>`).join('\n')
        : '_Cidna ma bixin_';

    state.stage      = 'pause';
    state.roundScores = {};

    if (!channel) return;

    const nextLabel   = state.roundIdx === 1
        ? `🚀 Bilow Wareeg 2aad (${TOURNAMENT_R2_QUESTIONS} su'aalood)`
        : `🏆 Bilow Final (${TOURNAMENT_FINAL_QUESTIONS} su'aalood)`;

    const nextRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tournament_admin_next_${state.channelId}`)
            .setLabel(nextLabel)
            .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`⏸️ ${ROUND_LABELS[state.roundIdx].name} — Dhamaaday!`)
            .setDescription(
                `**📊 Dhibcaha Guud (wada jir):**\n${totalBoard}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `**❌ Dadka baxa (${eliminated.length}):**\n${eliminatedList}\n\n` +
                `**✅ Dadka ${nextRoundName}-ka u gudbaya (${remaining.length}):**\n${remainingList}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `⬇️ **Admin:** Riix badhanka hoose si wareegga xiga loo bilaabo`
            )
            .setColor('#f39c12')],
        components: [nextRow],
    });
}

// ─────────────────────────────────────────────────────────────────────
// Dhammaadka tartan — guuleystaha + abaalmarin
// ─────────────────────────────────────────────────────────────────────
async function finishTournament(state) {
    const channel = state.channel;
    const cid     = state.channelId;
    activeTournament.delete(cid);

    const sorted = [...state.survivors]
        .map(id => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        if (channel) {
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🏁 Tartan')
                    .setDescription('Cidna kuma hadhin.')
                    .setColor('#95a5a6')],
            });
        }
        return;
    }

    const winner   = sorted[0];
    const winId    = winner[0];
    const winScore = winner[1];

    // Champion title sii guuleystaha
    checkUser(winId);
    if (!userData[winId].ownedTitles) userData[winId].ownedTitles = [];
    if (!userData[winId].ownedTitles.includes('champion')) {
        userData[winId].ownedTitles.push('champion');
    }
    userData[winId].activeTitle = 'champion';
    addXp(winId, 500); // bonus XP
    saveData();

    const allScores = sorted
        .map(([id, sc], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            const extra = i === 0 ? ' 👑 GUULEYSTAHA' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : '';
            return `${medal} <@${id}> — **${sc}pts**${extra}`;
        })
        .join('\n');

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
                    `⭐ Bonus: **+500 XP**\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**🏅 Natiijada Guud — Ka Qaybgalayaasha Oo Dhan:**\n\n${allScores}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `_Mahadsanid ka qaybgalashada Tartan Garaad Quiz! 🎉_`
                )
                .setColor('#FFD700')
                .setThumbnail('https://cdn.discordapp.com/emojis/🏆')
                .setFooter({ text: 'Garaad Quiz — Tournament' })],
        });
    }
}

// ─────────────────────────────────────────────────────────────────────
// ?tartan_status — Xaaladda tartanka
// ─────────────────────────────────────────────────────────────────────
async function cmdStatus(message) {
    const cid   = message.channel.id;
    const state = activeTournament.get(cid);

    if (!state) {
        return message.reply('⚠️ Hadda ma jiro tartan soconaya channel-kan.');
    }

    const stageNames = {
        join:  '🟢 Diiwaangalin furan — \`' + PREFIX + 'gal CODE\` si aad u biirtid',
        play:  '🔴 Wareeggu socdaa — Jawaab su\'aalaha!',
        pause: '🟡 Joog — Admin wuxuu sugayaa \`' + PREFIX + 'admin_next\`',
    };

    const ROUND_NAMES = ['', 'Wareeg 1 (25 su\'aalood)', 'Wareeg 2/Semi (20 su\'aalood)', 'Final 🏆 (15 su\'aalood)'];
    const roundName   = ROUND_NAMES[state.roundIdx] || `Wareeg ${state.roundIdx}`;

    const sorted = [...state.survivors]
        .map(id => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1]);

    const medals = ['🥇', '🥈', '🥉'];
    const board  = sorted.map(([id, sc], i) => {
        const icon = medals[i] || `${i + 1}.`;
        return `${icon} <@${id}> — **${sc}pts**`;
    }).join('\n') || '_Ma jiraan ka qaybgalayaal_';

    const totalQ    = state.questions ? state.questions.length : 0;
    const answered  = state.currentQ || 0;
    const remaining = Math.max(0, totalQ - answered);

    await message.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`📊 Tartan — Xaaladda Hadda`)
            .setDescription(
                `**Xaaladda:** ${stageNames[state.stage] || state.stage}\n` +
                `**Wareeg:** ${roundName}\n` +
                `**Ka qaybgalayaasha:** ${state.survivors.size} qof\n` +
                (totalQ > 0 ? `**Su'aalo hadhay:** ${remaining} / ${totalQ}\n\n` : '\n') +
                `**🏅 Dhibcaha (wada jir):**\n${board}`
            )
            .setColor('#3498db')
            .setFooter({ text: 'Garaad Quiz — Tartan Status' })],
    });
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
};
