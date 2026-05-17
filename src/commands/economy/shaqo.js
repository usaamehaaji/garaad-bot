const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon } = require('../../economy/econStore');

const WORK_COOLDOWN = 9 * 60 * 60 * 1000;
const WORK_GOLD     = 250;

const GOLD_ICON = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/xau.png';

const JOBS = [
    {
        title: '💻 Software Developer',
        desc: 'Maanta waxaad dhistay app cusub oo dhalinyarada Soomaaliyeed u fududeynaysa waxbarashada online-ka. Code aad qortay wuxuu furtaa albaabbo cusub — mid kasta oo aad qorto waa tallaabo dhanka mustaqbalka ah.',
    },
    {
        title: '📊 Data Analyst',
        desc: 'Xogta suuqa Soomaalida aad falanqeysay maanta waxay ka caawineysaa ganacsatada yaryar inay go\'aan caqli-gal ah gaartaan. Tignoolajiyadu waxay tahay qalab — adigu waxaad tahay geesiga isticmaalaya.',
    },
    {
        title: '🌐 Web Designer',
        desc: 'Website cusub oo ganacsi Soomaali ah aad maanta naqshadaysay. Dhalinyarada Soomaaliyeed ayaa tignoolajiyada ku horumaraysa — adigu waxaad ka mid tahay kuwa hormuudka ah.',
    },
    {
        title: '📱 App Tester',
        desc: 'App waxbarasho oo carruurta Soomaalida loogu talagalay aad maanta tijaabisay, khaladaadkiina soo sheegay. Shaqadaadu si toos ah ayey u gacan-siisaa mustaqbalka waxbarashada Soomaalida.',
    },
    {
        title: '🛠️ IT Support',
        desc: 'Xafiisyada deegaankaaga aad caawisay — computers la hagaajiyay, internet la xaliyay. Dhalinyaro Soomaali ah oo xirfad tignoolajiyadeed leh ayaa loo baahan yahay, adigu waxaad tahay midood.',
    },
    {
        title: '🎨 UI/UX Designer',
        desc: 'Naqshadaha barnaamijka cusub aad maanta samaystay wuxuu ka dhigan yahay in isticmaaluhu si fudud ula xiriiri karo. Farshaxanka iyo tignoolajiyadu way isku darsamaan gacantaada.',
    },
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
                .setTitle('⏳ Shaqo — Naso yar')
                .setColor('#e74c3c')
                .setDescription(`Weli shaqo ma samayn kartid.\n\n🕐 **${hours}s ${mins}d** ka dib dib u tijaabi.`)
                .setFooter({ text: 'Garaad Economy • 9 saacadood kasta' }),
        ]});
    }

    d.gold     = (d.gold || 0) + WORK_GOLD;
    d.lastWork = Date.now();
    saveEcon();

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_shaqo_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle(`✅ ${job.title}`)
            .setThumbnail(GOLD_ICON)
            .setColor('#2ecc71')
            .setDescription(
                `${job.desc}\n\n` +
                `🥇 **+${WORK_GOLD} Gold** shaqadaada ah\n` +
                `🥇 Gold-kaaga: **${(d.gold).toLocaleString()} Gold**`
            )
            .setFooter({ text: 'Garaad Economy • 9 saacadood gudahood dib u shaqeyso', iconURL: GOLD_ICON }),
    ], components: [closeRow] });
};
