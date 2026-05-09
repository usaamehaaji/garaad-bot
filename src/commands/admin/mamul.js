// =====================================================================
// AMARKA: ?mamul — Admin Economy Control Panel
// Marka hore: picker labo button — riixid ayaa lagu muujiyaa commands-ka
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { userData, saveData } = require('../../store');
const { checkUser }          = require('../../utils/helpers');
const { isAdmin }            = require('../../utils/admin');
const { PREFIX }             = require('../../config');

const ASSETS = ['cash','btc','eur','gold','sos'];

async function mamulGive(message, args) {
    const assetArg = (args[0] || '').toLowerCase();
    const target   = message.mentions.users.first();
    const amount   = parseFloat(args[2] || args[1]);

    if (!ASSETS.includes(assetArg)) {
        return message.reply(`❌ Asset-ka saxda ah: \`cash btc eur gold sos\`\nTusaale: \`?mamul give btc @user 0.001\``);
    }
    if (!target) return message.reply('❌ User-ka ku qor (mention): `?mamul give btc @user 0.001`');
    if (!Number.isFinite(amount) || amount <= 0) return message.reply('❌ Qadarka qor si sax ah: tusaale `0.001` ama `500`');

    checkUser(target.id);
    const d = userData[target.id];
    d.portfolio = d.portfolio || {};

    let given = '';
    if (assetArg === 'cash' || assetArg === 'usd') {
        d.cash = Math.round(((d.cash || 0) + amount) * 100) / 100;
        given  = `$${amount.toLocaleString()} USD (Cash)`;
    } else if (assetArg === 'sos') {
        d.portfolio.SOS = Math.round((d.portfolio.SOS || 0) + amount);
        given = `${amount.toLocaleString()} SOS`;
    } else {
        const key = assetArg.toUpperCase();
        d.portfolio[key] = (d.portfolio[key] || 0) + amount;
        given = `${amount} ${key}`;
    }
    saveData();

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('✅ Lacag / Asset la siiyay')
            .setDescription(`<@${target.id}> waxaa la siiyay **${given}**.\n\n💵 Cash: $${(d.cash||0).toLocaleString()} | 🇸🇴 SOS: ${(d.portfolio.SOS||0).toLocaleString()}`)
            .setColor('#2ecc71')
            .setFooter({ text: `Admin: ${message.author.tag}` })],
    });
}

async function mamulTake(message, args) {
    const assetArg = (args[0] || '').toLowerCase();
    const target   = message.mentions.users.first();
    const amount   = parseFloat(args[2] || args[1]);

    if (!ASSETS.includes(assetArg)) {
        return message.reply(`❌ Asset-ka saxda ah: \`cash btc eur gold sos\`\nTusaale: \`?mamul take cash @user 100\``);
    }
    if (!target) return message.reply('❌ User-ka ku qor (mention): `?mamul take cash @user 100`');
    if (!Number.isFinite(amount) || amount <= 0) return message.reply('❌ Qadarka qor si sax ah.');

    checkUser(target.id);
    const d = userData[target.id];
    d.portfolio = d.portfolio || {};

    let taken = '';
    if (assetArg === 'cash' || assetArg === 'usd') {
        const before = d.cash || 0;
        d.cash = Math.max(0, Math.round((before - amount) * 100) / 100);
        taken  = `$${Math.min(amount, before).toLocaleString()} USD`;
    } else if (assetArg === 'sos') {
        const before = d.portfolio.SOS || 0;
        d.portfolio.SOS = Math.max(0, Math.round(before - amount));
        taken = `${Math.min(amount, before).toLocaleString()} SOS`;
    } else {
        const key = assetArg.toUpperCase();
        const before = d.portfolio[key] || 0;
        d.portfolio[key] = Math.max(0, before - amount);
        taken = `${Math.min(amount, before)} ${key}`;
    }
    saveData();

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔻 Lacag / Asset la qaatay')
            .setDescription(`<@${target.id}> laga qaatay **${taken}**.\n\n💵 Cash: $${(d.cash||0).toLocaleString()} | 🇸🇴 SOS: ${(d.portfolio.SOS||0).toLocaleString()}`)
            .setColor('#e74c3c')
            .setFooter({ text: `Admin: ${message.author.tag}` })],
    });
}

async function mamulShield(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ User-ka ku qor: `?mamul shield @user`');
    checkUser(target.id);
    const d = userData[target.id];
    const wasActive = (d.shieldActiveUntil || 0) > Date.now();
    if (wasActive) {
        d.shieldActiveUntil = 0;
        saveData();
        return message.reply(`🛡️ Shield-kii <@${target.id}> waa la **qaadday**.`);
    } else {
        d.shieldActiveUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
        saveData();
        return message.reply(`🛡️ <@${target.id}> waxaa la siiyay shield **7 maalmood** ah.`);
    }
}

async function mamulList(message, args) {
    const page    = parseInt(args[0]) || 1;
    const perPage = 10;
    const entries = Object.entries(userData)
        .sort(([,a],[,b]) => (b.cash||0) - (a.cash||0))
        .slice((page-1)*perPage, page*perPage);

    if (!entries.length) return message.reply('Cidna liiska kuma jirto.');

    const lines = entries.map(([uid, d], i) => {
        const shield = (d.shieldActiveUntil||0) > Date.now() ? '🛡️' : '';
        return (
            `**${(page-1)*perPage+i+1}.** <@${uid}> ${shield}\n` +
            `   💵 $${(d.cash||0).toLocaleString()} | 🇸🇴 ${(d.portfolio?.SOS||0).toLocaleString()} SOS | ` +
            `₿ ${(d.portfolio?.BTC||0).toFixed(4)} | 🟡 ${(d.portfolio?.GOLD||0).toFixed(3)}`
        );
    }).join('\n');

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`👥 Liiska Users-ka (Dhaqaale) — Bog ${page}`)
            .setDescription(lines)
            .setColor('#3498db')
            .setFooter({ text: `?mamul list ${page+1} — bogga xiga` })],
    });
}

async function mamulReset(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ User-ka ku qor: `?mamul reset @user`');
    checkUser(target.id);
    const d = userData[target.id];
    d.cash              = 500;
    d.portfolio         = { BTC: 0, EUR: 0, GOLD: 0, SOS: 0 };
    d.realizedPnl       = 0;
    d.basis             = {};
    d.shieldActiveUntil = 0;
    saveData();
    return message.reply(`🔄 <@${target.id}> economy-ga dib loo dejiyay ($500 cash, 0 hanti).`);
}

async function mamulInfo(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ User-ka ku qor: `?mamul info @user`');
    checkUser(target.id);
    const d = userData[target.id];
    const shield = (d.shieldActiveUntil||0) > Date.now()
        ? `🛡️ Active — dhammaanaysa ${new Date(d.shieldActiveUntil).toLocaleDateString()}`
        : '❌ Maan jiro';

    return message.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`📋 Macluumaadka: ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setColor('#9b59b6')
            .addFields(
                { name: '💵 Cash', value: `$${(d.cash||0).toLocaleString()}`, inline: true },
                { name: '🇸🇴 SOS', value: `${(d.portfolio?.SOS||0).toLocaleString()}`, inline: true },
                { name: '₿ BTC', value: `${(d.portfolio?.BTC||0).toFixed(6)}`, inline: true },
                { name: '🔵 EUR', value: `${(d.portfolio?.EUR||0).toFixed(4)}`, inline: true },
                { name: '🟡 GOLD', value: `${(d.portfolio?.GOLD||0).toFixed(4)}`, inline: true },
                { name: '📈 P&L', value: `$${(d.realizedPnl||0).toLocaleString()}`, inline: true },
                { name: '🛡️ Shield', value: shield, inline: false },
                { name: '🧠 IQ', value: `${d.iq||0}`, inline: true },
                { name: '⭐ XP', value: `${d.xp||0}`, inline: true },
            )
            .setFooter({ text: `ID: ${target.id} | Admin: ${message.author.tag}` })],
    });
}

// ── Embed builders (used by interactionHandler) ──

function buildMamulDhaqaaleEmbed() {
    return new EmbedBuilder()
        .setTitle('💰 Dhaqaale — Admin')
        .setColor('#e74c3c')
        .setDescription(
            `**give** · **take** · **info** · **list** · **reset** · **shield**\n\n` +
            `_Tusaale: \`${PREFIX}mamul give cash @user 500\`_`
        )
        .setFooter({ text: `${PREFIX}mamul <amarka> @user <qad>` });
}

function buildMamulAqoonEmbed() {
    return new EmbedBuilder()
        .setTitle('🧠 Aqoon — Admin')
        .setColor('#3498db')
        .setDescription(
            `**reward** · **reset** · **givechampion** · **removechampion**\n` +
            `**add** · **remove** · **list** · **dm** · **stop** · **bugs**\n\n` +
            `_Tusaale: \`${PREFIX}admin reward @user iq 10\`_`
        )
        .setFooter({ text: `${PREFIX}admin <amarka> @user` });
}

async function mamulHelp(message) {
    const uid = message.author.id;

    // Picker kaliya — embed ma soo baxdo ilaa la doorto
    const pickerEmbed = new EmbedBuilder()
        .setTitle('🛠️ Admin Panel — Doorasho')
        .setDescription('**Maxaad rabtaa inaad maamusho?**\n\nRiix badhanka ku habboon.')
        .setColor('#e74c3c');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mamul_aqoon_${uid}`)
            .setLabel('🧠 Aqoon')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`mamul_dhaqaale_${uid}`)
            .setLabel('💰 Dhaqaale')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`close_mamul_${uid}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger),
    );

    return message.reply({ embeds: [pickerEmbed], components: [row] });
}

module.exports = async function mamulCommand(message, args) {
    if (!isAdmin(message.author.id)) {
        return message.reply('⛔ Adigu admin maaha.');
    }
    const sub = (args.shift() || 'help').toLowerCase();
    switch (sub) {
        case 'give':
        case 'sii':
            return mamulGive(message, args);
        case 'take':
        case 'qaad':
            return mamulTake(message, args);
        case 'shield':
            return mamulShield(message, args);
        case 'list':
        case 'ls':
            return mamulList(message, args);
        case 'reset':
            return mamulReset(message, args);
        case 'info':
        case 'check':
            return mamulInfo(message, args);
        default:
            return mamulHelp(message);
    }
};

module.exports.buildMamulAqoonEmbed    = buildMamulAqoonEmbed;
module.exports.buildMamulDhaqaaleEmbed = buildMamulDhaqaaleEmbed;
