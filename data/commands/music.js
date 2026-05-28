// =====================================================================
// MUSIC SYSTEM — Admin only
// ?play <song/url>  ?skip  ?stop  ?queue  ?np  ?leave
// =====================================================================

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
    StreamType,
} = require('@discordjs/voice');

const ytdl = require('@distube/ytdl-core');
const play  = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../src/utils/admin');

// Make ffmpeg-static available to @discordjs/voice
try {
    process.env.FFMPEG_PATH = require('ffmpeg-static');
} catch {};

// guildId → { connection, player, queue: [], current, textChannel }
const queues = new Map();

function fmtDuration(sec) {
    if (!sec) return '?:??';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Internal: stream a song ────────────────────────────────────────
async function getStream(url) {
    // Try WebmOpus first — direct opus, no ffmpeg needed
    try {
        const info   = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, {
            filter:  f => f.codecs === 'opus' && f.container === 'webm' && f.audioSampleRate == '48000',
            quality: 'highest',
        });
        if (format) {
            const stream = ytdl.downloadFromInfo(info, { format, highWaterMark: 1 << 25 });
            return createAudioResource(stream, { inputType: StreamType.WebmOpus });
        }
    } catch {}

    // Fallback — arbitrary stream via ffmpeg
    const stream = ytdl(url, {
        filter:        'audioonly',
        quality:       'highestaudio',
        highWaterMark: 1 << 25,
    });
    return createAudioResource(stream, { inputType: StreamType.Arbitrary });
}

// ── Internal: play next ────────────────────────────────────────────
async function playNext(guildId) {
    const q = queues.get(guildId);
    if (!q) return;

    if (q.queue.length === 0) {
        q.current = null;
        q.textChannel.send('✅ Queue dhammaatay. Bot VC ku jiraa — `?play <gabar>` ku dar.').catch(() => {});
        return; // stay in VC — don't destroy
    }

    const song = q.queue.shift();
    q.current  = song;

    try {
        const resource = await getStream(song.url);
        q.player.play(resource);

        q.textChannel.send({
            embeds: [new EmbedBuilder()
                .setColor('#1db954')
                .setTitle('🎵 Hadda Ciyaaraysa')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: '⏱ Muddada',  value: song.duration, inline: true },
                    { name: '📋 Queue',    value: `${q.queue.length} gabar haray`, inline: true }
                )
                .setThumbnail(song.thumbnail || null)
                .setFooter({ text: 'Garaad Bot Music' })
            ]
        }).catch(() => {});
    } catch (e) {
        console.error('[Music] Playback error:', e.message);
        q.textChannel.send(`⚠️ "${song.title}" ciyaari kari waayay. Next...`).catch(() => {});
        playNext(guildId);
    }
}

// ── ?play <query> ──────────────────────────────────────────────────
async function joinCmd(message, args) {
    if (!isAdmin(message.author.id))
        return message.reply('⛔ Admin kaliya.');

    const query = args.join(' ').trim();
    if (!query)
        return message.reply('⚠️ Isticmaal: `?play <magaca gabar ama YouTube URL>`');

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel)
        return message.reply('⚠️ Marka hore VC (voice channel) ku biir.');

    const searching = await message.reply('🔍 Raadinaya...');

    let songInfo;
    try {
        let videoUrl = query;

        // If not a URL, search YouTube
        if (!ytdl.validateURL(query)) {
            const results = await play.search(query, { limit: 1 });
            if (!results.length) {
                await searching.edit('❌ Gabar lama helin. Magac kale isku day.');
                return;
            }
            videoUrl = results[0].url;
        }

        const info = await ytdl.getBasicInfo(videoUrl);
        const det  = info.videoDetails;

        songInfo = {
            title:     det.title,
            url:       det.video_url,
            duration:  fmtDuration(parseInt(det.lengthSeconds)),
            thumbnail: det.thumbnails?.slice(-1)[0]?.url || '',
        };
    } catch (e) {
        console.error('[Music] Search/info error:', e.message);
        await searching.edit('❌ Khalad raadin. YouTube URL toos ah isku day.').catch(() => {});
        return;
    }

    const guildId = message.guild.id;

    // Add to existing queue
    if (queues.has(guildId)) {
        queues.get(guildId).queue.push(songInfo);
        return searching.edit({
            content: '',
            embeds: [new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('➕ Queue-ga Lagu Daray')
                .setDescription(`**[${songInfo.title}](${songInfo.url})**`)
                .addFields({ name: '⏱ Muddada', value: songInfo.duration, inline: true })
                .setThumbnail(songInfo.thumbnail || null)
            ]
        }).catch(() => {});
    }

    // Create new connection
    const connection = joinVoiceChannel({
        channelId:      voiceChannel.id,
        guildId,
        adapterCreator: message.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    queues.set(guildId, {
        connection,
        player,
        queue:       [songInfo],
        current:     null,
        textChannel: message.channel,
    });

    player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
    player.on('error', e => {
        console.error('[Music] Player error:', e.message);
        playNext(guildId);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            connection.destroy();
            queues.delete(guildId);
        }
    });

    await searching.edit({ content: `✅ VC **${voiceChannel.name}** ku biray!`, embeds: [] }).catch(() => {});
    playNext(guildId);
}

// ── ?skip ──────────────────────────────────────────────────────────
function skipCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const q = queues.get(message.guild.id);
    if (!q) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    q.player.stop();
    return message.reply('⏭️ La gudbay.');
}

// ── ?stop ──────────────────────────────────────────────────────────
function stopCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const guildId = message.guild.id;
    const q = queues.get(guildId);
    if (!q) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    q.queue = [];
    q.player.stop();
    q.connection.destroy();
    queues.delete(guildId);
    return message.reply('⏹️ Music la joojiyay, queue la nadiifiyay.');
}

// ── ?leave ─────────────────────────────────────────────────────────
function leaveCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const guildId = message.guild.id;
    const conn = getVoiceConnection(guildId);
    if (!conn) return message.reply('⚠️ Bot VC kuma jirto.');
    conn.destroy();
    queues.delete(guildId);
    return message.reply('👋 VC ka baxay.');
}

// ── ?queue ─────────────────────────────────────────────────────────
function queueCmd(message) {
    const q = queues.get(message.guild.id);
    if (!q || (!q.current && q.queue.length === 0))
        return message.reply('📭 Queue maran tahay.');

    const lines = [];
    if (q.current) lines.push(`🎵 **Hadda:** [${q.current.title}](${q.current.url}) — ${q.current.duration}`);
    q.queue.slice(0, 10).forEach((s, i) =>
        lines.push(`**${i + 1}.** [${s.title}](${s.url}) — ${s.duration}`)
    );
    if (q.queue.length > 10) lines.push(`*...iyo ${q.queue.length - 10} gabar oo kale*`);

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎶 Music Queue')
            .setColor('#1db954')
            .setDescription(lines.join('\n'))
        ]
    });
}

// ── ?np ────────────────────────────────────────────────────────────
function npCmd(message) {
    const q = queues.get(message.guild.id);
    if (!q?.current) return message.reply('⚠️ Hadda wax ma ciyaarayo.');
    return message.reply({
        embeds: [new EmbedBuilder()
            .setColor('#1db954')
            .setTitle('🎵 Hadda Ciyaaraysa')
            .setDescription(`**[${q.current.title}](${q.current.url})**\n⏱ ${q.current.duration}`)
            .setThumbnail(q.current.thumbnail || null)
        ]
    });
}

module.exports = { joinCmd, skipCmd, stopCmd, leaveCmd, queueCmd, npCmd };
