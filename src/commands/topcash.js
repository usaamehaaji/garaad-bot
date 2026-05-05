const { EmbedBuilder } = require('discord.js');
const { userData } = require('../store');
const { checkUser } = require('../utils/helpers');

function formatUsd(v) {
  return `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = async function topCashCommand(message) {
  // ensure author exists
  checkUser(message.author.id);

  const leaderboard = Object.entries(userData)
    .map(([id, data]) => {
      const cash = Number.isFinite(data.cash) ? data.cash : (Number.isFinite(data.usdBalance) ? data.usdBalance : 0);
      return { id, cash };
    })
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 10);

  const description = leaderboard.length
    ? leaderboard.map((e, i) => `**${i + 1}.** <@${e.id}> — **${formatUsd(e.cash)}**`).join('\n')
    : 'Wali cidna cash ma leh.';

  const embed = new EmbedBuilder()
    .setTitle('💰 Top Cash — Dadka ugu lacagta badan')
    .setDescription(description)
    .setColor('#27ae60')
    .setFooter({ text: 'Tani waxay ku salaysan tahay cash kaliya (portfolio lama darin).' });

  return message.reply({ embeds: [embed] });
};

