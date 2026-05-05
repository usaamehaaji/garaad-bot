// =====================================================================
// TARTAN — diiwaangeli + code DM + 3 wareeg (30 / 25 / 20) — kaliya admin
// =====================================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const { isAdmin } = require('../utils/admin');
const {
    activeTournament,
    tournamentRegistry,
    activeQuiz,
    userData,
    saveData,
} = require('../store');
const { checkUser, addXp, getLevel } = require('../utils/helpers');
const { markUserPlayed } = require('../utils/reminders');
const {
    pickQuestionsForGame,
    markSeenForUsersInGame,
    noQuestionsLeftEmbed,
} = require('../utils/questions');
const {
    PREFIX,
    GLOBAL_WAIT_MS,
    TOURNAMENT_MIN_PLAYERS,
    TOURNAMENT_R1_QUESTIONS,
    TOURNAMENT_R2_QUESTIONS,
    TOURNAMENT_FINAL_QUESTIONS,
} = require('../config');

const ROUND_LABELS = {
    1: { name: 'Wareegga 1aad', hint: '**30 su\'aalood** — dhammaadkood admin-ku wuxuu bilaabi karaa wareegga xiga (`?admin_next`).' },
    2: { name: 'Wareegga 2aad', hint: '**25 su\'aalood** — su\'aalaha sii soconaya; **Final**-ka ayaa ugu dambeeya oo ugu adag.' },
    3: { name: 'Final', hint: '**20 su\'aalood** — ciyaartoyda ugu sarreeya **dhibcaha tartanka** ayaa noqonaya guuleystaha.' },
};

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function roundQuestionCount(idx) {
    if (idx === 1) return TOURNAMENT_R1_QUESTIONS;
    if (idx === 2) return TOURNAMENT_R2_QUESTIONS;
    return TOURNAMENT_FINAL_QUESTIONS;
}

function computeSurvivors(survivorIds, roundScoreMap) {
    const list = [...survivorIds].map((id) => [id, roundScoreMap[id] || 0]).sort((a, b) => b[1] - a[1]);
    if (list.length <= 2) return list.map((x) => x[0]);
    const cut = Math.max(2, Math.ceil(list.length / 2));
    return list.slice(0, cut).map((x) => x[0]);
}

// ───── ?isdiiwaangeli ─────
async function cmdRegister(message) {
    const uid = message.author.id;
    const code = genCode();
    tournamentRegistry.set(uid, { code, at: Date.now() });
    try {
        await message.author.send({
            embeds: [new EmbedBuilder()
                .setTitle('🏁 Tartan — Code-kaaga')
                .setDescription(
                    `Code-gaaga gaarka ah waa:\n\n# \`${code}\`\n\n` +
                    `Marka admin-ku furo tartanka channel-ka, qor:\n` +
                    `\`${PREFIX}gal ${code}\` **channel-ka tartanka** gudaheeda.`
                )
                .setColor('#2ecc71')],
        });
        return message.reply('✅ Code-gaaga waa laguugu diray **DM**. Fur fariimahaaga gaarka ah.');
    } catch {
        return message.reply(
            '❌ Ma awoodin inaan kuu dirayo DM. **Fur DM** (Settings → Privacy → Allow DMs) ka dibna isku day mar kale.'
        );
    }
}

// ───── ?tartan_bilow ─────
async function cmdOpen(message) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Kaliya **admin** ayaa furi kara tartanka.');
    }
    const cid = message.channel.id;
    if (activeQuiz.has(cid)) {
        return message.reply('⚠️ Channel-kan quiz koox ayaa ka socda. Sug ama channel kale isticmaal.');
    }
    if (activeTournament.has(cid)) {
        return message.reply('⚠️ Tartan hore ayaa channel-kan ku jira. Sug ilaa uu dhamaado.');
    }

    const state = {
        channelId: cid,
        adminId: message.author.id,
        stage: 'join',
        roundIdx: 0,
        players: new Set(),
        survivors: new Set(),
        totalScores: {},
        roundScores: {},
        lastRoundSnapshot: null,
        questions: [],
        currentQ: 0,
        channel: message.channel,
    };
    activeTournament.set(cid, state);

    const embed = new EmbedBuilder()
        .setTitle('🏁 Tartan — Albaab furan')
        .setDescription(
            `**Admin:** <@${state.adminId}>\n\n` +
            `1. Guji badhanka **Register** hoose si code DM kuugu yimaado.\n` +
            `2. Marka code-ka aad hesho, qor: \`${PREFIX}gal CODE\` (channel-kan).\n` +
            `3. Marka dadku diyaar yihiin, admin-ku qor: \`${PREFIX}admin_next\` si **Wareegga 1aad** loo bilaabo.\n\n` +
            `_Haddii aadan is diiwaangelin, ma geli kartid — raadso code DM._`
        )
        .setColor('#e67e22');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tournament_register')
            .setLabel('Register')
            .setStyle(ButtonStyle.Primary),
    );

    return message.reply({ embeds: [embed], components: [row] });
}

// ───── ?gal [code] ─────
async function cmdJoin(message, args) {
    const code = (args[0] || '').trim().toUpperCase();
    if (!code) {
        return message.reply(`Tusaale: \`${PREFIX}gal ABC12X\``);
    }
    const cid = message.channel.id;
    const state = activeTournament.get(cid);
    if (!state || state.stage !== 'join') {
        return message.reply('⚠️ Hadda albaabka tartanka lama furin ama tartan ma jiro channel-kan.');
    }
    const reg = tournamentRegistry.get(message.author.id);
    if (!reg || reg.code !== code) {
        return message.reply('❌ **Maadan is diiwaangelin** ama code-khalad — raadso code-ka DM-kaaga (`?isdiiwaangeli`).');
    }
    if (state.players.has(message.author.id)) {
        return message.reply('✅ Mar hore ayaad tartanka ku jirtaa.');
    }
    state.players.add(message.author.id);
    state.totalScores[message.author.id] = state.totalScores[message.author.id] || 0;
    checkUser(message.author.id);

    const list = [...state.players].map((id, i) => `${i + 1}. <@${id}>`).join('\n');
    await message.reply(`✅ <@${message.author.id}> wuu ku biiray tartanka!\n\n**Ka qaybgalayaasha:**\n${list}`);
}

// ───── ?admin_next ─────
async function cmdAdminNext(message) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Kaliya admin.');
    }
    const cid = message.channel.id;
    const state = activeTournament.get(cid);
    if (!state) {
        return message.reply('⚠️ Tartan channel-kan ma jiro. Ugu horreyn `?tartan_bilow`.');
    }

    if (state.stage === 'join') {
        if (state.players.size < TOURNAMENT_MIN_PLAYERS) {
            return message.reply(`⚠️ Ugu yaraan **${TOURNAMENT_MIN_PLAYERS}** qof oo code sax ah ayaa loo baahan yahay. Hadda: ${state.players.size}`);
        }
        state.survivors = new Set(state.players);
        state.roundIdx = 1;
        return beginRound(state, message.channel);
    }

    if (state.stage === 'pause') {
        const snap = state.lastRoundSnapshot || {};
        const nextSurvivors = computeSurvivors(state.survivors, snap);
        state.survivors = new Set(nextSurvivors);
        state.lastRoundSnapshot = null;
        if (state.survivors.size === 0) {
            activeTournament.delete(cid);
            return message.reply('❌ Cidna kuma hartay — tartan waa la joojiyay.');
        }
        state.roundIdx += 1;
        return beginRound(state, message.channel);
    }

    return message.reply('⚠️ Hadda wax admin_next loo isticmaali karo ma jiro (sug inta wareeggu dhammaado).');
}

async function cmdStop(message) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Kaliya admin.');
    }
    const cid = message.channel.id;
    const state = activeTournament.get(cid);
    if (!state) {
        return message.reply('⚠️ Channel-kan tartan ma jiro. Ugu horreyn `?tartan_bilow`.');
    }
    activeTournament.delete(cid);
    return message.reply('🛑 Tartan-ka waa la joojiyay. Wax walba waa la damiyay oo channel-kan waa laga saaray tartanka.');
}

async function beginRound(state, channel) {
    state.channel = channel;
    const n = roundQuestionCount(state.roundIdx);
    const picked = pickQuestionsForGame(state.adminId, 'tournament', n);
    if (!picked || picked.length === 0) {
        activeTournament.delete(state.channelId);
        return channel.send({ embeds: [noQuestionsLeftEmbed('Admin')] });
    }

    let useN = n;
    if (picked.length < n) {
        useN = picked.length;
        await channel.send(`📚 Su'aalo cusub: **${useN}** kaliya ayaa la heli karaa (halkii ${n}).`);
    }

    state.questions = picked;
    state.currentQ = 0;
    state.roundScores = {};
    for (const id of state.survivors) state.roundScores[id] = 0;
    state.stage = 'play';

    const meta = ROUND_LABELS[state.roundIdx];
    for (const id of state.survivors) markUserPlayed(id);

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`🏁 ${meta.name} — Bilaabmay`)
            .setDescription(
                `${meta.hint}\n\n` +
                `**Ka qaybgalayaasha:** ${state.survivors.size}\n` +
                `**Su'aalo:** ${useN}\n` +
                `**Wakhti / su'aal:** ${GLOBAL_WAIT_MS / 1000} ilbiriqsi — **qofka ugu horeeya** ee saxda ah ayaa dhibca helaya.`
            )
            .setColor('#9b59b6')],
    });

    setTimeout(() => sendQuestion(state), 2500);
}

async function sendQuestion(state) {
    if (!activeTournament.has(state.channelId) || state.stage !== 'play') return;
    const totalQ = state.questions.length;
    if (state.currentQ >= totalQ) {
        if (state.roundIdx === 3) {
            for (const id of state.survivors) {
                const add = state.roundScores[id] || 0;
                state.totalScores[id] = (state.totalScores[id] || 0) + add;
            }
            return finishTournament(state);
        }
        return endRoundPause(state);
    }

    const channel = state.channel;
    if (!channel) {
        activeTournament.delete(state.channelId);
        return;
    }

    const q = state.questions[state.currentQ];
    const playerIds = [...state.survivors];
    markSeenForUsersInGame(playerIds, 'tournament', q._idx);
    saveData();

    const answeredBy = new Set();
    let firstCorrect = null;

    const embed = new EmbedBuilder()
        .setTitle(`🏁 ${ROUND_LABELS[state.roundIdx].name} — Su'aal ${state.currentQ + 1}/${totalQ}`)
        .setDescription(
            `## ${q.question}\n\n` +
            `⏱️ ${GLOBAL_WAIT_MS / 1000} ilbiriqsi — qofka ugu horeeya ee saxda ah!\n` +
            `Tartamayaal: **${state.survivors.size}**`
        )
        .setColor('#8e44ad');

    const buttons = q.options.map((opt, index) =>
        new ButtonBuilder()
            .setCustomId(`tna_${state.channelId}_${state.roundIdx}_${state.currentQ}_${index}_${opt === q.correct ? 't' : 'f'}`)
            .setLabel(String(opt).slice(0, 80))
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (!msg) {
        activeTournament.delete(state.channelId);
        return;
    }

    const prefix = `tna_${state.channelId}_${state.roundIdx}_${state.currentQ}_`;
    const filter = (i) => i.customId.startsWith(prefix) && state.survivors.has(i.user.id);
    const collector = msg.createMessageComponentCollector({ filter, time: GLOBAL_WAIT_MS });

    collector.on('collect', async (interaction) => {
        if (answeredBy.has(interaction.user.id)) {
            return interaction.reply({ content: 'Mar hore ayaad jawaab bixisay!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        answeredBy.add(interaction.user.id);
        const isCorrect = interaction.customId.endsWith('_t');

        if (isCorrect && firstCorrect === null) {
            firstCorrect = interaction.user.id;
            state.roundScores[interaction.user.id] = (state.roundScores[interaction.user.id] || 0) + 1;
            await interaction.reply({ content: '✅ Sax! Adigaa ugu horeeyay.', flags: MessageFlags.Ephemeral }).catch(() => {});
            collector.stop('correct');
        } else if (isCorrect) {
            await interaction.reply({ content: '✅ Sax — laakiin qof ayaa kuu hor maray.', flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Khalad.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    });

    collector.on('end', async () => {
        const resultLine = firstCorrect
            ? `✅ <@${firstCorrect}> ayaa ugu horeeyay!\nJawaabta saxda: **${q.correct}**`
            : `⏰/❌ Cidna si sax ah uma jawaabin.\nJawaabta saxda: **${q.correct}**`;

        const board = [...state.survivors]
            .map((id) => [id, state.roundScores[id] || 0])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, sc], i) => `${i + 1}. <@${id}> — **${sc}** (wareeg)`)
            .join('\n');

        const sumEmbed = EmbedBuilder.from(embed)
            .setDescription(`${embed.data.description}\n\n${resultLine}\n\n📊 **Sare-saraha wareegga:**\n${board || '—'}`);

        await msg.edit({ embeds: [sumEmbed], components: [] }).catch(() => {});

        state.currentQ += 1;
        setTimeout(() => sendQuestion(state), 2500);
    });
}

async function endRoundPause(state) {
    const channel = state.channel;
    state.lastRoundSnapshot = { ...state.roundScores };
    for (const id of state.survivors) {
        const add = state.roundScores[id] || 0;
        state.totalScores[id] = (state.totalScores[id] || 0) + add;
    }

    const totalBoard = [...state.survivors]
        .map((id) => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1])
        .map(([id, sc], i) => `${i + 1}. <@${id}> — **${sc}** dhibcood (tartanka)`)
        .join('\n');

    state.stage = 'pause';
    state.roundScores = {};

    const nextName = state.roundIdx === 1 ? 'Wareegga 2aad (25 su\'aalood)' : 'Final (20 su\'aalood)';

    if (!channel) return;

    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(`⏸️ ${ROUND_LABELS[state.roundIdx].name} — Dhamaaday`)
            .setDescription(
                `**Dhibcaha tartanka (wada jir):**\n${totalBoard}\n\n` +
                `▶️ **Wareegga xiga:** ${nextName}\n` +
                `Admin-ku qor: \`${PREFIX}admin_next\` marka aad diyaar tahay.\n\n` +
                `_Final-ka: su\'aalaha ugu adag & go\'aanka guuleystaha._`
            )
            .setColor('#f39c12')],
    });
}

async function finishTournament(state) {
    const channel = state.channel;
    const cid = state.channelId;
    activeTournament.delete(cid);

    const sorted = [...state.survivors]
        .map((id) => [id, state.totalScores[id] || 0])
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        if (channel) {
            await channel.send({ embeds: [new EmbedBuilder().setTitle('🏁 Tartan').setDescription('Cidna kuma hadhin.').setColor('#95a5a6')] });
        }
        return;
    }

    const rewardLines = [];
    sorted.forEach(([id, sc], i) => {
        checkUser(id);
        if (i === 0 && sc >= 0) {
            addXp(id, 50);
            userData[id].cash ??= Number.isFinite(userData[id].usdBalance) ? userData[id].usdBalance : 0;
            userData[id].cash += 100;
            rewardLines.push(`🥇 <@${id}> — **${sc}** dhibcood (+50 XP / +$100 cash)`);
        } else if (i === 1 && sc >= 0) {
            addXp(id, 30);
            userData[id].cash ??= Number.isFinite(userData[id].usdBalance) ? userData[id].usdBalance : 0;
            userData[id].cash += 60;
            rewardLines.push(`🥈 <@${id}> — **${sc}** dhibcood (+30 XP / +$60 cash)`);
        } else if (i === 2 && sc >= 0) {
            addXp(id, 20);
            userData[id].cash ??= Number.isFinite(userData[id].usdBalance) ? userData[id].usdBalance : 0;
            userData[id].cash += 40;
            rewardLines.push(`🥉 <@${id}> — **${sc}** dhibcood (+20 XP / +$40 cash)`);
        } else {
            addXp(id, 8);
            rewardLines.push(`▫️ <@${id}> — **${sc}** dhibcood (+8 XP)`);
        }
    });
    saveData();

    const winner = sorted[0];
    const winText = winner
        ? `👑 **Guuleystaha:** <@${winner[0]}> — **${winner[1]}** dhibcood`
        : '—';

    if (channel) {
        await channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('🏆 Tartan — Dhamaaday')
                .setDescription(`${winText}\n\n**Abaalmarinta:**\n${rewardLines.join('\n')}`)
                .setColor('#f1c40f')],
        });
    }
}

module.exports = {
    cmdRegister,
    cmdOpen,
    cmdJoin,
    cmdAdminNext,
    cmdStop,
};
