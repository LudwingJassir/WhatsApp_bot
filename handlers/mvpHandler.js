const storage        = require('../utils/storage');
const { humanReply } = require('../utils/humanDelay');

async function registerMVP(message, args) {
    if (!args[0]) return humanReply(message, '⚠️ Uso: *!mvp <jugador>*');
    const playerName = args[0].trim();
    const mvp        = storage.load('mvp');
    if (!mvp[playerName]) mvp[playerName] = 0;
    mvp[playerName] += 1;
    storage.save('mvp', mvp);
    return humanReply(message, `⭐ *¡MVP registrado!*\n\n🏅 Jugador: *${playerName}*\n🏆 Total MVPs: *${mvp[playerName]}*\n\nUsa *!ranking* para ver el top~ ✨`);
}

async function showRanking(message) {
    const mvp     = storage.load('mvp');
    const entries = Object.entries(mvp);
    if (entries.length === 0) return humanReply(message, '📭 Aún no hay MVPs registrados~\nUsa *!mvp <jugador>* para registrar uno.');
    const sorted  = entries.sort((a, b) => b[1] - a[1]);
    const medals  = ['🥇', '🥈', '🥉'];
    const ranking = sorted.map(([name, count], i) =>
        `${medals[i] || `${i + 1}.`} *${name}* — ${count} MVP${count > 1 ? 's' : ''}`
    ).join('\n');
    return humanReply(message, `🏆 *RANKING MVP*\n\n${ranking}\n\n⭐ ¡Estos son los mejores jugadores del torneo! (´｡• ᵕ •｡\`)`);
}

module.exports = { registerMVP, showRanking };