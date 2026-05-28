// =====================================================================
// MUSIC SYSTEM — Admin only
// ?join <song/url>  ?skip  ?stop  ?queue  ?np  ?leave
// =====================================================================

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
} = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../src/utils/admin');

// guildId → { connection, player, queue: [], current: null, textChannel }
const queues = new Map();

// ── Internal: play next song in queue ──────────────────────────────
async function playNext(guildId) {
    const q = queues.get(guildId);
    if (!q) return;

    if (q.queue.length === 0) {
        q.textChannel.send('✅ Queue dhammaatay. Bot VC ka baxayaa...').catch(() => {});
        setTimeout(() => {
            const conn = getVoiceConnection(guildId);
            if (conn) conn.destroy();
            queues.delete(guildId);
        }, 5000);
        return;
    }

    const song = q.queue.shift();
    q.current  = song;

    try {
        const stream   = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        q.player.play(resource);

        q.textChannel.send({
            embeds: [new EmbedBuilder()
                .setColor('#1db954')
                .setDescription(`🎵 **Hadda ciyaaraysa:**\n[${song.title}](${song.url})\n⏱ ${song.duration}`)
                .setThumbnail(song.thumbnail)
                .setFooter({ text: `Queue: ${q.queue.length} gabar haray` })
            ]
        }).catch(() => {});
    } catch (e) {
        console.error('[Music] Stream error:', e.message);
        q.textChannel.send(`⚠️ "${song.title}" ciyaari kari waayay. Next...`).catch(() => {});
        playNext(guildId);
    }
}

// ── ?join <song/url> ───────────────────────────────────────────────
async function joinCmd(message, args) {
    if (!isAdmin(message.author.id))
        return message.reply('⛔ Admin kaliya.');

    const query = args.join(' ').trim();
    if (!query)
        return message.reply('⚠️ Isticmaal: `?join <magaca gabar ama YouTube URL>`');

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel)
        return message.reply('⚠️ Marka hore VC (voice channel) ku biir, ka dibna `?join <gabar>` isticmaal.');

    // Search
    const searching = await message.reply('🔍 Raadinaya...');

    let songInfo;
    try {
        if (play.yt_validate(query) === 'video') {
            const info = await play.video_info(query);
            songInfo = {
                title:     info.video_details.title,
                url:       info.video_details.url,
                duration:  info.video_details.durationRaw,
                thumbnail: info.video_details.thumbnails?.[0]?.url || '',
            };
        } else {
            const results = await play.search(query, { limit: 1 });
            if (!results.length) {
                await searching.edit('❌ Gabar lama helin. Magac kale isku day.');
                return;
            }
            songInfo = {
                title:     results[0].title,
                url:       results[0].url,
                duration:  results[0].durationRaw,
                thumbnail: results[0].thumbnails?.[0]?.url || '',
            };
        }
    } catch (e) {
        console.error('[Music] Search error:', e.message);
        await searching.edit('❌ Raadin khalad ah. Dib isku day.').catch(() => {});
        return;
    }

    const guildId = message.guild.id;

    // Already have a queue → add to it
    if (queues.has(guildId)) {
        queues.get(guildId).queue.push(songInfo);
        return searching.edit({
            content: '',
            embeds: [new EmbedBuilder()
                .setColor('#9b59b6')
                .setDescription(`➕ **Queue-ga lagu daray:**\n[${songInfo.title}](${songInfo.url})\n⏱ ${songInfo.duration}`)
                .setThumbnail(songInfo.thumbnail)
            ]
        }).catch(() => {});
    }

    // New connection
    const connection = joinVoiceChannel({
        channelId:      voiceChannel.id,
        guildId:        guildId,
        adapterCreator: message.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    const q = { connection, player, queue: [songInfo], current: null, textChannel: message.channel };
    queues.set(guildId, q);

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
    if (q.current) lines.push(`🎵 **Hadda:** [${q.current.title}](${q.current.url})`);
    q.queue.slice(0, 10).forEach((s, i) => lines.push(`**${i + 1}.** [${s.title}](${s.url})`));
    if (q.queue.length > 10) lines.push(`*...iyo ${q.queue.length - 10} gabar oo kale*`);

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎶 Music Queue')
            .setColor('#1db954')
            .setDescription(lines.join('\n'))
        ]
    });
}

// ── ?np (now playing) ──────────────────────────────────────────────
function npCmd(message) {
    const q = queues.get(message.guild.id);
    if (!q?.current) return message.reply('⚠️ Hadda wax ma ciyaarayo.');
    return message.reply({
        embeds: [new EmbedBuilder()
            .setColor('#1db954')
            .setDescription(`🎵 **Hadda ciyaaraysa:**\n[${q.current.title}](${q.current.url})\n⏱ ${q.current.duration}`)
            .setThumbnail(q.current.thumbnail)
        ]
    });
}

module.exports = { joinCmd, skipCmd, stopCmd, leaveCmd, queueCmd, npCmd };
