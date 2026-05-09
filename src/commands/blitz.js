// =====================================================================
// AMARKA: ?blitz [N]
// =====================================================================

const { startBlitzLobby } = require('../games/blitz');

module.exports = async function blitzCommand(message, args) {
    return startBlitzLobby(message, args);
};
