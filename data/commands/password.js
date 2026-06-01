// =====================================================================
// AMARKA: ?password → redirect to ?bp (unified password system)
// =====================================================================

module.exports = async function passwordCmd(message, args) {
    return message.reply(
        `🔐 **Hal Password System:**\n\n` +
        `\`?bp <password>\` — Password samee/beddel\n\n` +
        `Password-kani wuxuu ilaalinayaa:\n` +
        `• \`?withdraw\` — Bank ka bixin\n` +
        `• \`?banksend\` — Qof u dir\n` +
        `• \`?access @saxiib <pw>\` — Saxiibka access sii\n\n` +
        `**Tusaale:** \`?bp MyPass99\``
    );
};
