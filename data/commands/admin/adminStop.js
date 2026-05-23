// =====================================================================
// AMARKA: ?admin stop
// =====================================================================

const tournament = require('../../games/tournament');

module.exports = async function adminStop(message, args) {
    return tournament.cmdStop(message);
};