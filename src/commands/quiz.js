// =====================================================================
// AMARKA: ?quiz [6-25]
// =====================================================================

const { startQuizLobby } = require('../games/quiz');

module.exports = async function quizCommand(message, args) {
    return startQuizLobby(message, args);
};
