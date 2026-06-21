const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/admin');

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS   = 30 * 24 * 60 * 60 * 1000;
const MAX_FETCH        = 1000;
const DELETE_DELAY_MS  = 1200; // avoid Discord rate limits on single deletes

module.exports = async function wipeCmd(message, args) {
    if (!isAdmin(message.author.id)) {
        return message.reply('🚫 Admin kaliya ayaa amarkan isticmaali kara.');
    }

    if (!message.guild) {
        return message.reply('⚠️ Amarkan kaliya server-ka dhexdiisa ayaa lagu isticmaali karaa.');
    }

    const limit = Math.min(parseInt(args[0], 10) || 1000, MAX_FETCH);
    if (!Number.isInteger(limit) || limit < 1) {
        return message.reply('⚠️ Isticmaal: `?wipe 1000` (ugu badan 1000 fariin)');
    }

    const status = await message.reply(`🔍 Raadinaya fariimo **30+ maalmood** ka duugsan oo gaaraya **${limit}**...`);

    const now       = Date.now();
    const cutoffOld = now - THIRTY_DAYS_MS;
    const channel   = message.channel;

    let lastId       = message.id;
    let scanned      = 0;
    let toDelete     = [];
    let keepScanning = true;

    // Step 1: collect message IDs older than 30 days
    while (keepScanning && toDelete.length < limit) {
        let batch;
        try {
            batch = await channel.messages.fetch({ limit: 100, before: lastId });
        } catch (e) {
            break;
        }
        if (!batch || batch.size === 0) break;

        for (const msg of batch.values()) {
            scanned++;
            if (msg.createdTimestamp < cutoffOld) {
                toDelete.push(msg);
                if (toDelete.length >= limit) break;
            }
            lastId = msg.id;
        }

        if (batch.size < 100) keepScanning = false;
        if (scanned > 5000) break; // safety cap on scan depth
    }

    if (toDelete.length === 0) {
        return status.edit(`✅ Wax fariimo ah oo **30+ maalmood** ka duugsan lama helin (waxaa la baadhay ${scanned} fariin).`);
    }

    await status.edit(
        `🗑️ Waa la helay **${toDelete.length}** fariin oo 30+ maalmood ah.\n` +
        `⏳ Tirtirka wuu socdaa — ${(toDelete.length * DELETE_DELAY_MS / 1000).toFixed(0)}s qiyaastii...`
    );

    // Step 2: delete one-by-one (Discord API requires this for messages older than 14 days)
    let deleted = 0;
    let failed  = 0;

    for (const msg of toDelete) {
        try {
            await msg.delete();
            deleted++;
        } catch {
            failed++;
        }
        await new Promise(r => setTimeout(r, DELETE_DELAY_MS));

        // Progress update every 50 messages
        if (deleted % 50 === 0 && deleted > 0) {
            await status.edit(`⏳ La tirtiray **${deleted}/${toDelete.length}**...`).catch(() => {});
        }
    }

    const finalEmbed = new EmbedBuilder()
        .setTitle('🗑️ Wipe Dhammaaday')
        .setColor('#2ecc71')
        .setDescription(
            `✅ **${deleted}** fariin oo 30+ maalmood ah ayaa la tirtiray.\n` +
            (failed > 0 ? `⚠️ **${failed}** fariin lama tirtirin (perm error ama already deleted).\n` : '') +
            `🔍 Wadarta la baadhay: ${scanned} fariin`
        )
        .setFooter({ text: `Garaad Admin • ${message.author.username}` });

    return status.edit({ content: '', embeds: [finalEmbed] }).catch(() => {
        return channel.send({ embeds: [finalEmbed] });
    });
};
