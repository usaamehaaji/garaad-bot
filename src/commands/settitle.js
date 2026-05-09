// =====================================================================
// AMARKA: ?settitle [title_key | custom name]
// =====================================================================

const { userData, saveData } = require('../store');
const { checkUser } = require('../utils/helpers');
const { TITLES } = require('../config');

// Bad words filter (simple list)
const BAD_WORDS = ['badword1', 'badword2', 'offensive']; // Add more as needed

function hasBadWords(text) {
    const lower = text.toLowerCase();
    return BAD_WORDS.some(word => lower.includes(word));
}

module.exports = async function setTitleCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);
    const data = userData[userId];

    if (!args.length) {
        return message.reply('⚠️ Isticmaal: `?settitle <title_key>` ama `?settitle custom <name>`');
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === 'custom') {
        if (data.customTitle === null) {
            return message.reply('⚠️ Ma haysatid custom title. Iibso marka hore: `?buy custom`');
        }
        const customName = args.slice(1).join(' ').trim();
        if (!customName) {
            return message.reply('⚠️ Magaca custom title-ka waa inuu jiraa.');
        }
        if (hasBadWords(customName)) {
            return message.reply('⚠️ Magacaasi wuxuu ka kooban yahay ereyo xunxun. Fadlan beddel.');
        }
        data.activeTitle = null; // Deactivate other titles
        // Custom title is already set, but we can update it
        data.customTitle = customName;
        saveData();
        return message.reply(`✅ Custom title-kaaga waxaa lagu beddelay: **${customName}**`);
    } else {
        // Set owned title
        const titleKey = subCommand;
        if (!data.ownedTitles.includes(titleKey)) {
            return message.reply('⚠️ Ma haysatid title-kaan. Eeg `?titles` ama iibso.');
        }
        data.activeTitle = titleKey;
        data.customTitle = null; // Deactivate custom
        saveData();
        let titleName = '';
        for (const category in TITLES) {
            if (TITLES[category][titleKey]) {
                titleName = TITLES[category][titleKey].name;
                break;
            }
        }
        return message.reply(`✅ Title-kaaga waxaa lagu beddelay: **${titleName}**`);
    }
};