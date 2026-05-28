const { EmbedBuilder } = require('discord.js');

module.exports = function paymentCmd(message) {
    const embed = new EmbedBuilder()
        .setTitle('💳 Lacag Bixinta — Payment Info')
        .setColor('#27ae60')
        .setDescription(
            `Lacagta noo dir ka dibna **sawirka xasuuska nagala soo dir** DM-ka.\n\n` +
            `**📱 EVC Plus / Hormuud:**\n` +
            `\`\`\`610917813\`\`\`\n` +
            `**🏦 Waafi Pay / Premier Bank:**\n` +
            `\`\`\`5291823405989205\`\`\`\n\n` +
            `> 📸 Lacagta u dir, sawirka receipt-ka DM-kaaga nagasoo dir.`
        )
        .setFooter({ text: 'Garaad Bot • Premium & Services' });
    return message.reply({ embeds: [embed] });
};
