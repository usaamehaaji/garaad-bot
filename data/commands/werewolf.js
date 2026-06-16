// =====================================================================
// AMARKA: ?mafia
// =====================================================================

const { EmbedBuilder } = require('discord.js');
const { games, lobbyEmbed, lobbyRow, startGame, MIN_PLAYERS, LOBBY_SECONDS } = require('../../src/games/werewolf');

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
        lobbyTimer:   null,
        dayTimer:     null,
        voteTimer:    null,
        lobbyMsg:     null,
        voteMsg:      null,
    };

    games.set(guildId, game);

    const embed = await lobbyEmbed(game, message.client);
    const row   = lobbyRow(message.author.id, false);

    const lobbyMsg = await message.reply({ embeds: [embed], components: [row] });
    game.lobbyMsg = lobbyMsg;

    game.lobbyTimer = setTimeout(async () => {
        const current = games.get(guildId);
        if (!current || current.phase !== 'lobby') return;

        if (current.players.size < MIN_PLAYERS) {
            games.delete(guildId);
            await lobbyMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#7f8c8d')
                    .setTitle('🔪 Mafia — Lobby waa la xidhay')
                    .setDescription(`Ugu yaraan **${MIN_PLAYERS} qof** ayaa loo baahnaa. Ciyaarta lama bilaabin.`)],
                components: [],
            }).catch(() => {});
            return;
        }

        await lobbyMsg.edit({
            embeds: [new EmbedBuilder()
                .setColor('#c0392b')
                .setTitle('🔪 Mafia — Bilaabanaya...')
                .setDescription('Lobby-ga waa xirmay. Doorarka DM-ka ayaa loo dirayaa. Sugso!')],
            components: [],
        }).catch(() => {});
        await startGame(current, message.client);
    }, LOBBY_SECONDS * 1000);

    return lobbyMsg;
};
