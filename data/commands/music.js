// =====================================================================
// MUSIC — uses same packages as working magool-music bot
// yt-dlp-exec + @discordjs/voice + sodium-native + ffmpeg-static
// =====================================================================

const {
    joinVoiceChannel, createAudioPlayer, createAudioResource,
    AudioPlayerStatus, VoiceConnectionStatus, entersState,
    getVoiceConnection, StreamType,
} = require('@discordjs/voice');

const ytDlpExec  = require('yt-dlp-exec');
const ytdl       = require('@distube/ytdl-core');
const play       = require('play-dl');
const ffmpegPath = require('ffmpeg-static');
const { spawn }  = require('child_process');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../src/utils/admin');

// Set ffmpeg path for @discordjs/voice
process.env.FFMPEG_PATH = ffmpegPath;

// guildId → { connection, player, queue, current, textChannel }
const queues = new Map();

function fmtDur(sec) {
    if (!sec) return '?:??';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function controlRow(guildId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`music_pause_${guildId}`).setLabel('⏸ Pause').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`music_skip_${guildId}`) .setLabel('⏭ Skip') .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`music_stop_${guildId}`) .setLabel('⏹ Stop') .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`music_queue_${guildId}`).setLabel('📋 Queue').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`music_leave_${guildId}`).setLabel('👋 Leave').setStyle(ButtonStyle.Danger),
    );
}

// ── Stream using yt-dlp-exec piped through ffmpeg ──────────────────
async function getStream(url) {
    const ytdlpProc = ytDlpExec.exec(url, {
        format:     'bestaudio/best',
        output:     '-',
        quiet:      true,
        noWarnings: true,
        noCheckCertificates: true,
    }, { stdio: ['ignore', 'pipe', 'ignore'] });

    const ffmpeg = spawn(ffmpegPath, [
        '-reconnect', '1', '-reconnect_streamed', '1',
        '-i', 'pipe:0',
        '-vn', '-ar', '48000', '-ac', '2',
        '-f', 's16le', 'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    ytdlpProc.stdout.pipe(ffmpeg.stdin);

    ffmpeg.stdin.on('error', () => {});
    ytdlpProc.stdout.on('error', () => {});

    return createAudioResource(ffmpeg.stdout, {
        inputType:    StreamType.Raw,
        inlineVolume: true,
    });
}

// ── Get song info ──────────────────────────────────────────────────
async function getSongInfo(query) {
    let url = query;

    if (!ytdl.validateURL(query)) {
        const results = await play.search(query, { limit: 1 });
        if (!results.length) throw new Error('Lama helin');
        url = results[0].url;
    }

    const info = await ytdl.getBasicInfo(url);
    const det  = info.videoDetails;
    return {
        title:     det.title,
        url:       det.video_url,
        duration:  fmtDur(parseInt(det.lengthSeconds || 0)),
        thumbnail: det.thumbnails?.slice(-1)[0]?.url || null,
    };
}

// ── Play next in queue ─────────────────────────────────────────────
async function playNext(guildId) {
    const q = queues.get(guildId);
    if (!q) return;

    if (!q.queue.length) {
        q.current = null;
        q.textChannel?.send('✅ Queue dhammaatay. `?play <gabar>` ku dar.').catch(() => {});
        return;
    }

    const song = q.queue.shift();
    q.current  = song;

    try {
        const resource = await getStream(song.url);
        q.player.play(resource);

        q.textChannel?.send({
            embeds: [new EmbedBuilder()
                .setColor('#1db954')
                .setTitle('🎵 Hadda Ciyaaraysa')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: '⏱ Muddada', value: song.duration, inline: true },
                    { name: '📋 Queue',   value: `${q.queue.length} haray`, inline: true },
                )
                .setThumbnail(song.thumbnail)
                .setFooter({ text: 'Garaad Bot Music' })
            ],
            components: [controlRow(guildId)],
        }).catch(() => {});
    } catch (e) {
        console.error('[Music] playNext error:', e.message);
        q.textChannel?.send(`⚠️ "${song.title}" ciyaari kari waayay. Next...`).catch(() => {});
        playNext(guildId);
    }
}

// ── ?play ──────────────────────────────────────────────────────────
async function joinCmd(message, args) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const query = args.join(' ').trim();
    if (!query) return message.reply('⚠️ `?play <magaca gabar ama YouTube URL>`');

    const vc = message.member?.voice?.channel;
    if (!vc) return message.reply('⚠️ Marka hore VC (voice channel) ku biir.');

    const msg = await message.reply('🔍 Raadinaya...');

    let song;
    try {
        song = await getSongInfo(query);
    } catch (e) {
        return msg.edit('❌ Lama helin. Magac kale isku day.').catch(() => {});
    }

    const guildId = message.guild.id;

    // Add to existing queue
    if (queues.has(guildId)) {
        queues.get(guildId).queue.push(song);
        return msg.edit({
            content: '',
            embeds: [new EmbedBuilder().setColor('#9b59b6')
                .setDescription(`➕ **[${song.title}](${song.url})** — ${song.duration} — queue-ga lagu daray`)
            ],
        }).catch(() => {});
    }

    // New connection
    const conn = joinVoiceChannel({
        channelId:      vc.id,
        guildId,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf:       false,
    });

    const player = createAudioPlayer();
    conn.subscribe(player);

    queues.set(guildId, {
        connection:  conn,
        player,
        queue:       [song],
        current:     null,
        textChannel: message.channel,
    });

    player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
    player.on('error', e => {
        console.error('[Music] Player error:', e.message);
        playNext(guildId);
    });

    conn.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
                entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            conn.destroy();
            queues.delete(guildId);
        }
    });

    await msg.edit({ content: `✅ VC **${vc.name}** ku biray!`, embeds: [] }).catch(() => {});
    playNext(guildId);
}

// ── Controls ───────────────────────────────────────────────────────
function skipMsgCmd(message)  { if (!isAdmin(message.author.id)) return message.reply('⛔'); const q = queues.get(message.guild.id); if (!q) return message.reply('⚠️'); q.player.stop(); message.reply('⏭️ La gudbay.'); }
function stopMsgCmd(message)  { if (!isAdmin(message.author.id)) return message.reply('⛔'); const q = queues.get(message.guild.id); if (!q) return message.reply('⚠️'); q.queue = []; q.player.stop(); q.connection.destroy(); queues.delete(message.guild.id); message.reply('⏹️ La joojiyay.'); }
function leaveMsgCmd(message) { if (!isAdmin(message.author.id)) return message.reply('⛔'); const conn = getVoiceConnection(message.guild.id); if (conn) conn.destroy(); queues.delete(message.guild.id); message.reply('👋 VC ka baxay.'); }
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
    message.reply({ embeds: [new EmbedBuilder().setColor('#1db954').setTitle('🎵 Hadda').setDescription(`**[${q.current.title}](${q.current.url})**\n⏱ ${q.current.duration}`).setThumbnail(q.current.thumbnail)] });
}

// For interaction buttons
function getQueueObj(guildId)  { return queues.get(guildId); }
function skipById(guildId)     { queues.get(guildId)?.player.stop(); }
function stopById(guildId)     { const q = queues.get(guildId); if (!q) return; q.queue = []; q.player.stop(); q.connection.destroy(); queues.delete(guildId); }
function pauseById(guildId) {
    const q = queues.get(guildId);
    if (!q) return null;
    const st = q.player.state.status;
    if (st === AudioPlayerStatus.Paused) { q.player.unpause(); return 'resumed'; }
    q.player.pause(); return 'paused';
}
function leaveById(guildId)    { const conn = getVoiceConnection(guildId); if (conn) conn.destroy(); queues.delete(guildId); }

module.exports = { joinCmd, skipMsgCmd, stopMsgCmd, leaveMsgCmd, queueMsgCmd, npMsgCmd,
    getQueueObj, skipById, stopById, pauseById, leaveById };
