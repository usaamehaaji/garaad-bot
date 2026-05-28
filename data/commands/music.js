// =====================================================================
// MUSIC COMMANDS — DisTube + yt-dlp (auto-downloads binary)
// =====================================================================

const { isAdmin } = require('../../src/utils/admin');
const { EmbedBuilder } = require('discord.js');

function dt() {
    return require('../../src/music/disTubeSetup').getDisTube();
}

async function joinCmd(message, args) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const query = args.join(' ').trim();
    if (!query) return message.reply('⚠️ `?play <magaca gabar ama YouTube URL>`');
    const vc = message.member?.voice?.channel;
    if (!vc) return message.reply('⚠️ Marka hore VC ku biir.');
    try {
        await dt().play(vc, query, { member: message.member, textChannel: message.channel, message });
    } catch (e) {
        console.error('[Music]', e.message);
        message.reply(`⚠️ Khalad: ${e.message.slice(0, 100)}`).catch(() => {});
    }
}

function skipMsgCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔');
    const q = dt().getQueue(message.guild.id);
    if (!q) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    q.skip().then(() => message.reply('⏭️ La gudbay.')).catch(() => message.reply('⚠️ Kaliya hal gabar.'));
}
function stopMsgCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔');
    const q = dt().getQueue(message.guild.id);
    if (!q) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    q.stop(); message.reply('⏹️ La joojiyay.');
}
function leaveMsgCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔');
    const q = dt().getQueue(message.guild.id);
    if (q) q.stop();
    message.reply('👋 VC ka baxay.');
}
function queueMsgCmd(message) {
    const q = dt().getQueue(message.guild.id);
    if (!q) return message.reply('📭 Queue maran tahay.');
    const lines = q.songs.slice(0, 10).map((s, i) =>
        i === 0 ? `🎵 **Hadda:** ${s.name} — ${s.formattedDuration}`
                : `**${i}.** ${s.name} — ${s.formattedDuration}`
    );
    message.reply({ embeds: [new EmbedBuilder().setTitle('🎶 Queue').setColor('#1db954').setDescription(lines.join('\n'))] });
}
function npMsgCmd(message) {
    const q = dt().getQueue(message.guild.id);
    if (!q?.songs[0]) return message.reply('⚠️ Hadda wax ma ciyaarayo.');
    const s = q.songs[0];
    message.reply({ embeds: [new EmbedBuilder().setColor('#1db954').setTitle('🎵 Hadda').setDescription(`**[${s.name}](${s.url})**\n⏱ ${s.formattedDuration}`).setThumbnail(s.thumbnail)] });
}

// For interaction handler buttons
function getQueueObj(guildId) { return dt().getQueue(guildId); }
function skipById(guildId)    { return dt().getQueue(guildId)?.skip(); }
function stopById(guildId)    { const q = dt().getQueue(guildId); if (q) q.stop(); }
function pauseById(guildId) {
    const q = dt().getQueue(guildId);
    if (!q) return null;
    if (q.paused) { q.resume(); return 'resumed'; }
    q.pause(); return 'paused';
}
function leaveById(guildId) { const q = dt().getQueue(guildId); if (q) q.stop(); }

module.exports = { joinCmd, skipMsgCmd, stopMsgCmd, leaveMsgCmd, queueMsgCmd, npMsgCmd,
    getQueueObj, skipById, stopById, pauseById, leaveById };
