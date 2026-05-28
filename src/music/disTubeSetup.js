// =====================================================================
// DisTube Setup — initialized once with the Discord client
// =====================================================================

const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const { EmbedBuilder } = require('discord.js');

let distube = null;

function setupDisTube(client) {
    distube = new DisTube(client, {
        plugins: [new YouTubePlugin()],
        emitNewSongOnly: true,
        joinNewVoiceChannel: true,
    });

    distube.on('playSong', (queue, song) => {
        queue.textChannel?.send({
            embeds: [new EmbedBuilder()
                .setColor('#1db954')
                .setTitle('🎵 Hadda Ciyaaraysa')
                .setDescription(`**[${song.name}](${song.url})**`)
                .addFields(
                    { name: '⏱ Muddada',  value: song.formattedDuration, inline: true },
                    { name: '📋 Queue',    value: `${queue.songs.length - 1} gabar haray`, inline: true },
                    { name: '👤 Codsaday', value: `${song.user}`, inline: true }
                )
                .setThumbnail(song.thumbnail)
                .setFooter({ text: 'Garaad Bot Music • ?skip ?stop ?queue ?np ?leave' })
            ]
        }).catch(() => {});
    });

    distube.on('addSong', (queue, song) => {
        queue.textChannel?.send({
            embeds: [new EmbedBuilder()
                .setColor('#9b59b6')
                .setDescription(`➕ **[${song.name}](${song.url})** — ${song.formattedDuration} — queue position **${queue.songs.length}**`)
            ]
        }).catch(() => {});
    });

    distube.on('finish', queue => {
        queue.textChannel?.send('✅ Queue dhammaatay. Bot VC ku jiraa — `?play <gabar>` ku dar.').catch(() => {});
    });

    distube.on('error', (e, queue) => {
        console.error('[DisTube] Error:', e.message);
        queue?.textChannel?.send(`⚠️ Khalad: ${e.message}`).catch(() => {});
    });

    distube.on('disconnect', queue => {
        queue.textChannel?.send('👋 VC ka baxay.').catch(() => {});
    });

    console.log('[Music] DisTube initialized');
    return distube;
}

function getDisTube() { return distube; }

module.exports = { setupDisTube, getDisTube };
