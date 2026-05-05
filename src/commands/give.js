const { EmbedBuilder } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser } = require('../utils/helpers');
const { PREFIX } = require('../config');

function formatUsd(v) {
  return `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = async function giveCommand(message, args) {
  const fromId = message.author.id;
  checkUser(fromId);

  const target = message.mentions.users.first();
  if (!target) {
    return message.reply(`Isticmaal: \`${PREFIX}give @qof 100\``);
  }
  if (target.bot) return message.reply('Bot lacag lama siin karo.');
  if (target.id === fromId) return message.reply('Naftaada lacag uma diri kartid.');

  const amount = Number(args.find(a => /^\d+(\.\d+)?$/.test(a)));
  if (!Number.isFinite(amount) || amount <= 0) {
    return message.reply(`Qor lacag sax ah. Tusaale: \`${PREFIX}give @qof 100\``);
  }

  checkUser(target.id);

  const from = userData[fromId];
  const to = userData[target.id];
  from.cash ??= Number.isFinite(from.usdBalance) ? from.usdBalance : 0;
  to.cash ??= Number.isFinite(to.usdBalance) ? to.usdBalance : 0;

  if (from.cash < amount) {
    return message.reply(`❌ Cash ku filan ma haysid. Cash-kaaga: **${formatUsd(from.cash)}**`);
  }

  from.cash -= amount;
  to.cash += amount;
  saveData();

  const embed = new EmbedBuilder()
    .setTitle('🤝 Cash Transfer')
    .setColor('#3498db')
    .setDescription(
      `✅ <@${fromId}> wuxuu siiyay <@${target.id}> **${formatUsd(amount)}**.\n\n` +
      `Cash-kaaga hadda: **${formatUsd(from.cash)}**`
    );

  return message.reply({ embeds: [embed] });
};

