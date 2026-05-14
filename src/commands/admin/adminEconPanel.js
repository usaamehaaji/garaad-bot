const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, getTreasury, deductFromTreasury } = require('../../economy/econStore');
const { ECON_TITLES } = require('../economy/econShop');
const { PREFIX } = require('../../config');

function buildAdminEconEmbed() {
    const t = getTreasury();
    return new EmbedBuilder()
        .setTitle('💰 Admin — Economy Panel')
        .setColor('#f39c12')
        .setDescription(
            `🏛️ **Khaznad:** $${(t.balance || 0).toLocaleString()} USD\n\n` +
            `**💵 USD Siin**\n` +
            `• \`${PREFIX}admin econ give @user usd [xad]\`\n\n` +
            `**🏦 Bank Furo / Deposit**\n` +
            `• \`${PREFIX}admin econ give @user mandeeq [xad]\`\n` +
            `• \`${PREFIX}admin econ give @user garaad [xad]\`\n\n` +
            `**🏷️ Economy Title Siin**\n` +
            `• \`${PREFIX}admin econ title @user <key>\`\n` +
            `  _Keys: manager · trader · dealer · merchant · investor · businessman_\n` +
            `  _boss · director · banker · founder · chairman · executive_\n` +
            `  _entrepreneur · ceo · tycoon · **ceoofbank**_\n\n` +
            `**🏛️ Treasury**\n` +
            `• \`${PREFIX}admin econ treasury distribute [xad]\` — u qaybii dhammaan\n` +
            `• \`${PREFIX}admin econ treasury give @user [xad]\` — qof gaar ah sii\n\n` +
            `**🗑️ Economy Reset**\n` +
            `• \`${PREFIX}admin econ reset @user\`\n\n` +
            `**👜 Jeeb Eeg**\n` +
            `• \`${PREFIX}admin econ jeeb @user\``
        )
        .setFooter({ text: 'Garaad Admin • Economy' });
}

function adminTabRow(uid, active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`admin_aqoon_${uid}`)
            .setLabel('🧠 Aqoon')
            .setStyle(active === 'aqoon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`admin_eco_${uid}`)
            .setLabel('💰 Economy')
            .setStyle(active === 'eco' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_admin_help_${uid}`)
            .setLabel('❌ Iska xir')
            .setStyle(ButtonStyle.Danger),
    );
}

function adminEconActionsRow(uid) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`admin_eco_giveusd_${uid}`)
            .setLabel('💵 Give USD')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`admin_eco_givebank_${uid}`)
            .setLabel('🏦 Give Bank')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`admin_eco_givetitle_${uid}`)
            .setLabel('🏷️ Give Title')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`admin_eco_treasury_${uid}`)
            .setLabel('🏛️ Treasury')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`admin_eco_reset_${uid}`)
            .setLabel('🗑️ Reset Econ')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function adminEconCmd(message, args) {
    const userId = message.author.id;
    const sub    = (args[0] || '').toLowerCase();
    const target = message.mentions.users.first();

    if (!sub || sub === 'help') {
        return message.reply({
            embeds:     [buildAdminEconEmbed()],
            components: [adminTabRow(userId, 'eco'), adminEconActionsRow(userId)],
        });
    }

    // ?admin econ give @user <asset> [amount]
    if (sub === 'give') {
        if (!target) return message.reply('⚠️ `?admin econ give @user <asset> [xad]`');
        const rest   = args.filter(a => !/<@!?\d+>/.test(a));
        const asset  = (rest[1] || '').toLowerCase();
        const amount = parseFloat(rest[2]);
        if (!asset || isNaN(amount) || amount <= 0) return message.reply('⚠️ `?admin econ give @user <usd|mandeeq|garaad> [xad]`');
        checkEconUser(target.id);
        const d = econData[target.id];
        if (asset === 'usd') {
            d.usd += amount;
        } else if (asset === 'mandeeq' || asset === 'garaad') {
            d.banks[asset] = (d.banks[asset] || 0) + amount;
        } else {
            return message.reply('⚠️ Asset: `usd`, `mandeeq`, ama `garaad`');
        }
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder().setColor('#2ecc71')
                .setDescription(`✅ **$${amount.toLocaleString()} ${asset.toUpperCase()}** waxaad u diray <@${target.id}>.\n💼 Hadda: **$${(asset === 'usd' ? d.usd : d.banks[asset]).toLocaleString()}**`),
        ]});
    }

    // ?admin econ title @user <key>
    if (sub === 'title') {
        if (!target) return message.reply('⚠️ `?admin econ title @user <key>`');
        const rest = args.filter(a => !/<@!?\d+>/.test(a));
        const key  = (rest[1] || '').toLowerCase();
        const info = ECON_TITLES[key];
        if (!info) return message.reply(`⚠️ Title key la garanwaayo: \`${key}\``);
        checkEconUser(target.id);
        const d = econData[target.id];
        if (!d.econTitles.includes(key)) d.econTitles.push(key);
        d.activeEconTitle = key;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder().setColor('#9b59b6')
                .setDescription(`✅ <@${target.id}> waxaa la siiyay: **${info.label}** _(hadda firfircoon)_`),
        ]});
    }

    // ?admin econ treasury distribute [amount] | treasury give @user [amount]
    if (sub === 'treasury') {
        const action = (args[1] || '').toLowerCase();
        const t      = getTreasury();

        if (!action || action === 'view') {
            return message.reply({ embeds: [
                new EmbedBuilder().setTitle('🏛️ Khaznadda').setColor('#8e44ad')
                    .setDescription(
                        `💰 **Hadda:** $${(t.balance || 0).toLocaleString()} USD\n` +
                        `📥 **Wadarta soo gashay:** $${(t.totalIn || 0).toLocaleString()} USD\n` +
                        `📤 **Wadarta la qaybiyay:** $${((t.totalIn || 0) - (t.balance || 0)).toLocaleString()} USD`
                    ),
            ]});
        }

        if (action === 'distribute') {
            const amount = parseFloat(args[2]);
            if (isNaN(amount) || amount <= 0) return message.reply('⚠️ `?admin econ treasury distribute [xad]`');
            const users = Object.keys(econData).filter(k => !k.startsWith('__'));
            const perUser = Math.floor(amount / users.length);
            if (perUser < 1) return message.reply('⚠️ Xaddadka aad yar — dadku aad baa u badan.');
            if (!deductFromTreasury(amount)) return message.reply(`⚠️ Khaznadda ma filna. Hadda: **$${(t.balance || 0).toLocaleString()}**`);
            for (const uid of users) {
                checkEconUser(uid);
                econData[uid].usd += perUser;
            }
            saveEcon();
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#2ecc71')
                    .setDescription(`✅ **$${perUser.toLocaleString()}** waxaa la siiyay **${users.length}** qof.\n🏛️ Khaznad hadhay: **$${(t.balance || 0).toLocaleString()}**`),
            ]});
        }

        if (action === 'give') {
            if (!target) return message.reply('⚠️ `?admin econ treasury give @user [xad]`');
            const amount = parseFloat(args.filter(a => !/<@!?\d+>/.test(a))[2]);
            if (isNaN(amount) || amount <= 0) return message.reply('⚠️ Xaddad sax ah geli.');
            if (!deductFromTreasury(amount)) return message.reply(`⚠️ Khaznadda ma filna. Hadda: **$${(t.balance || 0).toLocaleString()}**`);
            checkEconUser(target.id);
            econData[target.id].usd += amount;
            saveEcon();
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#2ecc71')
                    .setDescription(`✅ Khaznadda **$${amount.toLocaleString()}** waxaa laga siiyay <@${target.id}>.\n🏛️ Khaznad hadhay: **$${(t.balance || 0).toLocaleString()}**`),
            ]});
        }

        return message.reply('⚠️ `treasury view | distribute [xad] | give @user [xad]`');
    }

    // ?admin econ reset @user
    if (sub === 'reset') {
        if (!target) return message.reply('⚠️ `?admin econ reset @user`');
        checkEconUser(target.id);
        const d = econData[target.id];
        d.usd = 0; d.btc = 0; d.gold = 0; d.diamond = 0; d.ring = 0;
        d.banks = { mandeeq: 0, garaad: 0 };
        d.inventory = { safety: 0, robticket: 0 };
        d.loan = null; d.econTitles = []; d.activeEconTitle = null;
        saveEcon();
        return message.reply({ embeds: [
            new EmbedBuilder().setColor('#e74c3c')
                .setDescription(`🗑️ <@${target.id}> economy data dib loo dejiyay.`),
        ]});
    }

    // ?admin econ jeeb @user
    if (sub === 'jeeb') {
        if (!target) return message.reply('⚠️ `?admin econ jeeb @user`');
        const jeebCmd = require('../economy/jeeb');
        const fakeMsg = {
            author:   { id: target.id },
            mentions: { users: { first: () => target } },
            reply:    (payload) => message.reply(payload),
        };
        return jeebCmd(fakeMsg);
    }

    return message.reply(`⚠️ Subcommand la garanwaayo: \`${sub}\`\n\`${PREFIX}admin econ help\` eeg.`);
};

module.exports.buildAdminEconEmbed  = buildAdminEconEmbed;
module.exports.adminTabRow          = adminTabRow;
module.exports.adminEconActionsRow  = adminEconActionsRow;
