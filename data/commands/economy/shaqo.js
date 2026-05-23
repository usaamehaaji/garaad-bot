const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../../../src/economy/econStore');

const WORK_COOLDOWN = 8 * 60 * 60 * 1000;
const WORK_BTC      = 150;

const JOBS = [
    { title: 'Software Developer',  emoji: '💻', desc: 'Built a new app and deployed it to production.' },
    { title: 'Data Analyst',        emoji: '📊', desc: 'Analyzed market data and delivered key insights.' },
    { title: 'Web Designer',        emoji: '🌐', desc: 'Designed and launched a responsive website.' },
    { title: 'App Tester',          emoji: '📱', desc: 'Ran a full QA cycle and filed detailed reports.' },
    { title: 'IT Support',          emoji: '🛠️', desc: 'Fixed network issues across the office.' },
    { title: 'UI/UX Designer',      emoji: '🎨', desc: 'Delivered polished mockups approved first pass.' },
    { title: 'Security Analyst',    emoji: '🔐', desc: 'Patched three critical vulnerabilities.' },
    { title: 'Cloud Engineer',      emoji: '☁️', desc: 'Migrated infrastructure — 40% cost reduction.' },
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
                .setTitle('🏦 GARAAD BANK — Payroll')
                .setColor('#e74c3c')
                .addFields(
                    { name: '⏳ Status',     value: 'NOT ELIGIBLE YET',                      inline: true },
                    { name: '🕐 Next Pay',   value: `**${hours}h ${mins}m**`,                 inline: true },
                    { name: '📋 Schedule',   value: 'Every 8 hours',                          inline: true },
                )
                .setFooter({ text: 'Garaad Bank • Payroll Department' }),
        ]});
    }

    d.btc      = (d.btc || 0) + WORK_BTC;
    d.lastWork = Date.now();
    trackEarning(userId, WORK_BTC);
    saveEcon();

    const job  = JOBS[Math.floor(Math.random() * JOBS.length)];
    const ref  = '#SAL-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const date = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🏦 GARAAD BANK — Salary Receipt')
            .setColor('#27ae60')
            .addFields(
                { name: '📋 Type',        value: '💰 SALARY PAYMENT',                         inline: true },
                { name: '🔖 Reference',   value: `\`${ref}\``,                                 inline: true },
                { name: '📅 Date',        value: date,                                          inline: true },
                { name: '👤 Employee',    value: `**${message.author.username}**\n<@${userId}>`, inline: true },
                { name: `${job.emoji} Position`, value: `**${job.title}**`,                    inline: true },
                { name: '📝 Activity',    value: job.desc,                                      inline: false },
                { name: '💰 Gross Pay',   value: `**+₿ ${WORK_BTC.toLocaleString()}**`,        inline: true },
                { name: '💳 Wallet',      value: `**₿ ${d.btc.toLocaleString()}**`,            inline: true },
                { name: '⏳ Next Pay',    value: 'In 8 hours',                                  inline: true },
            )
            .setFooter({ text: 'Garaad Bank • Payroll Department' }),
    ], components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`close_shaqo_${userId}`)
                .setLabel('✖ Close')
                .setStyle(ButtonStyle.Danger),
        ),
    ]});
};
