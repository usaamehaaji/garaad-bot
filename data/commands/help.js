// =====================================================================
// AMARKA: ?caawin / ?help
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PREFIX } = require('../../src/config');
const { isUserBusy } = require('../../src/store');

function helpRow(userId, active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`help_edu_${userId}`)
            .setLabel('🎓 Education')
            .setStyle(active === 'edu' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`help_eco_${userId}`)
            .setLabel('💰 Economy')
            .setStyle(active === 'eco' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`help_shop_${userId}`)
            .setLabel('🛒 Shop')
            .setStyle(active === 'shop' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`close_help_${userId}`)
            .setLabel('✖ Xir')
            .setStyle(ButtonStyle.Danger),
    );
}

const GAME_LABELS = { solo: '🎯 Solo', duel: '⚔️ Duel', quiz: '📝 Quiz', tournament: '🏆 Tartan' };

function buildEduEmbed(userId) {
    const activeGame = userId ? isUserBusy(userId) : null;
    const statusLine = activeGame
        ? `\n🟢 **Ciyaarahaaga hadda: ${GAME_LABELS[activeGame] || activeGame}**\n`
        : `\n⚪ Hadda game ma ciyaaraysid\n`;

    return new EmbedBuilder()
        .setTitle('🎓 Education — Ciyaaraha & Amarrada')
        .setColor('#2ecc71')
        .setDescription(
            statusLine +
            `\n**🎮 Ciyaaraha Aqoonta**\n` +
            `**\`${PREFIX}solo\`** — Su'aal kuu yimaada, jawaab degdeg (+3 IQ)\n` +
            `**\`${PREFIX}duel @qof\`** — Tartam qof, IQ ayaa danbeeysa\n` +
            `**\`${PREFIX}deul 2v2\`** — Team duel (1v1 / 2v2 / 3v3)\n` +
            `**\`${PREFIX}quiz\`** — Koox la ciyaar, tartam\n\n` +

            `**🏆 Tartan**\n` +
            `**\`${PREFIX}tartan\`** — ⚙️ Admin: Bilow tartan cusub\n` +
            `**\`${PREFIX}isdiiwaangeli\`** — Ku diiwaangeli tartanka\n` +
            `**\`${PREFIX}tartan_status\`** — Xaaladda tartanka\n` +
            `**\`${PREFIX}gal CODE\`** — Game ku biir (code DM)\n\n` +

            `**👤 Profile & Standings**\n` +
            `**\`${PREFIX}profile\`** — IQ, level, stats, frame\n` +
            `**\`${PREFIX}top\`** — Top 15 IQ ranking\n` +
            `**\`${PREFIX}today\`** — Maalin kasta: BTC + IQ (24h)\n\n` +

            `**💕 Xiriirka**\n` +
            `**\`${PREFIX}personal\`** — Partner, saaxiibada, xiriirka\n` +
            `**\`${PREFIX}friend @user\`** — Saaxiib codsi dir\n` +
            `**\`${PREFIX}propose @user\`** — u soo jedi\n` +
            `**\`${PREFIX}partner\`** — Partner-kaaga eeg\n` +
            `**\`${PREFIX}breakup\`** — Xiriirka jabi\n\n` +


            `**💬 Kale**\n` +
            `**\`${PREFIX}dm <fariin>\`** — Admin u dir fikrad\n` +
            `**\`${PREFIX}cilada [fariin]\`** — Cilad soo sheeg\n` +
            `**\`${PREFIX}champion\`** — Champion-ka eeg\n` +
            `**\`${PREFIX}eray\`** — Eray cusub baro`
        )
        .setFooter({ text: `Prefix: ${PREFIX} • ⚙️ = Admin kaliya` });
}

function buildEcoEmbed() {
    return new EmbedBuilder()
        .setTitle('💰 Economy — Bitcoin System')
        .setColor('#f39c12')
        .setDescription(
            `**👤 Jeeb & Shaqo**\n` +
            `**\`${PREFIX}jeeb\`** — Jeebkaaga, bank iyo xaaladda\n` +
            `**\`${PREFIX}shaqo\`** — Shaqo (8h mar) → BTC\n` +
            `**\`${PREFIX}today\`** — BTC + IQ maalin kasta (24h)\n` +
            `**\`${PREFIX}rich\`** — Top 10 ugu hantida badan\n\n` +

            `**🏦 Banks**\n` +
            `\`${PREFIX}bank\` — Banks panel · \`${PREFIX}banks\` — Liiska\n` +
            `\`${PREFIX}d <bank> <xad>\` — Dhig · \`${PREFIX}w <bank> <xad>\` — Qaad\n` +
            `_?d garaad 500 · ?d Kormaal Bank 1000 · ?w garaad 200_\n` +
            `\`${PREFIX}cb <magac>\` — Public bank abuur\n\n` +

            `**🏢 Shirkad**\n` +
            `\`${PREFIX}company\` — Eeg · \`${PREFIX}company create <magac>\` — Bilow\n` +
            `\`${PREFIX}topcompanies\` — Top shirkadaha\n\n` +

            `**🎮 Ciyaar**\n` +
            `\`${PREFIX}trade\` — BTC UP/DOWN · \`${PREFIX}ef <xad>\` — Ecoflip\n` +
            `\`${PREFIX}rob\` — Xadi\n\n` +

            `**🤝 Bulshada**\n` +
            `\`${PREFIX}give @user <xad>\` — Dir · \`${PREFIX}missions\` — Hawlaha\n` +
            `\`${PREFIX}etitle\` — Cinwaan · \`${PREFIX}khaznad\` — Treasury\n\n` +

            `**🔐 Password**\n` +
            `\`${PREFIX}bp <pw>\` — Bank password · \`${PREFIX}access @user <pw>\` — Wadaag`
        )
        .setFooter({ text: `Garaad Economy • [pw] = password required if set` });
}


function buildShopEmbed() {
    return new EmbedBuilder()
        .setTitle('🛒 Shop & Items — Amarrada Cusub')
        .setColor('#9b59b6')
        .setDescription(
            `**🏪 Shop**\n` +
            `**\`${PREFIX}shop\`** — Dukaan (Frames, Boosters, Loot, Titles)\n` +
            `**\`${PREFIX}shop frames\`** — Frames iibso (qurxinta profile)\n` +
            `**\`${PREFIX}shop boosters\`** — Double IQ/XP/BTC + IQ Shield\n` +
            `**\`${PREFIX}shop loot\`** — Loot Boxes iibso\n` +
            `**\`${PREFIX}shop titles\`** — Cinwaanno iibso\n\n` +

            `**📦 Loot Boxes**\n` +
            `**\`${PREFIX}open common\`** — Common Box fur (📦)\n` +
            `**\`${PREFIX}open rare\`** — Rare Box fur (🎁)\n` +
            `**\`${PREFIX}open legendary\`** — Legendary Box fur (💎)\n\n` +

            `**🛍️ Iibso (Direct)**\n` +
            `**\`${PREFIX}buy frame <key>\`** — Frame iibso & isxidh\n` +
            `**\`${PREFIX}buy booster <key>\`** — Booster iibso\n` +
            `**\`${PREFIX}buy loot <type>\`** — Loot box iibso\n` +
            `**\`${PREFIX}buy title <key>\`** — Cinwaan iibso\n\n` +

            `**🎒 Inventory**\n` +
            `**\`${PREFIX}inventory\`** — Dhamaan shayaadkaaga\n` +
            `**\`${PREFIX}equip frame <key>\`** — Frame xidh\n` +
            `**\`${PREFIX}equip title <key>\`** — Cinwaan xidh\n` +
            `**\`${PREFIX}sell frame <key>\`** — Frame iib BTC\n\n` +

            `**📋 Missions**\n` +
            `**\`${PREFIX}missions\` / \`${PREFIX}m\`** — Howlaha maanta (3 daily tasks)\n` +
            `**\`${PREFIX}missions claim 1\` / \`${PREFIX}mc1\`** — Abaalmarinta qaado`
        )
        .setFooter({ text: 'Garaad Bot • Shop System • ?profile si aad u aragto frame + badges' });
}

function buildWwEmbed() {
    return new EmbedBuilder()
        .setTitle('🐺 Werewolf — Ciyaarta')
        .setColor('#c0392b')
        .setDescription(
            `**🎮 Bilow**\n` +
            `**\`${PREFIX}ww\`** — Lobby fur (5–12 qof)\n` +
            `**\`${PREFIX}ww stop\`** — ⚙️ Admin: game jooji\n\n` +

            `**⏱️ Wareegyada**\n` +
            `🌙 **Habeenka** (60s) — Roles DM ayaa loo diraa\n` +
            `☀️ **Maalinta** (45s) — Ku hadla channel-ka\n` +
            `🗳️ **Codeynta** (60s) — Dilaaga codeey\n\n` +

            `**🐍 Wolf Team**\n` +
            `**🐍 Dilaaga** — Habeenki qof dil\n` +
            `**🐍👁️ Dilaaga Aragti** — Dil + qof card arag\n\n` +

            `**👥 Village Team**\n` +
            `**👁️ Aragti** — Dilaaga garo (habeenki)\n` +
            `**🏅 Dhaqtar** — Qof badbaadi (habeenki)\n` +
            `**🎖️ Mayor** — Codadaadu = 2 vote\n` +
            `**👸 Princess** — Wolf dilo → wolf dhintaa\n` +
            `**🏹 Elin** — La dilo → qof aad doorato dhintaa\n` +
            `**👑 King** — La dilo → successor awood\n` +
            `**🌿 Duruid** — Qof kasta badbaadi (habeenki)\n` +
            `**💀 Necro** — Qof dhintay dib u soo celi (1×)\n` +
            `**🔥 Dad Caadi** — Codayn kaliya\n\n` +

            `**🏆 Guusha**\n` +
            `🐍 Wolves: Wolves ≥ Villagers tirada\n` +
            `🔥 Villagers: Dhammaan wolves la saaro`
        )
        .setFooter({ text: 'Garaad Bot • Werewolf • ?ww bilow' });
}

module.exports = async function helpCommand(message) {
    const userId = message.author.id;
    return message.reply({ embeds: [buildEduEmbed(userId)], components: [helpRow(userId, 'edu')] });
};

module.exports.buildEduEmbed  = buildEduEmbed;
module.exports.buildEcoEmbed  = buildEcoEmbed;
module.exports.buildShopEmbed = buildShopEmbed;
module.exports.buildWwEmbed   = buildWwEmbed;
module.exports.helpRow        = helpRow;
