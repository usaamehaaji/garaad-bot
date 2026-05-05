const { userData, saveData } = require('../store');
const { checkUser } = require('../utils/helpers');

module.exports = async function passwordCommand(message, args) {
    const userId = message.author.id;
    checkUser(userId);

    const code = args[0] ? args[0].toString() : '';
    if (!/^[0-9]{4}$/.test(code)) {
        return message.reply('Fadlan isticmaal `?password 1234` oo leh 4-lambar oo sax ah.');
    }

    userData[userId].password = code;
    saveData();

    return message.reply('✅ Password-kaaga 4-lambar waa la dejiyay. Hadda waxaad bilaabi kartaa `?trade` ama `?jeeb` si aad u aragto jeebkaaga.');
};
