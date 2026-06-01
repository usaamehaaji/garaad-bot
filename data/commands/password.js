// =====================================================================
// AMARKA: ?password
// Sharing password — saxiibkaaga access siiso
// (Bank password = ?bp   |   Sharing password = ?password)
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');

function ok(msg, text)  { return msg.reply({ embeds: [new EmbedBuilder().setColor('#27ae60').setDescription(text)] }); }
function bad(msg, text) { return msg.reply({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(text)] }); }

module.exports = async function passwordCmd(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const d   = userData[userId];
    const sub = (args[0] || '').toLowerCase();

    // ?password create <pw>
    if (sub === 'create') {
        const pw = args[1];
        if (!pw || pw.length < 6)
            return bad(message, `⚠️ Password **ugu yaraan 6 xaraf** ah geli (xaraf + number).\nTusaale: \`?password create Pass99\``);
        if (d.accountPassword)
            return bad(message, `⚠️ Password horay u haysataa.\nBeddel: \`?password change <hore> <cusub>\``);
        d.accountPassword = pw;
        saveData();
        try { await message.delete(); } catch {}
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#27ae60').setDescription(
            `✅ <@${userId}> sharing password la abuuray!\n_Sirta keen — DM-kaaga ku qor._`
        )]});
    }

    // ?password change <hore> <cusub>
    if (sub === 'change') {
        const [, oldPw, newPw] = args;
        if (!oldPw || !newPw)
            return bad(message, `⚠️ \`?password change <hore> <cusub>\``);
        if (!d.accountPassword)
            return bad(message, `⚠️ Password ma lihid. \`?password create <pw>\` bilow.`);
        if (oldPw !== d.accountPassword)
            return bad(message, `❌ Password-kii hore waa khalad.`);
        if (newPw.length < 6)
            return bad(message, `⚠️ Password cusub **ugu yaraan 6 xaraf** ah geli.`);
        d.accountPassword = newPw;
        saveData();
        try { await message.delete(); } catch {}
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#27ae60').setDescription(
            `✅ <@${userId}> sharing password la bedelay!`
        )]});
    }

    // ?password remove <pw>
    if (sub === 'remove') {
        const pw = args[1];
        if (!d.accountPassword) return bad(message, `⚠️ Password ma lihid.`);
        if (pw !== d.accountPassword) return bad(message, `❌ Password qalad.`);
        d.accountPassword = null;
        saveData();
        return ok(message, `🔓 Sharing password la tirtiray.`);
    }

    // ?password — info
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🔐 Sharing Password')
            .setDescription(
                `**Xaaladda:** ${d.accountPassword ? '🔒 Password haysataa' : '🔓 Password ma lihid'}\n\n` +
                `**Amarrada:**\n` +
                `\`?password create <pw>\` — Password samee\n` +
                `\`?password change <hore> <cusub>\` — Password beddel\n` +
                `\`?password remove <pw>\` — Tirtir\n\n` +
                `**Maxay u adeegaan?**\n` +
                `Saxiibkaaga **\`?access @adigu <password>\`** ku siinaysaa — wuxuu helayaa:\n` +
                `• 🏦 Bank-kaaga view + deposit + withdraw\n` +
                `• 🏢 Company-gaaga view\n\n` +
                `**⚠️ Farq muhiim ah:**\n` +
                `• \`?bp\` = Bank password (withdraw iyo banksend ilaaliso)\n` +
                `• \`?password\` = Sharing password (saxiibka access sii)`
            )
    ]});
};
