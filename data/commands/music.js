// =====================================================================
// MUSIC COMMANDS — Admin only — powered by DisTube
// =====================================================================

const { isAdmin } = require('../../src/utils/admin');
const { getDisTube } = require('../../src/music/disTubeSetup');
const { EmbedBuilder } = require('discord.js');

function dt() { return getDisTube(); }

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

    try {
        await dt().play(voiceChannel, query, {
            member:      message.member,
            textChannel: message.channel,
            message,
        });
    } catch (e) {
        console.error('[Music] play error:', e.message);
        return message.reply(`⚠️ Khalad: ${e.message}`);
    }
}

// ── ?skip ──────────────────────────────────────────────────────────
async function skipCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const queue = dt().getQueue(message.guild.id);
    if (!queue) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    try {
        await queue.skip();
        return message.reply('⏭️ La gudbay.');
    } catch {
        return message.reply('⚠️ Queue kaliya hal gabar. Isticmaal `?stop`.');
    }
}

// ── ?stop ──────────────────────────────────────────────────────────
async function stopCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const queue = dt().getQueue(message.guild.id);
    if (!queue) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    await queue.stop();
    return message.reply('⏹️ Music la joojiyay.');
}

// ── ?pause / ?resume ───────────────────────────────────────────────
async function pauseCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const queue = dt().getQueue(message.guild.id);
    if (!queue) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    if (queue.paused) { queue.resume(); return message.reply('▶️ Sii waday.'); }
    queue.pause();
    return message.reply('⏸️ La joojiyay.');
}

// ── ?leave ─────────────────────────────────────────────────────────
async function leaveCmd(message) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const queue = dt().getQueue(message.guild.id);
    if (queue) await queue.stop();
    else {
        const voice = message.guild.members.me?.voice?.channel;
        if (!voice) return message.reply('⚠️ Bot VC kuma jirto.');
    }
    return message.reply('👋 VC ka baxay.');
}

// ── ?queue ─────────────────────────────────────────────────────────
function queueCmd(message) {
    const queue = dt().getQueue(message.guild.id);
    if (!queue) return message.reply('📭 Queue maran tahay.');

    const lines = queue.songs.slice(0, 11).map((s, i) =>
        i === 0
            ? `🎵 **Hadda:** [${s.name}](${s.url}) — ${s.formattedDuration}`
            : `**${i}.** [${s.name}](${s.url}) — ${s.formattedDuration}`
    );
    if (queue.songs.length > 11) lines.push(`*...iyo ${queue.songs.length - 11} kale*`);

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
    const queue = dt().getQueue(message.guild.id);
    if (!queue?.songs[0]) return message.reply('⚠️ Hadda wax ma ciyaarayo.');
    const s = queue.songs[0];
    return message.reply({
        embeds: [new EmbedBuilder()
            .setColor('#1db954')
            .setTitle('🎵 Hadda Ciyaaraysa')
            .setDescription(`**[${s.name}](${s.url})**\n⏱ ${s.formattedDuration}`)
            .setThumbnail(s.thumbnail)
        ]
    });
}

// ── ?volume <1-100> ────────────────────────────────────────────────
async function volumeCmd(message, args) {
    if (!isAdmin(message.author.id)) return message.reply('⛔ Admin kaliya.');
    const queue = dt().getQueue(message.guild.id);
    if (!queue) return message.reply('⚠️ Hadda music ma ciyaarayo.');
    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 1 || vol > 100) return message.reply('⚠️ Volume: 1–100');
    queue.setVolume(vol);
    return message.reply(`🔊 Volume: **${vol}%**`);
}

module.exports = { joinCmd, skipCmd, stopCmd, pauseCmd, leaveCmd, queueCmd, npCmd, volumeCmd };
