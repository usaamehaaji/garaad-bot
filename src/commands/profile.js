// =====================================================================
// AMARKA: ?profile [@user]
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData }     = require('../store');
const { checkUser, getLevel, getDisplayTitle } = require('../utils/helpers');

module.exports = async function profileCommand(message) {
    const target = message.mentions.users.first() || message.author;
    checkUser(target.id);
    const data = userData[target.id];

    const level      = getLevel(data.iq);
    const nextLvlIq  = (level + 1) * 200;
    const titleTag   = getDisplayTitle(target.id) ? `[${getDisplayTitle(target.id)}] ` : '';

    const embed = new EmbedBuilder()
        .setTitle(`👤 Profile-ka Garaad: ${titleTag}${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🧠 IQ Score',    value: `**${data.iq} IQ**`,    inline: true },
            { name: '✨ XP Points',   value: `**${data.xp} XP**`,    inline: true },
            { name: '📈 Level',       value: `**Level ${level}**`,   inline: true },
            { name: '🎯 Next Level', value: `**${nextLvlIq} IQ** for Level ${level + 1}`, inline: false },
            { name: '⭐ Stars',       value: `**${data.stars}**`,    inline: true },
            { name: '🛡️ Shields',    value: `**${data.inventory.shield}**`,  inline: true },
            {
                name: '⚡ Double XP',
                value: data.doubleXpUntil > Date.now()
                    ? `**Active** (${Math.ceil((data.doubleXpUntil - Date.now()) / 60000)} min)`
                    : '**Off**',
                inline: true,
            },
            { name: '💡 Hints',       value: `**${data.inventory.hint}**`,    inline: true },
            { name: '🔄 Retries',     value: `**${data.inventory.retry}**`,  inline: true },
            { name: '🏷️ Title',      value: getDisplayTitle(target.id) ? `**${getDisplayTitle(target.id)}**` : '—', inline: true },
        )
        .setColor('#9b59b6');

    const viewerId = message.author.id;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_profile_${viewerId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
