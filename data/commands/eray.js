// =====================================================================
// AMARKA: ?eray <eray>       — raadi erayga qaamuuska
//         ?eray sax <q> <s>  — admin: ku dar badal cusub
//         ?eray dar <e> <nooc> <tusaale> — admin: ku dar eray
//         ?eray tir <eray>   — admin: tir eray
//         ?eray hubi <eray>  — hubi haddii saxan yahay
//         ?eray liis [nooc]  — daawada nooca erayada
// =====================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../src/utils/admin');
const {
    saxEray, hubiBadal, raadEray, raadNooc,
    kuDarBadal, kuDarEray, tirEray, tirada,
} = require('../../src/utils/afSomaali');

const NOOCYADA = ['tiro','sifo','magac','hadalka','waqti','bil','maalin','dhaqaale','waxbarasho','jidaafi','diini','ciyaar'];

module.exports = async function erayCommand(message, args) {
    const userId  = message.author.id;
    const sub     = (args[0] || '').toLowerCase();

    const closeRow = (suffix) => new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_eray_${suffix}_${userId}`)
            .setLabel('Iska xir')
            .setStyle(ButtonStyle.Danger)
    );

    // ── ?eray sax <qalad> <sax> — Admin: ku dar badal ──
    if (sub === 'sax' || sub === 'badal') {
        if (!isAdmin(userId)) return message.reply('⛔ Kaliya admin ayaa ku dari kara.');
        const qalad = args[1];
        const sax   = args[2];
        if (!qalad || !sax) return message.reply('❌ Isticmaal: `?eray sax <qalad> <sax>`\nTusaale: `?eray sax sadax saddex`');
        kuDarBadal(qalad, sax);
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Badalkii waa la daray')
                .setDescription(`**\`${qalad}\`** → **\`${sax}\`**\nQaamuuska waa la cusboonaasiiyay.`)
                .setColor('#2ecc71')],
        });
    }

    // ── ?eray dar <eray> <nooc> <tusaale> — Admin: ku dar eray ──
    if (sub === 'dar' || sub === 'add') {
        if (!isAdmin(userId)) return message.reply('⛔ Kaliya admin ayaa ku dari kara.');
        const eray    = args[1];
        const nooc    = args[2];
        const tusaale = args.slice(3).join(' ');
        if (!eray || !nooc || !tusaale) {
            return message.reply(`❌ Isticmaal: \`?eray dar <eray> <nooc> <tusaale>\`\nNoocyada: ${NOOCYADA.join(', ')}\nTusaale: \`?eray dar shaqo magac Shaqo fiican.\``);
        }
        kuDarEray(eray, nooc, tusaale);
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Erayga waa la daray Qaamuuska')
                .setDescription(`**${eray}** (${nooc})\n_"${tusaale}"_`)
                .setColor('#2ecc71')],
        });
    }

    // ── ?eray tir <eray> — Admin: tir ──
    if (sub === 'tir' || sub === 'delete') {
        if (!isAdmin(userId)) return message.reply('⛔ Kaliya admin ayaa tiri kara.');
        const eray = args[1];
        if (!eray) return message.reply('❌ Isticmaal: `?eray tir <eray>`');
        const ok = tirEray(eray);
        return message.reply(ok ? `✅ **\`${eray}\`** waa laga tirtiray qaamuuska.` : `❌ **\`${eray}\`** lagama helin qaamuuska.`);
    }

    // ── ?eray hubi <eray> — Hubi saxnaanta ──
    if (sub === 'hubi' || sub === 'check') {
        const eray = args[1];
        if (!eray) return message.reply('❌ Isticmaal: `?eray hubi <eray>`\nTusaale: `?eray hubi sadax`');
        const { saxan, talobixin } = hubiBadal(eray);
        if (saxan === false) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✍️ Erayga waa Qaldan')
                    .setDescription(`❌ **\`${eray}\`** — qalad\n\n✅ Saxda: **\`${talobixin}\`**`)
                    .setColor('#e74c3c')],
            });
        } else if (saxan === true) {
            return message.reply(`✅ **\`${eray}\`** — waa sax!`);
        } else {
            return message.reply(`❓ **\`${eray}\`** — qaamuuska kuma jiro (laga yaabaa inuu sax yahay ama la darin).`);
        }
    }

    // ── ?eray liis [nooc] — Daawada ──
    if (sub === 'liis' || sub === 'list') {
        const noocFilt = args[1];
        const list = noocFilt ? raadNooc(noocFilt) : raadNooc(NOOCYADA[0]);
        const stats = tirada();
        const lines = list.slice(0, 15).map(e => `• **${e.eray}** _(${e.nooc})_ — _${e.tusaale}_`).join('\n');
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`📚 Qaamuuska — ${noocFilt || 'tiro'} (ugu horeeyey 15)`)
                .setDescription(
                    lines || '_Lama helin_\n\n' +
                    `📊 Wadarta: **${stats.erayo} eray** | **${stats.badal} badal**\n` +
                    `Noocyada: ${NOOCYADA.map(n=>`\`${n}\``).join(' ')}\n` +
                    `Isticmaal: \`?eray liis <nooc>\``
                )
                .setColor('#3498db')
                .setFooter({ text: `Wadarta: ${stats.erayo} eray · ${stats.badal} badal` })],
            components: [closeRow('liis')],
        });
    }

    // ── ?eray stats ──
    if (sub === 'stats' || sub === 'tirada') {
        const stats = tirada();
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('📊 Qaamuuska Af-Soomaaliga — Tirakoobka')
                .setDescription(
                    `📖 **Erayada la qoray:** ${stats.erayo}\n` +
                    `✍️ **Badallada (qalad→sax):** ${stats.badal}\n\n` +
                    `**Noocyada:**\n${NOOCYADA.map(n => `\`${n}\``).join(' · ')}\n\n` +
                    `Amarrada:\n` +
                    `\`?eray <eray>\` — raadi\n\`?eray hubi <eray>\` — hubi saxnaanta\n` +
                    `\`?eray liis <nooc>\` — daawada nooca\n` +
                    `\`?eray sax <q> <s>\` _(admin)_ — ku dar badal\n` +
                    `\`?eray dar <e> <nooc> <tusaale>\` _(admin)_ — ku dar eray\n` +
                    `\`?eray tir <eray>\` _(admin)_ — tir`
                )
                .setColor('#9b59b6')],
            components: [closeRow('stats')],
        });
    }

    // ── ?eray <eray> — Raadinta caadiga ah ──
    const searchWord = sub || args.join(' ');
    if (!searchWord) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle('📖 ?eray — Qaamuuska Af-Soomaaliga')
                .setDescription(
                    '`?eray <eray>` — raadi erayga\n' +
                    '`?eray hubi <eray>` — hubi saxnaanta\n' +
                    '`?eray liis <nooc>` — daawada nooca\n' +
                    '`?eray stats` — tirakoobka qaamuuska\n\n' +
                    `**Noocyada:** ${NOOCYADA.map(n=>`\`${n}\``).join(', ')}`
                )
                .setColor('#3498db')],
            components: [closeRow('help')],
        });
    }

    // Check badal first
    const saxBadal = saxEray(searchWord);
    const found    = raadEray(searchWord);
    const isSaxBadal = saxBadal !== searchWord;

    if (!found && !isSaxBadal) {
        // Not found at all — try close match (first letter)
        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`🔍 "${searchWord}" — Lama Helin`)
                .setDescription(
                    `Erayga **\`${searchWord}\`** qaamuuska kuma jiro.\n\n` +
                    `💡 Hubi saxnaanta: \`?eray hubi ${searchWord}\`\n` +
                    `📖 Daawada qaamuuska: \`?eray liis\`\n` +
                    `_(Admin: \`?eray dar ${searchWord} <nooc> <tusaale>\`)_`
                )
                .setColor('#95a5a6')],
            components: [closeRow('notfound')],
        });
    }

    const embed = new EmbedBuilder().setColor('#2c3e50');
    let desc = '';

    if (isSaxBadal) {
        desc += `⚠️ **Qalad la helay:** \`${searchWord}\`\n✅ **Saxda:** \`${saxBadal}\`\n\n`;
        // Also look up the correct word
        const foundSax = raadEray(saxBadal);
        if (foundSax) {
            embed.setTitle(`📖 ${foundSax.eray} _(${foundSax.nooc})_`);
            desc += `📌 **Nooca:** ${foundSax.nooc}\n`;
            desc += `💬 **Tusaale:** _"${foundSax.tusaale}"_`;
        } else {
            embed.setTitle(`✍️ Badal — ${searchWord} → ${saxBadal}`);
        }
    } else if (found) {
        embed.setTitle(`📖 ${found.eray} _(${found.nooc})_`);
        desc += `📌 **Nooca:** ${found.nooc}\n`;
        desc += `💬 **Tusaale:** _"${found.tusaale}"_\n\n`;
        desc += `✅ Qoraalka waa **sax**.`;
    }

    embed.setDescription(desc);
    embed.setFooter({ text: '?eray hubi <eray> · ?eray liis <nooc>' });

    return message.reply({ embeds: [embed], components: [closeRow('result')] });
};
