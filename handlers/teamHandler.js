const storage        = require('../utils/storage');
const { humanReply } = require('../utils/humanDelay');

async function createTeam(message, args) {
    if (!args[0]) return humanReply(message, '⚠️ Uso: *!team <nombre>*');
    const name = args.join(' ').trim();
    const data = storage.load('teams');
    if (data[name]) return humanReply(message, `⚠️ El equipo *${name}* ya existe, bruh.`);
    data[name] = { wins: 0, losses: 0, points: 0, kills: 0 };
    storage.save('teams', data);
    return humanReply(message, `✅ ¡Equipo *${name}* creado exitosamente! <(￣︶￣)>`);
}

async function deleteTeam(message, args) {
    if (!args[0]) return humanReply(message, '⚠️ Uso: *!deleteTeam <nombre>*');
    const name = args.join(' ').trim();
    const data = storage.load('teams');
    if (!data[name]) return humanReply(message, `❌ El equipo *${name}* no existe~`);
    delete data[name];
    storage.save('teams', data);
    const players = storage.load('players');
    delete players[name];
    storage.save('players', players);
    return humanReply(message, `🗑️ Equipo *${name}* eliminado correctamente.`);
}

async function listTeams(message) {
    const data  = storage.load('teams');
    const names = Object.keys(data);
    if (names.length === 0) return humanReply(message, '📭 No hay equipos registrados aún.\nUsa *!team <nombre>* para crear uno~');
    const list = names.map((n, i) => `${i + 1}. 🛡️ ${n}`).join('\n');
    return humanReply(message, `👥 *Equipos Registrados (${names.length})*\n\n${list}`);
}

async function resetAll(message) {
    storage.save('teams',      {});
    storage.save('players',    {});
    storage.save('tournament', { rounds: [], started: false, finished: false, finalists: [], tiebreaker: false, tiebreakerRounds: [], tiebreakerPhase: 0, finalWinner: null });
    storage.save('mvp',        {});
    return humanReply(message, '🔄 *¡Todo reiniciado!* ¡Listo para un nuevo torneo. (｡•̀ᴗ-)✧');
}

module.exports = { createTeam, deleteTeam, listTeams, resetAll };