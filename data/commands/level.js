const { EmbedBuilder } = require('discord.js');
const { userData } = require('../../src/store');
const { checkUser } = require('../../src/utils/helpers');

module.exports = async function levelCommand(message) {
    const userId = message.author.id;
    checkUser(userId);

    const iq = userData[userId].iq || 0;
    
    // Level 1 = 30 IQ, Level 2 = 60 IQ, etc.
    const level = Math.floor(iq / 30);
    const nextLevelIq = (level + 1) * 30;
    const progressIq = iq % 30;
    const progressPercent = Math.floor((progressIq / 30) * 100);
    
    // Create a simple progress bar
    const filledBlocks = Math.floor(progressPercent / 10);
    const emptyBlocks = 10 - filledBlocks;
    const progressBar = '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Level Profile: ${message.author.username}`)
        .setColor('#3498db')
        .addFields(
            { name: '🧠 Current IQ', value: `${iq}`, inline: true },
            { name: '🎖️ Current Level', value: `${level}`, inline: true },
            { name: `📈 Progress to Level ${level + 1}`, value: `${progressBar} ${progressPercent}%\n(${progressIq}/30 IQ needed for next level)`, inline: false }
        )
        .setFooter({ text: 'Every 30 IQ = 1 Level!' });

    return message.reply({ embeds: [embed] });
};
