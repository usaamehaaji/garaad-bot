// =====================================================================
// AMARKA: ?aqoon — Qaybta Aqoonta (Public Panel)
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, activeTournament, tournamentRegistry } = require('../store');
const { PREFIX, TOURNAMENT_R1_QUESTIONS, TOURNAMENT_R2_QUESTIONS, TOURNAMENT_FINAL_QUESTIONS } = require('../config');

module.exports = async function aqoonCommand(message) {
    const userId = message.author.id;

    // Hubi haddii tartan socdo channel-kan
    let tartanInfo = '';
    if (activeTournament && activeTournament.size > 0) {
        for (const [cid, state] of activeTournament.entries()) {
            const stageText = {
                'join':  '🟢 Diiwaangalin Furan',
                'play':  '🔴 Wareeggu Socdaa',
                'pause': '🟡 Admin Next ku sugaya',
            }[state.stage] || state.stage;

            const roundText = state.roundIdx === 0 ? 'Weli ma bilaabmin'
                : state.roundIdx === 1 ? `Wareegga 1aad (${TOURNAMENT_R1_QUESTIONS} su'aalood)`
                : state.roundIdx === 2 ? `Wareegga 2aad / Semi (${TOURNAMENT_R2_QUESTIONS} su'aalood)`
                : `Final 🏆 (${TOURNAMENT_FINAL_QUESTIONS} su'aalood)`;

            tartanInfo +=
                `\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏁 **TARTAN SOCDA** — <#${cid}>\n` +
                `📊 **${stageText}** · ${roundText}\n` +
                `👥 Ka qaybgalayaasha: **${(state.survivors?.size ?? state.players?.size) || 0}** qof\n`;
        }
    }

    // Haddii user diiwaangeliyay
    const myReg  = tournamentRegistry ? tournamentRegistry.get(userId) : null;
    const regLine = myReg
        ? `\n✅ **Adiga waxaad diiwaangelisay** tartan — Code DM-kaaga ku jira`
        : `\n📝 Tartan diiwaan geli: **Guji Register** badhanka hoose`;

    // Top 5 IQ
    const top5 = Object.entries(userData)
        .filter(([, d]) => typeof d.iq === 'number' && d.iq > 0)
        .map(([id, d]) => ({ id, iq: d.iq || 0 }))
        .sort((a, b) => b.iq - a.iq)
        .slice(0, 5);

    const top5Text = top5.length > 0
        ? top5.map((u, i) => {
            const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
            return `${medal} <@${u.id}> — **${u.iq} IQ**`;
        }).join('\n')
        : '_Ma jiraan ciyaaryahanno IQ leh_';

    const embed = new EmbedBuilder()
        .setTitle('🧠 Garaad — Qaybta Aqoonta')
        .setColor('#3498db')
        .setDescription(
            `**🎮 CIYAARAHA:**\n\n` +
            `\`${PREFIX}solo\` — Kaligaa ciyaar · **Dhibco ku xidhan xawliga!**\n` +
            `  • < 5s = **40pts** · 18s = **5pts**\n` +
            `  • 🔥 Streak: 2+ sax = bonus dhibcood\n\n` +
            `\`${PREFIX}duel @qof\` — Tartan 1v1 — dhig **5 IQ**, guulees **+10 IQ**\n` +
            `\`${PREFIX}quiz\` — Tartanka kooxda (3-100 qof)\n` +
            `` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**🏆 TARTAN (Tournament):**\n\n` +
            `\`${PREFIX}tartan\` — Dhawaaqid + Register button\n` +
            `\`${PREFIX}isdiiwaangeli\` — Hel code tartanka (DM)\n` +
            `\`${PREFIX}gal CODE\` — Ku biir tartanka\n` +
            `\`${PREFIX}tartan_status\` — Xaaladda tartanka hadda\n\n` +
            `**📚 Wareegyada:** R1 = **${TOURNAMENT_R1_QUESTIONS}** · R2 = **${TOURNAMENT_R2_QUESTIONS}** · Final = **${TOURNAMENT_FINAL_QUESTIONS}** su'aalood\n` +
            `**⚡ Dhibco:** < 5s = **40pts** · 18s = **5pts** (ku xidhan xawliga)${tartanInfo}${regLine}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `**🏅 TOP 5 IQ:**\n${top5Text}`
        )
        .setFooter({ text: `${PREFIX}top — liis buuxa · ${PREFIX}profile — xaaladda kuu gaar ah` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`aqoon_register_${userId}`)
            .setLabel('📝 Register Tartan')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`close_aqoon_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
