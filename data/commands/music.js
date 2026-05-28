// =====================================================================
// MUSIC — pure JS only (@discordjs/voice + play-dl + opusscript)
// =====================================================================

const {
    joinVoiceChannel, createAudioPlayer, createAudioResource,
    AudioPlayerStatus, VoiceConnectionStatus, entersState, getVoiceConnection,
} = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../src/utils/admin');

const queues = new Map(); // guildId → { connection, player, queue, current, textChannel, controlMsg }

function fmtDur(sec) {
    if (!sec) return '?:??';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function controlRow(guildId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`music_pause_${guildId}`) .setLabel('⏸ Pause').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`music_skip_${guildId}`)  .setLabel('⏭ Skip') .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`music_stop_${guildId}`)  .setLabel('⏹ Stop') .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`music_queue_${guildId}`) .setLabel('📋 Queue').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`music_leave_${guildId}`) .setLabel('👋 Leave').setStyle(ButtonStyle.Danger),
    );
}

function nowPlayingEmbed(song, queueLen) {
    return new EmbedBuilder()
        .setColor('#1db954')
        .setTitle('🎵 Hadda Ciyaaraysa')
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
            { name: '⏱ Muddada', value: song.duration, inline: true },
            { name: '📋 Queue',   value: `${queueLen} haray`, inline: true },
        )
        .setThumbnail(song.thumbnail || null)
        .setFooter({ text: 'Garaad Bot Music' });
}

async function playNext(guildId) {
    const q = queues.get(guildId);
    if (!q) return;

    if (q.queue.length === 0) {
        q.current = null;
        q.textChannel?.send('✅ Queue dhammaatay. `?play <gabar>` ku dar.').catch(() => {});
        return;
    }

    const song = q.queue.shift();
    q.current  = song;

    try {
        const src = await play.stream(song.url, { quality: 2 });
        const res = createAudioResource(src.stream, { inputType: src.type });
        q.player.play(res);

        // Update or send control message
        const payload = { embeds: [nowPlayingEmbed(song, q.queue.length)], components: [controlRow(guildId)] };
        if (q.controlMsg) {
            q.controlMsg.edit(payload).catch(() => {
                q.textChannel?.send(payload).then(m => { q.controlMsg = m; }).catch(() => {});
            });
        } else {
            q.textChannel?.send(payload).then(m => { q.controlMsg = m; }).catch(() => {});
        }
    } catch (e) {
        console.error('[Music]', e.message);
        q.textChannel?.send(`⚠️ "${song.title}" ciyaari kari waayay. Next...`).catch(() => {});
        playNext(guildId);
    }
}

// ── ?play <query> ──────────────────────────────────────────────────
async function joinCmd(message, args) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const query = args.join(' ').trim();
    if (!query) return message.reply('⚠️ `?play <magaca gabar ama YouTube URL>`');

    const vc = message.member?.voice?.channel;
    if (!vc) return message.reply('⚠️ Marka hore VC (voice channel) ku biir.');

    const msg = await message.reply('🔍 Raadinaya...');

    try {
        let url = query;
        if (play.yt_validate(query) !== 'video') {
            const res = await play.search(query, { limit: 1 });
            if (!res.length) return msg.edit('❌ Lama helin. Magac kale isku day.');
            url = res[0].url;
        }
        const info = await play.video_info(url);
        const det  = info.video_details;
        const song = {
            title:     det.title,
            url:       det.url,
            duration:  fmtDur(det.durationInSec),
            thumbnail: det.thumbnails?.slice(-1)[0]?.url || null,
        };

        const guildId = message.guild.id;

        if (queues.has(guildId)) {
            queues.get(guildId).queue.push(song);
            return msg.edit({ content: '', embeds: [
                new EmbedBuilder().setColor('#9b59b6')
                    .setDescription(`➕ **[${song.title}](${song.url})** — ${song.duration} queue-ga lagu daray`)
            ]});
        }

        const conn = joinVoiceChannel({ channelId: vc.id, guildId, adapterCreator: message.guild.voiceAdapterCreator });
        const player = createAudioPlayer();
        conn.subscribe(player);

        const q = { connection: conn, player, queue: [song], current: null, textChannel: message.channel, controlMsg: null };
        queues.set(guildId, q);

        player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
        player.on('error', e => { console.error('[Music]', e.message); playNext(guildId); });
        conn.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch { conn.destroy(); queues.delete(guildId); }
        });

        await msg.edit({ content: `✅ VC **${vc.name}** ku biray!`, embeds: [] });
        playNext(guildId);

    } catch (e) {
        console.error('[Music] Error:', e.message);
        msg.edit('❌ Khalad. YouTube URL toos ah isku day.').catch(() => {});
    }
}

// ── Controls ───────────────────────────────────────────────────────
function skipCmd(guildId) {
    const q = queues.get(guildId);
    if (q) q.player.stop();
}
function stopCmd(guildId) {
    const q = queues.get(guildId);
    if (!q) return;
    q.queue = []; q.player.stop(); q.connection.destroy(); queues.delete(guildId);
}
function pauseCmd(guildId) {
    const q = queues.get(guildId);
    if (!q) return false;
    if (q.player.state.status === AudioPlayerStatus.Paused) { q.player.unpause(); return 'resumed'; }
    q.player.pause(); return 'paused';
}
function leaveCmd(guildId) {
    const conn = getVoiceConnection(guildId);
    if (conn) conn.destroy();
    queues.delete(guildId);
}
function getQueue(guildId) { return queues.get(guildId); }

// ── Prefix wrappers ────────────────────────────────────────────────
function skipMsgCmd(message)  { if (!isAdmin(message.author.id)) return message.reply('⛔'); skipCmd(message.guild.id);  message.reply('⏭️ La gudbay.'); }
function stopMsgCmd(message)  { if (!isAdmin(message.author.id)) return message.reply('⛔'); stopCmd(message.guild.id);  message.reply('⏹️ La joojiyay.'); }
function leaveMsgCmd(message) { if (!isAdmin(message.author.id)) return message.reply('⛔'); leaveCmd(message.guild.id); message.reply('👋 VC ka baxay.'); }
function queueMsgCmd(message) {
    const q = queues.get(message.guild.id);
    if (!q || (!q.current && !q.queue.length)) return message.reply('📭 Queue maran tahay.');
    const lines = [];
    if (q.current) lines.push(`🎵 **Hadda:** [${q.current.title}](${q.current.url}) — ${q.current.duration}`);
    q.queue.slice(0, 9).forEach((s, i) => lines.push(`**${i+1}.** [${s.title}](${s.url}) — ${s.duration}`));
    message.reply({ embeds: [new EmbedBuilder().setTitle('🎶 Queue').setColor('#1db954').setDescription(lines.join('\n'))] });
}
function npMsgCmd(message) {
    const q = queues.get(message.guild.id);
    if (!q?.current) return message.reply('⚠️ Hadda wax ma ciyaarayo.');
    message.reply({ embeds: [nowPlayingEmbed(q.current, q.queue.length)] });
}

module.exports = { joinCmd, skipCmd, stopCmd, pauseCmd, leaveCmd, getQueue,
    skipMsgCmd, stopMsgCmd, leaveMsgCmd, queueMsgCmd, npMsgCmd, controlRow };
