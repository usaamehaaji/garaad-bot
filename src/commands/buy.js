// =====================================================================
// AMARKA: ?buy [shay]
// =====================================================================

const { userData, saveData } = require('../store');
const { PREFIX, SHOP_ITEMS, TITLES } = require('../config');

module.exports = async function buyCommand(message, args) {
    const userId  = message.author.id;
    const itemKey = (args[0] || '').toLowerCase();
    let item = SHOP_ITEMS[itemKey];

    // Check if it's a title
    if (!item) {
        for (const category in TITLES) {
            if (TITLES[category][itemKey]) {
                item = TITLES[category][itemKey];
                break;
            }
        }
    }

    if (!item) {
        return message.reply(`⚠️ Shay aan jirin. Eeg dukaanka: \`${PREFIX}shop\``);
    }
    if (userData[userId].xp < item.price) {
        return message.reply(
            `⚠️ XP-gaagu ma filna! Waxaad u baahan tahay **${item.price} XP**, waxaadse haysataa **${userData[userId].xp} XP**.`
        );
    }

    userData[userId].xp -= item.price;

    if (itemKey === 'shield') {
        userData[userId].inventory.shield++;
    } else if (itemKey === 'double') {
        userData[userId].doubleXpUntil = Date.now() + 60 * 60 * 1000; // 1 saacad
    } else if (itemKey === 'hint') {
        userData[userId].inventory.hint++;
    } else if (itemKey === 'retry') {
        userData[userId].inventory.retry++;
    } else {
        // It's a title
        if (itemKey === 'custom') {
            if (userData[userId].customTitle !== null) {
                // Soo celi XP haddii horeba u iibsaday
                userData[userId].xp += item.price;
                return message.reply('⚠️ Waxaad hore u iibsatay custom title.');
            }
            userData[userId].customTitle = ''; // Unlocked
        } else {
            if (!userData[userId].ownedTitles.includes(itemKey)) {
                userData[userId].ownedTitles.push(itemKey);
            }
            userData[userId].activeTitle = itemKey;
        }
    }

    saveData();
    return message.reply(`✅ Waxaad iibsatay **${item.name}** (-${item.price} XP). Mahadsanid!`);
};
