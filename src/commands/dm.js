// ?dm <fariin> — Player-ku fakirkiisa/talada admin oo dhan u dira
const { EmbedBuilder } = require('discord.js');
const { listAdmins }   = require('../utils/admin');

module.exports = async function dmCmd(message, args) {
    const text = args.join(' ').trim();
    if (!text) {
        return message.reply('⚠️ Fariin qor! Tusaale: `?dm Fikradaydu waxay tahay...`').catch(() => {});
    }

    const adminIds = listAdmins();
    if (adminIds.length === 0) {
        return message.reply('⚠️ Admin ma jiro hadda. Isku day mar dambe.').catch(() => {});
    }

    const embed = new EmbedBuilder()
        .setTitle('📩 Farriin Cusub — Player')
        .setColor('#3498db')
        .setDescription(
            `**Ka yimid:** <@${message.author.id}> (\`${message.author.username}\`)\n` +
            `**Server:** ${message.guild?.name || 'DM'}\n` +
            `**Channel:** ${message.guild ? `<#${message.channel.id}>` : 'DM'}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💬 **Farriinta:**\n> ${text}`
        )
        .setThumbnail(message.author.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Garaad Bot • ?dm system' });

    let sent = 0;
    for (const adminId of adminIds) {
        try {
            const admin = await message.client.users.fetch(adminId);
            await admin.send({ embeds: [embed] });
            sent++;
        } catch {}
    }

    if (sent > 0) {
        return message.reply(
            `✅ **Farriintaada waa la diray!**\n` +
            `_Admin-ka ayaa helayaa oo ku jawaabi doona._`
        ).catch(() => {});
    } else {
        return message.reply('❌ Admin-ka la gaari kari waayay. Isku day mar dambe.').catch(() => {});
    }
};
