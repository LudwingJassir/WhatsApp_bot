const teamHandler = require("./teamHandler");
const playerHandler = require("./playerHandler");
const tournamentHandler = require("./tournamentHandler");
const mvpHandler = require("./mvpHandler");
const { isAdmin } = require("../utils/validators");
const { humanReply } = require("../utils/humanDelay");
const { sendWelcome } = require("./welcomeHandler");

const ADMIN_COMMANDS = [
  "!team",
  "!deleteteam",
  "!win",
  "!reset",
  "!mvp",
  "!starttournament",
  "!tiebreaker",
  "!apagar",
];

async function handleMessage(client, message) {
  const body = message.body.trim();
  const parts = body.split(" ");
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (ADMIN_COMMANDS.includes(command)) {
    const authorised = await isAdmin(message);
    if (!authorised)
      return humanReply(
        message,
        "Solo los administradores pueden usar ese comando.",
      );
  }

  switch (command) {
    case "!team":
      return teamHandler.createTeam(message, args);
    case "!deleteteam":
      return teamHandler.deleteTeam(message, args);
    case "!teams":
      return teamHandler.listTeams(message);
    case "!reset":
      return teamHandler.resetAll(message);
    case "!add":
      return playerHandler.addPlayer(message, args);
    case "!removeplayer":
      return playerHandler.removePlayer(message, args);
    case "!players":
      return playerHandler.listPlayers(message, args);
    case "!starttournament":
      return tournamentHandler.startTournament(message);
    case "!win":
      return tournamentHandler.registerWin(message, args);
    case "!standings":
      return tournamentHandler.showStandings(message);
    case "!stats":
      return tournamentHandler.registerStats(message, args);
    case "!final":
      return tournamentHandler.showFinal(message);
    case "!tiebreaker":
      return tournamentHandler.recalculateTiebreaker(message);
    case "!mvp":
      return mvpHandler.registerMVP(message, args);
    case "!ranking":
      return mvpHandler.showRanking(message);
    case "!help":
      return sendHelp(message);
    case "!apagar":
      return shutdownBot(message);
    case "!welcome":
      return triggerWelcome(client, message);
    default:
      return humanReply(
        message,
        "❓ Comando desconocido~ Escribe *!help* para ver mis comandos.",
      );
  }
}

async function sendHelp(message) {
  const help = `
🌸 *Hoshi-san — Comandos del Torneo*

👥 *Equipos*
• \`!team <nombre>\` — Crear equipo _(admin)_
• \`!deleteTeam <nombre>\` — Eliminar equipo _(admin)_
• \`!teams\` — Listar equipos
• \`!reset\` — Reiniciar todo _(admin)_

🎮 *Jugadores*
• \`!add <equipo> <jugador>\` — Agregar jugador
• \`!removePlayer <equipo> <jugador>\` — Quitar jugador
• \`!players <equipo>\` — Ver jugadores

⚔️ *Torneo*
• \`!startTournament\` — Generar rondas _(admin)_
• \`!win <equipo>\` — Registrar victoria _(admin)_
• \`!standings\` — Tabla de posiciones
• \`!stats <equipo> <kills>kills\` — Registrar kills
• \`!tiebreaker\` — Recalcular tiebreaker _(admin)_
• \`!final\` — Ver la gran final

🏆 *MVP*
• \`!mvp <jugador>\` — Registrar MVP _(admin)_
• \`!ranking\` — Ranking de MVPs

¡Hoshi-san está aquí para ayudarte! (´｡• ᵕ •｡\`) 💫
    `.trim();
  return humanReply(message, help);
}

async function triggerWelcome(client, message) {
  const isAdm = await isAdmin(message);
  if (!isAdm)
    return humanReply(message, "🚫 Solo admins pueden usar este comando~");
  const chat = await message.getChat();
  await sendWelcome(client, chat.id._serialized);
}

async function shutdownBot(message) {
  const isAdm = await isAdmin(message);
  if (!isAdm)
    return humanReply(message, "🚫 Solo el administrador puede apagar el bot~");
  await humanReply(
    message,
    "🛑 *Hoshi-san se está apagando...*\n\n" +
      "No me quiero ir señor Stark (〒﹏〒)\n" +
      "_El bot dejará de responder en unos segundos._",
  );
  console.log("🛑 Apagado solicitado por admin via WhatsApp.");
  setTimeout(() => process.exit(0), 3000);
}

module.exports = { handleMessage };

// Nota: este bloque se agrega al final del archivo
