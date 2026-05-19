const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

const WIN_RATE  = 0.50;
const WIN_MULTI = 0.90;
const BTC_ICON  = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';

function directionRow(userId, amount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`eco_ef_up_${amount}_${userId}`)
            .setLabel('⬆️ UP')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`eco_ef_down_${amount}_${userId}`)
            .setLabel('⬇️ DOWN')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`close_cf_${userId}`)
            .setLabel('✖ Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_cf_${userId}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );
}

// Resolve the flip — called from command or button handler
// deleteMsg: optional function to delete the choice panel before sending result
async function resolveFlip(channel, userId, amount, direction, deleteMsg) {
    const { econData: eData, checkEconUser: ceu, saveEcon: se, addToTreasury: att, trackEarning: te } = require('../../economy/econStore');
    ceu(userId);
    const d = eData[userId];

    if ((d.btc || 0) < amount) {
        return channel.send({ content: `⚠️ Not enough BTC. Wallet: **${fmt(d.btc || 0)} BTC**` });
    }

    await new Promise(r => setTimeout(r, 1200));

    const win    = Math.random() < WIN_RATE;
    const profit = Math.floor(amount * WIN_MULTI);

    if (win) {
        d.btc = (d.btc || 0) + profit;
        att(amount - profit);
        te(userId, profit);
    } else {
        d.btc = (d.btc || 0) - amount;
        att(amount);
    }
    se();

    // Delete the choice panel before sending result
    if (deleteMsg) {
        try { await deleteMsg(); } catch {}
    }

    const newBal   = fmt(d.btc || 0);
    const dirLabel = direction === 'up' ? '⬆️ UP' : '⬇️ DOWN';

    const resultEmbed = win
        ? new EmbedBuilder()
            .setTitle('✅ Economy Flip — WIN!')
            .setColor('#2ecc71')
            .setThumbnail(BTC_ICON)
            .setDescription(`You picked **${dirLabel}** — correct!\n\n📈 The market moved your way.`)
            .addFields(
                { name: '₿ Profit',      value: `**+${fmt(profit)} BTC**`, inline: true },
                { name: '₿ New Balance', value: `**${newBal} BTC**`,       inline: true },
            )
            .setFooter({ text: 'Garaad Economy', iconURL: BTC_ICON })
        : new EmbedBuilder()
            .setTitle('❌ Economy Flip — LOSS!')
            .setColor('#e74c3c')
            .setThumbnail(BTC_ICON)
            .setDescription(`You picked **${dirLabel}** — wrong!\n\n📉 The market went the other way.`)
            .addFields(
                { name: '₿ Lost',        value: `**-${fmt(amount)} BTC**`, inline: true },
                { name: '₿ New Balance', value: `**${newBal} BTC**`,       inline: true },
            )
            .setFooter({ text: 'Garaad Economy', iconURL: BTC_ICON });

    return channel.send({ embeds: [resultEmbed] });
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    // Parse: ?ef 500 | ?ef 500 up | ?ef 500 down
    let amount, direction;

    if (args && args.length >= 1) {
        const numIdx = isNaN(parseFloat(args[0])) ? 1 : 0;
        amount    = parseFloat(args[numIdx]);
        direction = (args[numIdx + 1] || '').toLowerCase();
    }

    if (!amount || isNaN(amount) || amount <= 0) {
        return message.reply(
            `⚠️ Usage: \`?ef 500\`  •  \`?ef 500 up\`  •  \`?ef 500 down\`\n` +
            `₿ Wallet: **${fmt(d.btc || 0)} BTC**`
        );
    }

    if ((d.btc || 0) < amount) {
        return message.reply(`⚠️ Not enough BTC. Wallet: **${fmt(d.btc || 0)} BTC**`);
    }

    // Direct resolve if direction typed in command — delete command reply, send result
    if (direction === 'up' || direction === 'down') {
        const sent = await message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🎰 Economy Flip — Flipping...')
                .setColor('#f39c12')
                .setDescription(`You chose **${direction === 'up' ? '⬆️ UP' : '⬇️ DOWN'}**\n\n⏳ _Resolving..._`),
        ]});
        return resolveFlip(
            message.channel,
            userId, amount, direction,
            () => sent.delete()
        );
    }

    // Show UP / DOWN choice panel
    return message.reply({ embeds: [
        new EmbedBuilder()
            .setTitle('🎰 Economy Flip — Choose Direction')
            .setColor('#9b59b6')
            .setThumbnail(BTC_ICON)
            .setDescription(
                `₿ Stake: **${fmt(amount)} BTC**\n\n` +
                `⬆️ **UP** or ⬇️ **DOWN** — pick one!\n\n` +
                `🏆 Win: **+${fmt(Math.floor(amount * WIN_MULTI))} BTC**\n` +
                `💀 Lose: **−${fmt(amount)} BTC**`
            )
            .setFooter({ text: '50/50 chance • Garaad Economy' }),
    ], components: [directionRow(userId, amount)] });
};

module.exports.WIN_MULTI    = WIN_MULTI;
module.exports.resolveFlip  = resolveFlip;
module.exports.closeRow     = closeRow;
