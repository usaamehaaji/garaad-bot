const { EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../../src/utils/admin');

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_FETCH        = 1000;
const OLD_DELETE_DELAY = 300; // ms between old-message deletes (reduced from 1200)

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

    const status = await message.reply(`🔍 Raadinaya fariimaha **${limit}** ee ugu dambeeyay...`);

    const now    = Date.now();
    const cutoff = now - FOURTEEN_DAYS_MS;
    const channel = message.channel;

    let lastId    = message.id;
    let scanned   = 0;
    let recentMsgs = []; // < 14 days → bulkDelete
    let oldMsgs    = []; // ≥ 14 days → one by one

    // Collect messages
    while (recentMsgs.length + oldMsgs.length < limit) {
        let batch;
        try {
            batch = await channel.messages.fetch({ limit: 100, before: lastId });
        } catch { break; }
        if (!batch || batch.size === 0) break;

        for (const msg of batch.values()) {
            scanned++;
            if (msg.createdTimestamp >= cutoff) {
                recentMsgs.push(msg);
            } else {
                oldMsgs.push(msg);
            }
            lastId = msg.id;
            if (recentMsgs.length + oldMsgs.length >= limit) break;
        }

        if (batch.size < 100) break;
        if (scanned > 5000) break;
    }

    const total = recentMsgs.length + oldMsgs.length;
    if (total === 0) {
        return status.edit(`✅ Wax fariimo ah lama helin (waxaa la baadhay ${scanned} fariin).`);
    }

    await status.edit(
        `🗑️ Waa la helay **${total}** fariin.\n` +
        `⚡ Cusub (bulk): **${recentMsgs.length}** | 🐢 Duug: **${oldMsgs.length}**\n` +
        `⏳ Tirtirka wuu socdaa...`
    );

    let deleted = 0;
    let failed  = 0;

    // --- BULK DELETE (messages < 14 days) ---
    for (let i = 0; i < recentMsgs.length; i += 100) {
        const batch = recentMsgs.slice(i, i + 100);
        try {
            const result = await channel.bulkDelete(batch, true);
            deleted += result.size;
        } catch {
            // If bulkDelete fails, try one by one
            for (const msg of batch) {
                try { await msg.delete(); deleted++; } catch { failed++; }
            }
        }
    }

    // --- ONE BY ONE (messages ≥ 14 days, Discord API limit) ---
    for (const msg of oldMsgs) {
        try {
            await msg.delete();
            deleted++;
        } catch { failed++; }
        if (oldMsgs.length > 10) {
            await new Promise(r => setTimeout(r, OLD_DELETE_DELAY));
        }
        if (deleted % 50 === 0 && deleted > 0) {
            await status.edit(`⏳ La tirtiray **${deleted}/${total}**...`).catch(() => {});
        }
    }

    const finalEmbed = new EmbedBuilder()
        .setTitle('🗑️ Wipe Dhammaaday')
        .setColor('#2ecc71')
        .setDescription(
            `✅ **${deleted}** fariin oo la tirtiray.\n` +
            `⚡ Bulk delete: **${recentMsgs.length}** | 🐢 Keli-keli: **${oldMsgs.length}**\n` +
            (failed > 0 ? `⚠️ **${failed}** fariin lama tirtirin (permissions ama already deleted).\n` : '') +
            `🔍 Wadarta la baadhay: ${scanned} fariin`
        )
        .setFooter({ text: `Garaad Admin • ${message.author.username}` });

    return status.edit({ content: '', embeds: [finalEmbed] }).catch(() => {
        return channel.send({ embeds: [finalEmbed] });
    });
};
