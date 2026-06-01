// =====================================================================
// AMARKA: ?password
// Account password — account-kaaga ilaaliso
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { userData, saveData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');

function ok(message, text) {
    return message.reply({ embeds: [new EmbedBuilder().setColor('#27ae60').setDescription(text)] });
}
function err(message, text) {
    return message.reply({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(text)], ephemeral: true });
}

module.exports = async function passwordCmd(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const d = userData[userId];

    const sub = (args[0] || '').toLowerCase();

    // ?password create <password>
    if (sub === 'create') {
        if (d.accountPassword) {
            return err(message, `⚠️ Password horay u haysataa.\nBaddalid: \`?password change <hore> <cusub>\``);
        }
        const pw = args[1];
        if (!pw || pw.length < 4) {
            return err(message, `⚠️ Password ugu yaraan **4 xaraf** ah geli.\nTusaale: \`?password create 1234\``);
        }
        d.accountPassword = pw;
        saveData();
        return ok(message, `🔐 **Password la abuuray!**\nPassword-kaaga: \`${pw}\`\n\n_Sirta keen — DM-kaaga ku qor._`);
    }

    // ?password change <hore> <cusub>
    if (sub === 'change') {
        if (!d.accountPassword) {
            return err(message, `⚠️ Password ma lihid. Bilow: \`?password create <password>\``);
        }
        const oldPw = args[1];
        const newPw = args[2];
        if (!oldPw || !newPw) {
            return err(message, `⚠️ Isticmaal: \`?password change <hore> <cusub>\``);
        }
        if (oldPw !== d.accountPassword) {
            return err(message, `❌ Password-kii hore waa khalad.`);
        }
        if (newPw.length < 4) {
            return err(message, `⚠️ Password cusub ugu yaraan **4 xaraf** ah geli.`);
        }
        d.accountPassword = newPw;
        saveData();
        return ok(message, `🔐 **Password la bedelay!**\nPassword cusub: \`${newPw}\``);
    }

    // ?password remove <password>
    if (sub === 'remove') {
        if (!d.accountPassword) {
            return err(message, `⚠️ Password ma lihid.`);
        }
        const pw = args[1];
        if (pw !== d.accountPassword) {
            return err(message, `❌ Password qalad.`);
        }
        d.accountPassword = null;
        saveData();
        return ok(message, `🔓 **Password la tirtiray.** Account-kaagu hadda furan yahay.`);
    }

    // ?password (no args) — show help
    const hasPassword = !!d.accountPassword;
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🔐 Account Password')
            .setDescription(
                `**Xaaladda:** ${hasPassword ? '🔒 Password haysataa' : '🔓 Password ma lihid'}\n\n` +
                `**Amarrada:**\n` +
                `\`?password create <password>\` — Password cusub samee\n` +
                `\`?password change <hore> <cusub>\` — Password beddel\n` +
                `\`?password remove <password>\` — Password tirtir\n\n` +
                `**Maxay ilaalinaysaa?**\n` +
                `Password-kaaga waxaa lagu isticmaalaa:\n` +
                `• \`?banksend\` — IQ u dir qof\n` +
                `• \`?withdraw\` — IQ bank ka qaado\n` +
                `• \`?give\` — BTC u dir qof\n` +
                `• \`?rob\` — Xad horteed ilaali`
            )
    ]});
};
