const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasClaimedRecently, getRemainingCooldown, checkVoted } = require('../economy/voteStore');
const { checkUser } = require('../utils/helpers');
const { userData }  = require('../store');

const TOPGG_URL       = 'https://top.gg/bot/1495341089266073705';
const VOTE_REWARD_IQ  = 12;
const VOTE_REWARD_AMT = 250;

module.exports = async function todayCommand(message) {
    const userId = message.author.id;
    checkUser(userId);

    // 1. Cooldown check — hore u claiméeyay?
    if (hasClaimedRecently(userId)) {
        const rem   = getRemainingCooldown(userId);
        const hours = Math.floor(rem / 3600000);
        const mins  = Math.floor((rem % 3600000) / 60000);
        const row   = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`close_today_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
        );
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⏳ Vote Cooldown')
                .setColor('#e74c3c')
                .setDescription(`Horay ayaad u claiméysay!\n\n**${hours}s ${mins}d** ka dib dib u tijaabi.`)
                .setFooter({ text: '24 saacadood • Garaad Bot' })],
            components: [row],
        });
    }

    // 2. top.gg API: miyuu codeeyay?
    const voted = await checkVoted(userId);

    if (voted) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vote_claim_btc_${userId}`) .setLabel('₿ +250 BTC') .setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`vote_claim_gold_${userId}`).setLabel('🥇 +250 Gold').setStyle(ButtonStyle.Primary),
        );
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🎁 Vote Abaalmarinta — Dooro!')
                .setColor('#f1c40f')
                .setDescription(
                    `✅ Vote-gaaga waa la xaqiijiyay!\n\n` +
                    `🧠 **+${VOTE_REWARD_IQ} IQ** — hadda dooro:\n\n` +
                    `₿ **+${VOTE_REWARD_AMT} BTC**  ama  🥇 **+${VOTE_REWARD_AMT} Gold**`
                )
                .setFooter({ text: 'Garaad Bot — Vote Abaalmarino' })],
            components: [row],
        });
    }

    // 3. Weli ma codeynin — vote panel
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setURL(TOPGG_URL).setLabel('🗳️ Vote Hadda ↗').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setCustomId(`close_today_${userId}`).setLabel('❌ Iska xir').setStyle(ButtonStyle.Danger),
    );
    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🗳️ Vote — Garaad Bot')
            .setColor('#3498db')
            .setDescription(
                `Bot-ka u codeey si aad abaalmarino u hesho!\n\n` +
                `🎁 **Abaalmarino (vote kasta):**\n` +
                `🧠 +${VOTE_REWARD_IQ} IQ\n` +
                `₿ +${VOTE_REWARD_AMT} BTC  **ama**  🥇 +${VOTE_REWARD_AMT} Gold\n\n` +
                `📋 **Sida:**\n` +
                `1️⃣ **Vote Hadda ↗** riix\n` +
                `2️⃣ top.gg ku codeey\n` +
                `3️⃣ \`?today\` qor — abaalmarintaada dooro\n\n` +
                `⏰ 24 saacadood kasta ayaad codeeyn kartaa`
            )
            .setFooter({ text: 'Garaad Bot — top.gg' })],
        components: [row],
    });
};
