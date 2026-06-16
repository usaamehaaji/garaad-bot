// =====================================================================
// AMARKA: ?mafia
// =====================================================================

const { games, lobbyEmbed, lobbyRow } = require('../../src/games/werewolf');

module.exports = async function mafiaCmd(message) {
    const guildId = message.guild.id;

    if (games.has(guildId)) {
        return message.reply('⚠️ Mafia game wuu socdaa. Marka hore dhammaystir ama admin ha joojiyo.');
    }

    const game = {
        guildId,
        hostId:       message.author.id,
        phase:        'lobby',
        players:      new Map([[message.author.id, null]]),
        textChannel:  message.channel,
        round:        1,
        votes:        new Map(),
        nightActions: null,
        nightTimer:   null,
        dayTimer:     null,
        voteTimer:    null,
        voteMsg:      null,
    };

    games.set(guildId, game);

    const embed = await lobbyEmbed(game, message.client);
    const row   = lobbyRow(message.author.id, false);

    return message.reply({ embeds: [embed], components: [row] });
};
