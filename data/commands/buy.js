// =====================================================================
// AMARKA: ?buy [shay]  |  ?buy custom <magacaaga>
// =====================================================================

const { userData, saveData } = require('../../src/store');
const { PREFIX, SHOP_ITEMS, TITLES } = require('../../src/config');

const CUSTOM_MAX_LEN = 24;

module.exports = async function buyCommand(message, args) {
    const userId  = message.author.id;
    const itemKey = (args[0] || '').toLowerCase();

    // ── Custom title: ?buy custom <magac> ──
    if (itemKey === 'custom') {
        const customName = args.slice(1).join(' ').trim();
        const price      = TITLES.custom.custom.price;

        if (!customName) {
            return message.reply(
                `✍️ **Custom Title — Sida loo isticmaalo:**\n\n` +
                `\`${PREFIX}buy custom <magacaaga>\`\n\n` +
                `**Tusaale:** \`${PREFIX}buy custom Garaadle\`\n\n` +
                `💰 Qiimaha: **${price} XP** · XP-gaaga: **${userData[userId].xp} XP**`
            );
        }

        if (customName.length > CUSTOM_MAX_LEN) {
            return message.reply(`⚠️ Magaca aad dheer yahay! Ugu badnaan **${CUSTOM_MAX_LEN}** xaraf.`);
        }

        if (userData[userId].xp < price) {
            return message.reply(
                `⚠️ XP-gaagu ma filna!\n\nWaxaad u baahan tahay **${price} XP** · Waxaadse haysataa **${userData[userId].xp} XP**.`
            );
        }

        // Haddii horeba u iibsaday — update kaliya la sameeyaa (lacag cusub la qaadaa)
        const alreadyOwned = userData[userId].ownedTitles.includes('custom');
        if (alreadyOwned) {
            // Beddelid title cusub — XP la qaadaa mar kale
            userData[userId].xp        -= price;
            userData[userId].customTitle = customName;
            userData[userId].activeTitle = 'custom';
            saveData();
            return message.reply(`✅ Custom title-kaaga waa la cusboonaasiiyay: **${customName}** (-${price} XP)\n\nTitle-kaaga cusub marka xigta ayuu muuqan doonaa.`);
        }

        // Iibsasho cusub
        userData[userId].xp -= price;
        userData[userId].customTitle = customName;
        userData[userId].activeTitle = 'custom';
        if (!userData[userId].ownedTitles.includes('custom')) {
            userData[userId].ownedTitles.push('custom');
        }
        saveData();
        return message.reply(`✅ Custom title la iibsaday: **${customName}** (-${price} XP)\n\nTitle-kaaga cusub marka xigta ayuu muuqan doonaa!`);
    }

    // ── Shayga kale: SHOP_ITEMS ama TITLES ──
    let item = SHOP_ITEMS[itemKey];
    if (!item) {
        for (const category in TITLES) {
            if (TITLES[category][itemKey]) {
                item = TITLES[category][itemKey];
                break;
            }
        }
    }

    if (!item) {
        return message.reply(`⚠️ Shay aan jirin. Isticmaal \`${PREFIX}titles\` si aad u aragto darajooyinka.`);
    }

    // Champion title — admin kaliya
    if (itemKey === 'champion') {
        return message.reply(
            `🏆 **Champion** title-ka waa la iibsan **karin**.\n\n` +
            `Title-kan waxaa heli kara **kaliya** guulaha tartan weyn — admin ayaa u ogolaan doona.`
        );
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
        userData[userId].doubleXpUntil = Date.now() + 60 * 60 * 1000;
    } else if (itemKey === 'hint') {
        userData[userId].inventory.hint++;
    } else if (itemKey === 'retry') {
        userData[userId].inventory.retry++;
    } else {
        if (!userData[userId].ownedTitles.includes(itemKey)) {
            userData[userId].ownedTitles.push(itemKey);
        }
        userData[userId].activeTitle = itemKey;
    }

    saveData();
    return message.reply(`✅ Waxaad iibsatay **${item.name}** (-${item.price} XP). Mahadsanid!`);
};
