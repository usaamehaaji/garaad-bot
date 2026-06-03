const { EmbedBuilder } = require('discord.js');
const { userData } = require('../../src/store');
const { econData, checkEconUser } = require('../../src/economy/econStore');
const { checkUser } = require('../../src/utils/helpers');

const WORK_COOLDOWN  = 8 * 60 * 60 * 1000;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

function formatRemaining(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

module.exports = async function showCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    checkEconUser(userId);

    const d  = userData[userId] || {};
    const ec = econData[userId] || {};

    const lastDaily = d.lastDaily || 0;
    const dailyRemaining = Math.max(0, DAILY_COOLDOWN - (Date.now() - lastDaily));
    const dailyStatus = dailyRemaining > 0 ? `⏳ ${formatRemaining(dailyRemaining)} left` : '✅ Ready';

    const lastWork = ec.lastWork || 0;
    const workRemaining = Math.max(0, WORK_COOLDOWN - (Date.now() - lastWork));
    const workStatus = workRemaining > 0 ? `⏳ ${formatRemaining(workRemaining)} left` : '✅ Ready';

    const ronTimestamp = d.lastRon ?? ec.lastRon;
    let ronStatus = '⚠️ No cooldown data available';
    if (ronTimestamp) {
        const ronRemaining = Math.max(0, DAILY_COOLDOWN - (Date.now() - ronTimestamp));
        ronStatus = ronRemaining > 0 ? `⏳ ${formatRemaining(ronRemaining)} left` : '✅ Ready';
    }

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('⏱️ Cooldown Status')
            .setColor('#3498db')
            .setDescription(
                `**\`?today\`** — ${dailyStatus}\n` +
                `**\`?shaqo\`** — ${workStatus}\n` +
                `**\`?ron\`** — ${ronStatus}\n\n` +
                `Use \`?show\`, \`?cooldown\` or \`?showcooldown\` to check your cooldowns.`
            )
        ]
    });
};
