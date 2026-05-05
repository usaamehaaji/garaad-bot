const { EmbedBuilder } = require('discord.js');
const { userData, saveData } = require('../store');
const { checkUser } = require('../utils/helpers');
const { PREFIX } = require('../config');

module.exports = async function shieldCommand(message) {
  const userId = message.author.id;
  checkUser(userId);

  const user = userData[userId];
  user.inventory ??= { shield: 0, double: 0, hint: 0, retry: 0 };

  const active = (user.shieldActiveUntil || 0) > Date.now();
  if (active) {
    const mins = Math.ceil((user.shieldActiveUntil - Date.now()) / (60 * 1000));
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🛡️ Shield')
          .setColor('#f1c40f')
          .setDescription(`Shield-kaagu wuu shaqaynayaa. Wuu haray **${mins}** daqiiqo.`),
      ],
    });
  }

  if ((user.inventory.shield || 0) <= 0) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🛡️ Shield')
          .setColor('#e67e22')
          .setDescription(
            `Shield kuma jirto inventory-gaaga.\n` +
            `Ka iibso dukaanka: \`${PREFIX}shop\` → \`${PREFIX}buy shield\``
          ),
      ],
    });
  }

  user.inventory.shield -= 1;
  // 2 hours protection, single-use on first loss (trade engine will consume by setting to 0)
  user.shieldActiveUntil = Date.now() + 2 * 60 * 60 * 1000;
  saveData();

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('🛡️ Shield Activated')
        .setColor('#2ecc71')
        .setDescription(
          `✅ Shield waa la shiday (2 saac).\n` +
          `Markaad **sell** ku khasaarayso, shield-ka wuxuu yareyn doonaa khasaaraha hal mar.`
        ),
    ],
  });
};

