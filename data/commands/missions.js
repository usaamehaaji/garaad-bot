// =====================================================================
// ?missions — Daily Missions (snapshot-based tracking)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { econData, saveEcon }  = require('../../src/economy/econStore');
const { checkUser, todayKey, checkAndAwardBadges } = require('../../src/utils/helpers');

const MISSION_POOL = [
    { id: 'solo_5',    desc: '🎮 Solo quiz 5 games ku ciyaar',          type: 'soloPlayed',  target: 5,  reward: { btc: 600,  xp: 60  } },
    { id: 'solo_3',    desc: '🎮 Solo quiz 3 games ku ciyaar',          type: 'soloPlayed',  target: 3,  reward: { btc: 350,  xp: 35  } },
    { id: 'correct_10',desc: '✅ 10 su\'aal si sax ah u jaawab',        type: 'soloCorrect', target: 10, reward: { btc: 500,  xp: 50  } },
    { id: 'correct_5', desc: '✅ 5 su\'aal si sax ah u jaawab',         type: 'soloCorrect', target: 5,  reward: { btc: 250,  xp: 25  } },
    { id: 'duel_win_2',desc: '⚔️ Duel 2 jeer ku guulayso',              type: 'duelWins',    target: 2,  reward: { btc: 500,  xp: 50,  loot: 'common' } },
    { id: 'duel_win_1',desc: '⚔️ Duel hal jeer ku guulayso',            type: 'duelWins',    target: 1,  reward: { btc: 250,  xp: 30  } },
    { id: 'quiz_play', desc: '🏆 Quiz hal mar ka qayb qaado',           type: 'quizPlayed',  target: 1,  reward: { btc: 300,  xp: 30  } },
    { id: 'duel_play', desc: '⚔️ Duel hal mar ku ciyaar (qasab ma aha guulayso)', type: 'duelTotal', target: 1, reward: { btc: 200, xp: 20 } },
];

function pickMissions() {
    const pool = [...MISSION_POOL];
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

function getBaseline(userId) {
    const s = (userData[userId]?.stats) || {};
    return {
        soloPlayed:  s.soloPlayed  || 0,
        soloCorrect: s.soloCorrect || 0,
        duelWins:    s.duelWins    || 0,
        duelTotal:   (s.duelWins || 0) + (s.duelLosses || 0) + (s.duelDraws || 0),
        quizPlayed:  s.quizPlayed  || 0,
    };
}

function getCurrentValue(userId, type) {
    const s = userData[userId]?.stats || {};
    if (type === 'duelTotal') return (s.duelWins || 0) + (s.duelLosses || 0) + (s.duelDraws || 0);
    return s[type] || 0;
}

function ensureMissions(userId) {
    checkUser(userId);
    const d   = userData[userId];
    const today = todayKey();
    if (d.missions.date !== today) {
        d.missions = {
            date:     today,
            tasks:    pickMissions().map(m => ({ ...m, claimed: false })),
            baseline: getBaseline(userId),
        };
    }
}

function rewardText(r) {
    const parts = [];
    if (r.btc)  parts.push(`₿${r.btc.toLocaleString()}`);
    if (r.xp)   parts.push(`${r.xp} XP`);
    if (r.loot) parts.push(`📦 Common Box`);
    return parts.join(' + ');
}

module.exports = async function missionsCmd(message, args) {
    const userId = message.author.id;
    checkUser(userId);

    // ?missions claim <1|2|3>
    if (args[0] === 'claim') {
        const idx = parseInt(args[1]) - 1;
        ensureMissions(userId);
        const d   = userData[userId];
        const ec  = econData[userId] || {};

        if (isNaN(idx) || idx < 0 || idx > 2)
            return message.reply('⚠️ Isticmaal: `?missions claim 1`, `?missions claim 2`, ama `?missions claim 3`');

        const task = d.missions.tasks[idx];
        if (!task)
            return message.reply('⚠️ Mission-kaas ma jiro.');
        if (task.claimed)
            return message.reply('✅ Mission-kaas horay ayaad u qaadatay.');

        const base    = d.missions.baseline[task.type] || 0;
        const current = getCurrentValue(userId, task.type);
        const progress = current - base;

        if (progress < task.target)
            return message.reply(`⏳ Mission-kaas wali dhammaystirna. **${progress}/${task.target}** ✓`);

        // Grant reward
        task.claimed = true;
        const r = task.reward;
        if (r.btc) {
            if (!econData[userId]) econData[userId] = { btc: 1000 };
            econData[userId].btc = (econData[userId].btc || 0) + r.btc;
        }
        if (r.xp) d.xp = (d.xp || 0) + r.xp;
        if (r.loot) {
            d.lootBoxes       ??= {};
            d.lootBoxes[r.loot] = (d.lootBoxes[r.loot] || 0) + 1;
        }
        d.stats.missionsCompleted = (d.stats.missionsCompleted || 0) + 1;
        checkAndAwardBadges(userId);
        saveData();
        if (r.btc) saveEcon();

        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🎉 Mission La Dhameystiray!')
                .setColor('#27ae60')
                .setDescription(
                    `**${task.desc}**\n\n` +
                    `🎁 **Abaalmarinta:** ${rewardText(r)}`
                )
                .setFooter({ text: 'Garaad Bot • Daily Missions' })
            ]
        });
    }

    // Show missions
    ensureMissions(userId);
    const d = userData[userId];

    const lines = d.missions.tasks.map((task, i) => {
        const base     = d.missions.baseline[task.type] || 0;
        const current  = getCurrentValue(userId, task.type);
        const progress = Math.min(task.target, current - base);
        const done     = progress >= task.target;
        const status   = task.claimed ? '✅ Claimed' : done ? '✅ Done — `?missions claim ' + (i+1) + '`' : `⏳ ${progress}/${task.target}`;
        return `**${i+1}.** ${task.desc}\n    🎁 ${rewardText(task.reward)}  •  ${status}`;
    });

    const allDone  = d.missions.tasks.every(t => t.claimed);
    const embed = new EmbedBuilder()
        .setTitle('📋 Howlaha Maalinlaha ah — Daily Missions')
        .setColor('#3498db')
        .setDescription(lines.join('\n\n'))
        .addFields({ name: '📅 Taariikhda', value: `Maanta: **${d.missions.date}**`, inline: true })
        .setFooter({ text: allDone ? '🎉 Dhamaan missions waa la dhamaystiray!' : 'Isticmaal ?missions claim <1/2/3> marka dhammaato' });

    return message.reply({ embeds: [embed] });
};
