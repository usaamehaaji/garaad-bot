const { EmbedBuilder } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');
const { userData, saveData } = require('../../store');
const { checkUser, fmt } = require('../../utils/helpers');
const { isAdmin, listAdmins } = require('../../utils/admin');

const OWNER_ID    = '1191096205955055690';
const ASSET_LABELS = { btc: '₿ BTC', gold: '🥇 Gold' };

async function notifyAdminAction(client, adminUser, targetId, type, amount) {
    try {
        const recipients = new Set([OWNER_ID, ...listAdmins()]);
        recipients.delete(adminUser.id);
        const typeLabel = type === 'iq' ? `${amount} IQ` : `₿${fmt(amount)}`;
        const msg =
            `🔐 **Admin Action Log**\n` +
            `👤 Admin: **${adminUser.username}** (\`${adminUser.id}\`)\n` +
            `⚙️ Action: Give **${typeLabel}** → <@${targetId}>\n` +
            `🕐 ${new Date().toUTCString()}`;
        for (const uid of recipients) {
            const u = await client.users.fetch(uid).catch(() => null);
            if (u) await u.send(msg).catch(() => {});
        }
    } catch {}
}

module.exports = async function giveCmd(message, args) {
    const userId  = message.author.id;
    const target  = message.mentions.users.first();
    const adminMode = isAdmin(userId);

    if (!target) {
        const usage = adminMode
            ? '**Isticmaal (Admin):** `?give @user iq 30` ama `?give @user btc 300`'
            : '**Isticmaal:** `?give @user btc 200`';
        return message.reply({ embeds: [new EmbedBuilder().setDescription(usage).setColor('#e74c3c')] });
    }

    if (target.id === userId) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ Adiga naftu lacag uma dirin kartid.').setColor('#e74c3c')] });
    }

    if (target.bot) {
        return message.reply({ embeds: [new EmbedBuilder().setDescription('⚠️ Bot-ka lacag uma dirin kartid.').setColor('#e74c3c')] });
    }

    const asset  = (args[1] || '').toLowerCase();
    const amount = parseInt(args[2], 10);

    // ── Admin mode: give IQ or BTC for free, then notify ──
    if (adminMode) {
        if (!['iq', 'btc'].includes(asset) || isNaN(amount) || amount <= 0) {
            return message.reply({ embeds: [new EmbedBuilder()
                .setDescription('**Isticmaal (Admin):** `?give @user iq 30` ama `?give @user btc 300`')
                .setColor('#e74c3c')] });
        }

        if (asset === 'iq') {
            checkUser(target.id);
            userData[target.id].iq = (userData[target.id].iq || 0) + amount;
            saveData();
        } else {
            checkEconUser(target.id);
            econData[target.id].btc = (econData[target.id].btc || 0) + amount;
            saveEcon();
        }

        await notifyAdminAction(message.client, message.author, target.id, asset, amount);

        const label = asset === 'iq' ? `${amount} IQ` : `₿${fmt(amount)}`;
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle('🎁 Admin Give')
            .setColor('#2ecc71')
            .setDescription(`✅ **${label}** waxaad siisay <@${target.id}>`)
            .setFooter({ text: 'Garaad Admin' })] });
    }

    // ── Player mode: btc/gold peer-to-peer ──
    if (!['btc', 'gold'].includes(asset) || isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('**Isticmaal:** `?give @user btc 200` ama `?give @user gold 300`')
            .setColor('#e74c3c')] });
    }

    checkEconUser(userId);
    checkEconUser(target.id);
    const d  = econData[userId];
    const dt = econData[target.id];

    if ((d[asset] || 0) < amount) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription(`⚠️ Ma haysid **${fmt(amount)} ${ASSET_LABELS[asset]}** si aad u dirtid.`)
            .setColor('#e74c3c')] });
    }

    d[asset]  = (d[asset]  || 0) - amount;
    dt[asset] = (dt[asset] || 0) + amount;
    saveEcon();

    return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('💸 Lacag La Diray!')
        .setColor('#2ecc71')
        .setDescription(
            `✅ **${fmt(amount)} ${ASSET_LABELS[asset]}** waxaad u diray\n\n` +
            `Hadhaagaaga: **${fmt(d[asset])} ${ASSET_LABELS[asset]}**`
        )
        .setFooter({ text: 'Garaad Economy' })] });
};

module.exports.ASSET_LABELS = ASSET_LABELS;
