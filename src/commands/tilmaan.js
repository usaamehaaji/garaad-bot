// =====================================================================
// AMARKA: ?tilmaan  —  Tilmaamaha Nidaamka Dhaqaalaha
// (kuma muuqato ?caawin)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../config');

module.exports = async function tilmaanCommand(message) {
    const userId = message.author.id;

    const embed = new EmbedBuilder()
        .setTitle('💰 Nidaamka Dhaqaalaha — Tilmaan Buuxda')
        .setColor('#e67e22')
        .setDescription(
            `Garaad Bot wuxuu leeyahay **suuq ganacsi** oo aad lacag kula ganacsan karto **BTC, EUR, GOLD iyo Shilinka Soomaaliya (SOS)**.\n\n` +
            `Bilowga waxaad heshaa **$500 + 100,000 SOS** — adiga kuu gaar ah.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**📊 Amarrada Dhaqaalaha**\n\n` +
            `\`${PREFIX}suuqa\` — Daawada suuqa: qiimayaasha, chart, iyo isbeddelka saacadda.\n\n` +
            `\`${PREFIX}trade\` — Ganacsiga: iibso ama iibi BTC, EUR, GOLD, SOS. Qiimayaashu **saacad kasta** waxay beddelmaan.\n\n` +
            `\`${PREFIX}jeeb\` *(ama ?wallet / ?portfolio)* — Jeebkaaga: naqdiga, hantida, P&L.\n\n` +
            `\`${PREFIX}manta\` — Dakhliga maanta: hel cash + SOS + xaaladda wanaagsan GOLD/BTC. 24h cooldown.\n\n` +
            `\`${PREFIX}today\` — Sidoo kale waxay siisaa cash iyo SOS maalinlaha ah (IQ + XP + $50 + 2,000 SOS).\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**📈 Sida Ganacsiga u Shaqeyso**\n\n` +
            `1️⃣ Qor \`${PREFIX}suuqa\` si aad u aragto chart iyo qiimayaasha.\n` +
            `2️⃣ Qor \`${PREFIX}trade\` — riix **Iibso** marka qiimuhu hooseeyo.\n` +
            `3️⃣ Sug — marka qiimuhu koro, riix **Iibi** si aad faa'iido u hesho.\n` +
            `4️⃣ \`${PREFIX}jeeb\` si aad u hubiso xaaladda + P&L.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**🇸🇴 Shilinka Soomaaliya (SOS)**\n` +
            `• 1 USD ≈ 23,000 SOS (rate wuxuu beddelmaa)\n` +
            `• Waxaad ka iibsanaysaa USD-kaaga si aad SOS u hesho\n` +
            `• Marka rate-ku hooseeyo (SOS kordha), waxaad iibsanaysaa — marka kor u kaco, waxaad iibiysaa\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**⚠️ Xusuusin**\n` +
            `• Qiimayaashu waxay beddelmaan **saacad kasta** — khatarta waa tii aad qaadato.\n` +
            `• Lacag dheeraad ah: \`${PREFIX}today\` iyo \`${PREFIX}manta\` — maalin kasta.\n` +
            `• 🛡️ Shield: haddii la siinayo, waxay kaa difaacda khasaarka. Admin ayaa siiya.`
        )
        .setFooter({ text: 'Garaad Quiz · Nidaamka Dhaqaalaha v2' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_tilmaan_${userId}`).setLabel('Iska xir').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('jeeb_open_trade').setLabel('💹 Bilow Ganacsi').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`suuqa_refresh_${userId}`).setLabel('📊 Suuqa').setStyle(ButtonStyle.Secondary),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
