const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');

const RING_NAMES = {
    silver:  '💍 Silver Ring',
    diamond: '💎 Diamond Ring',
    royal:   '👑 Royal Ring',
    somali:  '🇸🇴 Somali Ring',
};

function ensureRel(userId) {
    const d = userData[userId];
    d.relationship      ??= { partnerId: null, partnerUsername: null, ringType: null, since: null };
    d.friends           ??= [];
    d.pendingFriendReqs ??= [];
    d.pendingProposal   ??= null;
    d.ownedRings        ??= { silver: 0, diamond: 0, royal: 0, somali: 0 };
}

// ── ?friend @user ──────────────────────────────────────
async function friendCmd(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?friend @user`');
    if (target.id === message.author.id) return message.reply('⚠️ Adiga laftiisa saaxiib kama noqon kartid.');
    if (target.bot) return message.reply('⚠️ Bot saaxiib kama noqon kartid.');

    checkUser(message.author.id);
    checkUser(target.id);
    ensureRel(message.author.id);
    ensureRel(target.id);

    const sender   = userData[message.author.id];
    const receiver = userData[target.id];

    if ((sender.friends || []).includes(target.id))
        return message.reply(`💕 **${target.username}** horay baad saaxiib ugu ahayd.`);

    if ((receiver.pendingFriendReqs || []).includes(message.author.id))
        return message.reply(`⏳ Codsiga saaxiibtinimada horay ayaad u dirtay **${target.username}**.`);

    receiver.pendingFriendReqs.push(message.author.id);
    saveData();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rel_af_${message.author.id}`).setLabel('✅ Aqbal').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rel_df_${message.author.id}`).setLabel('❌ Diid').setStyle(ButtonStyle.Danger),
    );

    return message.reply({
        content: `💌 <@${target.id}> — **${message.author.username}** wuxuu kuu dirayaa codsiga saaxiibtinimada!`,
        components: [row],
    });
}

// ── ?unfriend @user ────────────────────────────────────
async function unfriendCmd(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?unfriend @user`');

    checkUser(message.author.id);
    ensureRel(message.author.id);
    ensureRel(target.id);

    const d = userData[message.author.id];
    if (!(d.friends || []).includes(target.id))
        return message.reply(`⚠️ **${target.username}** saaxiibkaaga kuma jiro.`);

    d.friends = d.friends.filter(id => id !== target.id);
    const td = userData[target.id];
    if (td) td.friends = (td.friends || []).filter(id => id !== message.author.id);
    saveData();

    return message.reply(`💔 **${target.username}** saaxiibyadaada ayaad ka saaray.`);
}

// ── ?friends ───────────────────────────────────────────
async function friendsListCmd(message) {
    checkUser(message.author.id);
    ensureRel(message.author.id);
    const friendIds = userData[message.author.id].friends || [];

    if (!friendIds.length)
        return message.reply('📭 Saaxiib ma lihid weli. `?friend @user` ku bilow.');

    const names = await Promise.all(friendIds.map(async id => {
        try { const u = await message.client.users.fetch(id); return `👤 **${u.username}**`; }
        catch { return `👤 <@${id}>`; }
    }));

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`💕 ${message.author.username} — Saaxiibada`)
            .setColor('#e91e8c')
            .setDescription(names.join('\n'))
            .setFooter({ text: `${friendIds.length} saaxiib` })],
    });
}

// ── ?propose @user ─────────────────────────────────────
async function proposeCmd(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Isticmaal: `?propose @user`');
    if (target.id === message.author.id) return message.reply('⚠️ Adiga laftiisa ma guursan kartid.');
    if (target.bot) return message.reply('⚠️ Bot ma guursan kartid.');

    checkUser(message.author.id);
    checkUser(target.id);
    ensureRel(message.author.id);
    ensureRel(target.id);

    const sender   = userData[message.author.id];
    const receiver = userData[target.id];

    if (sender.relationship?.partnerId)
        return message.reply('💔 Waa in aad horay guur jaban ka saarto. `?breakup` isticmaal.');
    if (receiver.relationship?.partnerId)
        return message.reply(`💔 **${target.username}** horay ayuu guuran yahay.`);
    if (receiver.pendingProposal)
        return message.reply(`⏳ **${target.username}** weli codsi kale ayuu suganayaa.`);

    // Find best ring owned
    const rings = sender.ownedRings || {};
    const ringType = rings.somali > 0 ? 'somali'
        : rings.royal   > 0 ? 'royal'
        : rings.diamond > 0 ? 'diamond'
        : rings.silver  > 0 ? 'silver'
        : null;

    if (!ringType)
        return message.reply('💍 Ring ma lihid! `?shop rings` ka iibso.');

    receiver.pendingProposal = { fromId: message.author.id, fromUsername: message.author.username, ringType };
    saveData();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rel_ap_${message.author.id}`).setLabel('💍 Haa, Waan Aqbalayaa!').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rel_dp_${message.author.id}`).setLabel('💔 Maya').setStyle(ButtonStyle.Danger),
    );

    return message.reply({
        content: `💍 <@${target.id}> — **${message.author.username}** wuxuu kuu soo jeedinaayaa guur!\n\n${RING_NAMES[ringType]} 💝`,
        components: [row],
    });
}

// ── ?partner ───────────────────────────────────────────
async function partnerCmd(message) {
    checkUser(message.author.id);
    ensureRel(message.author.id);
    const rel = userData[message.author.id].relationship || {};

    if (!rel.partnerId)
        return message.reply('💔 Partner ma lihid. `?propose @user` isticmaal.');

    let partnerName = rel.partnerUsername || `<@${rel.partnerId}>`;
    try { const u = await message.client.users.fetch(rel.partnerId); partnerName = u.username; } catch {}

    const days    = rel.since ? Math.floor((Date.now() - rel.since) / 86400000) : 0;
    const ringTxt = RING_NAMES[rel.ringType] || '💍 Ring';

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('💕 Partner')
            .setColor('#e91e8c')
            .setDescription(
                `💕 **Partner:**\n${partnerName} ❤️ ${message.author.username}\n\n` +
                `📅 **Wada joognaan:**\n${days} Maalmood\n\n` +
                `${ringTxt}`
            )],
    });
}

// ── ?breakup ───────────────────────────────────────────
async function breakupCmd(message) {
    checkUser(message.author.id);
    ensureRel(message.author.id);
    const d = userData[message.author.id];

    if (!d.relationship?.partnerId)
        return message.reply('💔 Partner ma lihid.');

    const partnerId   = d.relationship.partnerId;
    const partnerName = d.relationship.partnerUsername || `<@${partnerId}>`;

    d.relationship = { partnerId: null, partnerUsername: null, ringType: null, since: null };
    const pd = userData[partnerId];
    if (pd) {
        ensureRel(partnerId);
        pd.relationship = { partnerId: null, partnerUsername: null, ringType: null, since: null };
    }
    saveData();

    return message.reply(`💔 **${partnerName}** relationship dhammaatay.`);
}

module.exports = {
    friendCmd, unfriendCmd, friendsListCmd,
    proposeCmd, partnerCmd, breakupCmd,
    ensureRel, RING_NAMES,
};
