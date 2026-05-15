const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, trackEarning } = require('../../economy/econStore');

const WORK_COOLDOWN  = 9 * 60 * 60 * 1000;
const WORK_REWARD_MIN = 300;
const WORK_REWARD_MAX = 500;

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

    const today  = new Date().toISOString().slice(0, 10);
    d.todayEarned ??= { date: '', usd: 0 };
    if (d.todayEarned.date !== today) d.todayEarned = { date: today, usd: 0 };
    if (d.todayEarned.usd >= 1000) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🚫 Shaqo — Xad Maalinlaha')
                .setColor('#e74c3c')
                .setDescription(`Maanta **$1,000** oo USD baad kasoo shaqeysay (shaqo + rob + cashflip + iwm).\n\n⏳ Berri dib u tijaabi.`)
                .setFooter({ text: 'Garaad Economy • $1,000/maalin max' }),
        ]});
    }

    const raw    = Math.floor(Math.random() * (WORK_REWARD_MAX - WORK_REWARD_MIN + 1)) + WORK_REWARD_MIN;
    const reward = Math.min(raw, 1000 - d.todayEarned.usd);
    d.usd      += reward;
    d.lastWork  = Date.now();
    trackEarning(userId, reward);
    saveEcon();

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_shaqo_${userId}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    const remaining = 1000 - d.todayEarned.usd;
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle(`✅ ${job.title}`)
            .setColor('#2ecc71')
            .setDescription(
                `${job.desc}\n\n` +
                `💵 **+$${reward} USD** shaqadaada ah\n` +
                `💰 USD-kaaga: **$${d.usd.toLocaleString()}**\n` +
                `📊 Maanta waxaad kasoo heli kartaa: **$${Math.max(0, remaining).toLocaleString()}** oo kale`
            )
            .setFooter({ text: 'Garaad Economy • 9 saacadood gudahood dib u shaqeyso • $300–$500' }),
    ], components: [closeRow] });
};
