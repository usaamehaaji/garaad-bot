// =====================================================================
// AMARKA: ?werewolf
// =====================================================================

const { games, lobbyEmbed, lobbyRow } = require('../../src/games/werewolf');

module.exports = async function werewolfCmd(message) {
    const guildId = message.guild.id;

    if (games.has(guildId)) {
        return message.reply('⚠️ Werewolf ciyaar wuu socday. Marka hore dhammaystir.');
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
        elinTimer:    null,
        kingTimer:    null,
        voteMsg:      null,
        necroUsed:    false,
        elinPending:  null,
        kingPending:  null,
    };

    games.set(guildId, game);

    const embed = await lobbyEmbed(game, message.client);
    const row   = lobbyRow(message.author.id, false);

    return message.reply({ embeds: [embed], components: [row] });
};
