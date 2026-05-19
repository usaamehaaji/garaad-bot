const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { econData, checkEconUser, saveEcon, addToTreasury, trackEarning } = require('../../economy/econStore');
const { fmt } = require('../../utils/helpers');

const WIN_RATE  = 0.50;
const WIN_MULTI = 0.90;
const BTC_ICON  = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png';

function closeRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_cf_${userId}`)
            .setLabel('✖ Close')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = async function cashflipCmd(message, args) {
    const userId = message.author.id;
    checkEconUser(userId);
    const d = econData[userId];

    // ?ef 100  OR  ?ef btc 100
    let amount;
    if (args && args.length >= 2 && isNaN(parseFloat(args[0]))) {
        amount = parseFloat(args[1]);
    } else if (args && args.length >= 1 && !isNaN(parseFloat(args[0]))) {
        amount = parseFloat(args[0]);
    }

    if (amount !== undefined) {
        if (!amount || isNaN(amount) || amount <= 0)
            return message.reply('⚠️ Enter a valid amount. Example: `?ef 500`');
        if ((d.btc || 0) < amount)
            return message.reply(`⚠️ Not enough BTC. You have: **${fmt(d.btc || 0)} BTC**`);

        const flipMsg = await message.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('🎰 Economy Flip')
                .setColor('#f39c12')
                .setDescription(`**Flipping...**\n\n⏳ **${fmt(amount)} BTC** on the line...\n_Wait for the result..._`),
        ]});

        await new Promise(r => setTimeout(r, 1500));

        const win = Math.random() < WIN_RATE;

        if (win) {
            const profit = Math.floor(amount * WIN_MULTI);
            d.btc = (d.btc || 0) + profit;
            addToTreasury(amount - profit);
            trackEarning(userId, profit);
        } else {
            d.btc = (d.btc || 0) - amount;
            addToTreasury(amount);
        }
        saveEcon();

        const newBal    = d.btc || 0;
        const profitAmt = fmt(Math.floor(amount * WIN_MULTI));
        const lossAmt   = fmt(amount);
        const balLabel  = fmt(newBal);

        const resultEmbed = win
            ? new EmbedBuilder()
                .setTitle('✅ Economy Flip — WIN!')
                .setColor('#2ecc71')
                .setThumbnail(BTC_ICON)
                .setDescription(`─── **YOU WON!** ───\n\n📈 The market worked in your favor.`)
                .addFields(
                    { name: '₿ Profit',      value: `**+${profitAmt} BTC**`, inline: true },
                    { name: '₿ New Balance', value: `**${balLabel} BTC**`,   inline: true },
                )
                .setFooter({ text: '🔄 Try again with ?ef  •  Garaad Economy', iconURL: BTC_ICON })
            : new EmbedBuilder()
                .setTitle('❌ Economy Flip — LOSS!')
                .setColor('#e74c3c')
                .setThumbnail(BTC_ICON)
                .setDescription(`─── **YOU LOST!** ───\n\n📉 The market went against you.`)
                .addFields(
                    { name: '₿ Lost',        value: `**-${lossAmt} BTC**`,  inline: true },
                    { name: '₿ New Balance', value: `**${balLabel} BTC**`,   inline: true },
                )
                .setFooter({ text: '🔄 Try again with ?ef  •  Garaad Economy', iconURL: BTC_ICON });

        return flipMsg.edit({ embeds: [resultEmbed], components: [closeRow(userId)] });
    }

    return message.reply(`⚠️ Usage: \`?ef 500\` or \`?ef btc 500\`\n₿ Wallet: **${fmt(d.btc || 0)} BTC**`);
};

module.exports.WIN_MULTI = WIN_MULTI;
module.exports.closeRow  = closeRow;
