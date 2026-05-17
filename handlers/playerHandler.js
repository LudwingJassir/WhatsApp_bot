const storage        = require('../utils/storage');
const { humanReply } = require('../utils/humanDelay');

// Para !add y !removePlayer:
// La última palabra = jugador, todo lo demás = nombre del equipo
// Ejemplo: !add Mythic Legion Ludwing → equipo="Mythic Legion", jugador="Ludwing"

async function addPlayer(message, args) {
    if (args.length < 2) return humanReply(message, '⚠️ Uso: *!add <equipo> <jugador>*\nEjemplo: !add Mythic Legion Ludwing');
    const playerName = args[args.length - 1].trim();
    const teamName   = args.slice(0, -1).join(' ').trim();
    const teams      = storage.load('teams');
    if (!teams[teamName]) return humanReply(message, `❌ El equipo *${teamName}* no existe~\nCrea el equipo primero con *!team ${teamName}*`);
    const players = storage.load('players');
    if (!players[teamName]) players[teamName] = [];
    if (players[teamName].includes(playerName)) return humanReply(message, `⚠️ *${playerName}* ya está en el equipo *${teamName}*.`);
    players[teamName].push(playerName);
    storage.save('players', players);
    return humanReply(message, `✅ *${playerName}* agregado al equipo *${teamName}*! ⚔️ (*^‿^*)`);
}

async function removePlayer(message, args) {
    if (args.length < 2) return humanReply(message, '⚠️ Uso: *!removePlayer <equipo> <jugador>*\nEjemplo: !removePlayer Mythic Legion Ludwing');
    const playerName = args[args.length - 1].trim();
    const teamName   = args.slice(0, -1).join(' ').trim();
    const players    = storage.load('players');
    if (!players[teamName] || !players[teamName].includes(playerName))
        return humanReply(message, `❌ *${playerName}* no está en el equipo *${teamName}*~`);
    players[teamName] = players[teamName].filter(p => p !== playerName);
    storage.save('players', players);
    return humanReply(message, `🗑️ *${playerName}* eliminado del equipo *${teamName}*.`);
}

async function listPlayers(message, args) {
    if (!args[0]) return humanReply(message, '⚠️ Uso: *!players <equipo>*');
    const teamName = args.join(' ').trim();
    const teams    = storage.load('teams');
    if (!teams[teamName]) return humanReply(message, `❌ El equipo *${teamName}* no existe~`);
    const players = storage.load('players');
    const list    = players[teamName] || [];
    if (list.length === 0) return humanReply(message, `📭 El equipo *${teamName}* no tiene jugadores aún.\nUsa *!add ${teamName} <jugador>* para agregar~`);
    const formatted = list.map((p, i) => `${i + 1}. 🎮 ${p}`).join('\n');
    return humanReply(message, `👾 *Equipo ${teamName} — Jugadores (${list.length})*\n\n${formatted}`);
}

module.exports = { addPlayer, removePlayer, listPlayers };