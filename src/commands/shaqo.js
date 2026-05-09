// =====================================================================
// AMARKA: ?shaqo — Shaqo Maalinlaha (4 saacadood cooldown)
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser }          = require('../utils/helpers');

const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 saacadood

const JOBS = [
    { icon: '🏥', title: 'Dhakhtar',       desc: 'Waxaad daryeeshay bukaannada iyo qoyskooda.',         min: 150, max: 300 },
    { icon: '🚌', title: 'Darawale',        desc: 'Waxaad gaadhsiisay dadka meelaha fog.',               min: 100, max: 200 },
    { icon: '👨‍💻', title: 'Software Dev',   desc: 'Code aad qortay ayaa la gaadhsiiyay macmiilka.',      min: 200, max: 400 },
    { icon: '🏗️', title: 'Dhisme',         desc: 'Waxaad ka shaqeysay dhismaha cusub ee magaalada.',    min: 120, max: 250 },
    { icon: '📦', title: 'Ganacsade',       desc: 'Badeecado aad iibisay ayaa la gaadhsiiyay.',          min: 130, max: 280 },
    { icon: '🎓', title: 'Macalin',         desc: 'Ardayda waxaad ku baraysay xisaabta iyo cilmiga.',    min: 100, max: 220 },
    { icon: '🚢', title: 'Badmaax',         desc: 'Waxaad gaadhsiisay xamuulka xeebta.',                 min: 160, max: 320 },
    { icon: '⚽', title: 'Ciyaaryahan',     desc: 'Ciyaartii maanta guul bay ahayd!',                    min: 90,  max: 350 },
    { icon: '🍳', title: 'Jab-jab',         desc: 'Cunto macaan ayaad kariyay macaamiisha.',             min: 80,  max: 180 },
    { icon: '🚒', title: 'Dab-damis',       desc: 'Guriga dab baa ka qabtay — gargaar ayaad siisay.',   min: 180, max: 380 },
    { icon: '🎨', title: 'Fanaane',         desc: 'Sawir quruxsan ayaad iibisey suuqga fanka.',          min: 70,  max: 250 },
    { icon: '🛡️', title: 'Askari',          desc: 'Xaafadda amaan ayaad ka eegaysay.',                   min: 140, max: 290 },
];

function pickJob() {
    return JOBS[Math.floor(Math.random() * JOBS.length)];
}

function pickEarnings(job) {
    return Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
}

module.exports = async function shaqoCommand(message) {
    const userId = message.author.id;
    checkUser(userId);
    const d = userData[userId];

    const lastShaqo = d.lastShaqo || 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastShaqo);

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_shaqo_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Secondary),
    );

    if (remaining > 0) {
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⏳ Shaqadu Wali Sima Dhammaanin')
                .setColor('#e67e22')
                .setDescription(
                    `Shaqadii maanta horeba waxaad dhamaysay.\n\n` +
                    `> ⏰ Sug **${h} saac ${m} daqiiqo** — ka dib shaqo mar kale!\n\n` +
                    `_Intaad sugeysid: \`?cashflip\` ama \`?kubays\` isku day_`
                )],
            components: [closeRow],
        });
    }

    const job      = pickJob();
    const earnings = pickEarnings(job);

    d.lastShaqo = Date.now();
    d.cash      = Math.round(((d.cash || 0) + earnings) * 100) / 100;
    saveData();

    const embed = new EmbedBuilder()
        .setTitle(`${job.icon} Shaqo — ${job.title}`)
        .setColor('#27ae60')
        .setDescription(
            `${job.desc}\n\n` +
            `> 💵 **+$${earnings.toLocaleString()}** lacag ayaad heshay!\n` +
            `> 🏦 Naqdiga cusub: **$${d.cash.toLocaleString()}**\n\n` +
            `⏰ **4 saacadood** ka dib mar kale shaqeyso`
        )
        .setFooter({ text: '?manta dakhli dheeraad ah · ?trade si aad u kobciso lacagta' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_shaqo_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('jeeb_open_trade')
            .setLabel('💹 Trade Hadda')
            .setStyle(ButtonStyle.Primary),
    );

    return message.reply({ embeds: [embed], components: [row] });
};
