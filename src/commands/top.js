// =====================================================================
// AMARKA: ?top [blitz]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData } = require('../store');
const { getLevel, getDisplayTitle, checkUser } = require('../utils/helpers');

const TOP_N   = 15;
const MEDALS  = ['🥇', '🥈', '🥉'];
const CIRCLES = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];

function cleanTitle(disp) {
    if (!disp || disp === 'Bilow' || disp === 'Beginner') return null;
    return disp;
}

function buildIqLines(top) {
    return top.map(([id, data], i) => {
        const s         = data.stats || {};
        const disp      = cleanTitle(getDisplayTitle(id));
        const titlePart = disp ? ` ・ ${disp}` : '';
        const lvl       = getLevel(data.iq || 0);
        const totalGames = (s.soloPlayed || 0) + (s.duelWins || 0) + (s.duelLosses || 0) + (s.duelDraws || 0);
        const medal     = i < 3 ? `${MEDALS[i]} ` : '';

        return (
            `${medal}${CIRCLES[i]} <@${id}>${titlePart}\n` +
            `┆ 🧠 IQ: **${(data.iq || 0).toLocaleString()}**\n` +
            `┆ ⭐ Level: **${lvl}**\n` +
            `┆ 🎮 Games: **${totalGames}**\n` +
            `┆ ✅ Guulo: **${s.duelWins || 0}**\n` +
            `┆ ❌ Guuldarro: **${s.duelLosses || 0}**`
        );
    }).join('\n\n');
}

function buildBlitzLines(top) {
    return top.map(([id, data], i) => {
        const s     = data.stats || {};
        const disp  = cleanTitle(getDisplayTitle(id));
        const titlePart = disp ? ` ・ ${disp}` : '';
        const medal = i < 3 ? `${MEDALS[i]} ` : '';

        return (
            `${medal}${CIRCLES[i]} <@${id}>${titlePart}\n` +
            `┆ ⚡ Guulo: **${s.blitzWins || 0}**\n` +
            `┆ 🎯 Sarr: **${s.blitzTopScore || 0}**\n` +
            `┆ 🎮 Ciyaaraha: **${s.blitzPlayed || 0}**`
        );
    }).join('\n\n');
}

module.exports = async function topCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const mode = (args[0] || '').toLowerCase();

    let description, embedTitle, embedColor;

    if (mode === 'blitz') {
        const allBlitz = Object.entries(userData)
            .filter(([, d]) => (d.stats?.blitzPlayed || 0) > 0)
            .sort(([, a], [, b]) => (b.stats?.blitzWins || 0) - (a.stats?.blitzWins || 0));

        const top      = allBlitz.slice(0, TOP_N);
        const lines    = buildBlitzLines(top);
        const userRank = allBlitz.findIndex(([id]) => id === userId) + 1;
        const inTop    = userRank > 0 && userRank <= TOP_N;

        let userNote = '';
        if (!inTop) {
            const s = userData[userId]?.stats || {};
            userNote = userRank > 0
                ? `\n\n━━━━━━━━━━━━━━━━━━━━\n📍 **Kalintaada: #${userRank}** · ⚡ **${s.blitzWins || 0}** guul · 🎮 **${s.blitzPlayed || 0}** ciyaar`
                : `\n\n━━━━━━━━━━━━━━━━━━━━\n📍 Wali blitz ciyaar kuma jirto`;
        }

        description = (lines || '_Wali cidna blitz ciyaarin_') + userNote;
        embedTitle  = '⚡ TOP 15 — BLITZ RANKING';
        embedColor  = '#f39c12';

    } else {
        const allIq = Object.entries(userData)
            .sort(([, a], [, b]) => (b.iq || 0) - (a.iq || 0));

        const top      = allIq.slice(0, TOP_N);
        const lines    = buildIqLines(top);
        const userRank = allIq.findIndex(([id]) => id === userId) + 1;
        const inTop    = userRank > 0 && userRank <= TOP_N;

        let userNote = '';
        if (!inTop) {
            const ud  = userData[userId] || {};
            const s   = ud.stats || {};
            const iq  = (ud.iq || 0).toLocaleString();
            const lvl = getLevel(ud.iq || 0);
            userNote  = userRank > 0
                ? `\n\n━━━━━━━━━━━━━━━━━━━━\n📍 **Kalintaada: #${userRank}** · 🧠 **${iq} IQ** · ⭐ Level **${lvl}** · ✅ **${s.duelWins || 0}** guul`
                : `\n\n━━━━━━━━━━━━━━━━━━━━\n📍 Wali IQ dhibco kuma lihid`;
        }

        description = (lines || '_Wali cidna IQ dhibco ma leh_') + userNote;
        embedTitle  = '🏆 TOP 15 — IQ RANKING';
        embedColor  = '#FFBF00';
    }

    const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setDescription(description)
        .setColor(embedColor)
        .setFooter({ text: '🧠 Garaad IQ System' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`top_toggle_${mode === 'blitz' ? 'iq' : 'blitz'}_${userId}`)
            .setLabel(mode === 'blitz' ? '🏆 IQ Ranking' : '⚡ Blitz')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_top_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
