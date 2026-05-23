const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../../../src/economy/econStore');

const WORK_COOLDOWN = 8 * 60 * 60 * 1000; // 8 hours
const WORK_BTC      = 150;

const JOBS = [
    { title: '💻 Software Developer',  desc: 'You built a new app and deployed it to production. Clean code, zero bugs.' },
    { title: '📊 Data Analyst',        desc: 'You analyzed market data and delivered insights that moved the numbers.' },
    { title: '🌐 Web Designer',        desc: 'You designed and launched a clean, responsive website for a client.' },
    { title: '📱 App Tester',          desc: 'You ran a full QA cycle, found 12 bugs, and filed detailed reports.' },
    { title: '🛠️ IT Support',         desc: 'You fixed network issues across the office. Everything is running smooth.' },
    { title: '🎨 UI/UX Designer',      desc: 'You delivered polished mockups that the client approved on first pass.' },
    { title: '🔐 Security Analyst',    desc: 'You ran a penetration test and patched three critical vulnerabilities.' },
    { title: '☁️ Cloud Engineer',      desc: 'You migrated the infrastructure to the cloud — 40% cost reduction.' },
];

module.exports = async function shaqoCmd(message) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];
    d.lastWork ??= 0;

    const elapsed = Date.now() - d.lastWork;

    if (elapsed < WORK_COOLDOWN) {
        const rem   = WORK_COOLDOWN - elapsed;
        const hours = Math.floor(rem / 3600000);
        const mins  = Math.floor((rem % 3600000) / 60000);
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('⏳ Work — On Cooldown')
                .setColor('#e74c3c')
                .setDescription(`You need to rest before working again.\n\n🕐 Come back in **${hours}h ${mins}m**.`)
                .setFooter({ text: 'Garaad Economy • Every 8 hours' }),
        ]});
    }

    d.btc      = (d.btc || 0) + WORK_BTC;
    d.lastWork = Date.now();
    trackEarning(userId, WORK_BTC);
    saveEcon();

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle(`✅ ${job.title}`)
            .setColor('#2ecc71')
            .setDescription(
                `${job.desc}\n\n` +
                `**+₿: ${WORK_BTC.toLocaleString()}** earned\n` +
                `Wallet: **₿: ${(d.btc).toLocaleString()}**`
            )
            .setFooter({ text: 'Garaad Economy • Work again in 8 hours' }),
    ], components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`close_shaqo_${userId}`)
                .setLabel('✖ Close')
                .setStyle(ButtonStyle.Danger),
        ),
    ]});
};
