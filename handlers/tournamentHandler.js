const { MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const storage = require("../utils/storage");
const { humanReply } = require("../utils/humanDelay");

// ─── Iniciar torneo ───────────────────────────────────────────────────────────
async function startTournament(message) {
  const teams = Object.keys(storage.load("teams"));
  if (teams.length !== 3)
    return humanReply(
      message,
      `⚠️ El torneo necesita exactamente *3 equipos*~\nActualmente hay ${teams.length}. Usa *!team <nombre>* para registrarlos.`,
    );

  const tournament = storage.load("tournament");
  if (tournament.started)
    return humanReply(
      message,
      "⚠️ El torneo ya está en curso~ Usa *!standings* para ver el estado.",
    );

  // Mezclar equipos aleatoriamente (algoritmo Fisher-Yates)
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  const [A, B, C] = teams;
  const rounds = [
    { round: 1, teamA: A, teamB: B, winner: null },
    { round: 2, teamA: B, teamB: C, winner: null },
    { round: 3, teamA: A, teamB: C, winner: null },
  ];

  storage.save("tournament", {
    started: true,
    finished: false,
    finalists: [],
    rounds,
    tiebreaker: false,
    tiebreakerRounds: [],
    tiebreakerPhase: 0,
  });

  return humanReply(
    message,
    `🏆 *¡TORNEO MLBB INICIADO!* 🏆\n\n` +
      `🎲 *¡Sorteo aleatorio realizado~!* 🎲\n\n` +
      `⚔️ *Ronda 1*\n🛡️ ${A} *vs* ${B} 🛡️\n\n` +
      `⚔️ *Ronda 2*\n🛡️ ${B} *vs* ${C} 🛡️\n\n` +
      `⚔️ *Ronda 3*\n🛡️ ${A} *vs* ${C} 🛡️\n\n` +
      `📌 Registra resultados con *!win <equipo>*\n` +
      `📊 Ver tabla con *!standings* ✨`,
  );
}

// ─── Registrar victoria ───────────────────────────────────────────────────────
async function registerWin(message, args) {
  if (!args[0]) return humanReply(message, "⚠️ Uso: *!win <equipo>*");

  const winner = args.join(" ").trim();
  const teams = storage.load("teams");
  const tournament = storage.load("tournament");

  if (!tournament.started)
    return humanReply(
      message,
      "⚠️ El torneo no ha iniciado~ Usa *!startTournament*",
    );
  // Si el torneo terminó y hay finalistas pero sin ganador final → registrar ganador de la final
  if (
    tournament.finished &&
    tournament.finalists.length >= 2 &&
    !tournament.finalWinner
  )
    return registerFinalWin(message, args);
  if (tournament.finished)
    return humanReply(
      message,
      "🏆 ¡El torneo ya finalizó! Usa *!final* para ver el campeón~",
    );
  if (!teams[winner])
    return humanReply(message, `❌ El equipo *${winner}* no existe~`);

  // ── Modo Tiebreaker ───────────────────────────────────────────────────────
  if (tournament.tiebreaker) {
    return handleTiebreakerWin(message, winner, teams, tournament);
  }

  // ── Rondas normales ───────────────────────────────────────────────────────
  const pendingRound = tournament.rounds.find((r) => r.winner === null);
  if (!pendingRound) {
    return evaluateStandings(message, tournament, teams);
  }

  if (pendingRound.teamA !== winner && pendingRound.teamB !== winner) {
    return humanReply(
      message,
      `⚠️ *${winner}* no juega en la Ronda ${pendingRound.round}~\n` +
        `Esta ronda es: *${pendingRound.teamA}* vs *${pendingRound.teamB}*`,
    );
  }

  const loser =
    pendingRound.teamA === winner ? pendingRound.teamB : pendingRound.teamA;
  pendingRound.winner = winner;
  teams[winner].wins += 1;
  teams[winner].points += 1;
  teams[loser].losses += 1;
  storage.save("tournament", tournament);
  storage.save("teams", teams);

  const nextRound = tournament.rounds.find((r) => r.winner === null);
  let reply = `✅ *Resultado Ronda ${pendingRound.round} registrado!*\n\n🏆 Ganador: *${winner}* ⭐\n💀 Perdedor: *${loser}*\n`;

  if (nextRound) {
    reply += `\n⚔️ *Próxima Ronda ${nextRound.round}:*\n🛡️ ${nextRound.teamA} vs ${nextRound.teamB} 🛡️\n\n📊 Usa *!standings* para ver la tabla~`;
    return humanReply(message, reply);
  } else {
    await humanReply(
      message,
      reply + "\n\n✅ ¡Todas las rondas terminaron! Evaluando resultados~",
    );
    return evaluateStandings(message, tournament, teams);
  }
}

// ─── Evaluar tabla tras las 3 rondas ─────────────────────────────────────────
async function evaluateStandings(message, tournament, teams) {
  // Recargar por si hubo cambios
  teams = storage.load("teams");
  tournament = storage.load("tournament");

  const sorted = getSorted(teams);
  const [first, second, third] = sorted;

  // ── Caso 1: Empate triple (todos con 1 punto) ─────────────────────────────
  if (first.points === 1 && second.points === 1 && third.points === 1) {
    return initTiebreaker(message, tournament, teams, sorted);
  }

  // ── Caso 2: Empate entre 2do y 3ro ───────────────────────────────────────
  if (second.points === third.points) {
    return humanReply(
      message,
      `⚠️ *¡EMPATE entre ${second.name} y ${third.name}!*\n\n` +
        `Tienen los mismos puntos. Criterios de desempate:\n` +
        `1⃣ Mayor cantidad de kills → usa *!stats <equipo> <N>kills*\n` +
        `2⃣ Resultado directo entre ellos\n` +
        `3⃣ Partida extra corta\n\n` +
        `Resuelve y registra con *!win* el equipo que clasifica~`,
    );
  }

  // ── Caso 3: Ganadores claros ──────────────────────────────────────────────
  return generateFinal(
    message,
    tournament,
    teams,
    [first.name, second.name],
    sorted,
  );
}

// ─── Iniciar Tiebreaker ───────────────────────────────────────────────────────
async function initTiebreaker(message, tournament, teams, sorted) {
  // Los 2 equipos con más kills juegan TB R1 (tienen ventaja = segunda oportunidad)
  const byKills = [...sorted].sort((a, b) => b.kills - a.kills);
  const tb1A = byKills[0].name; // más kills
  const tb1B = byKills[1].name; // segundo más kills
  const tbOutsider = byKills[2].name; // menos kills → espera en TB R2

  const tiebreakerRounds = [
    {
      round: "TB1",
      teamA: tb1A,
      teamB: tb1B,
      winner: null,
      description: `Los 2 equipos con más kills`,
    },
    {
      round: "TB2",
      teamA: null,
      teamB: tbOutsider,
      winner: null,
      description: `Perdedor TB1 vs ${tbOutsider}`,
    },
  ];

  tournament.tiebreaker = true;
  tournament.tiebreakerPhase = 0;
  tournament.tiebreakerRounds = tiebreakerRounds;
  storage.save("tournament", tournament);

  const killRanking = byKills
    .map((t, i) => `${i + 1}. 🗡️ *${t.name}* — ${t.kills} kills`)
    .join("\n");

  return humanReply(
    message,
    `🔥 *¡EMPATE TRIPLE DETECTADO! TIME FOR THE TIEBREAKER* 🔥\n\n` +
      `¡Los 3 equipos tienen *1 punto* cada uno! (°ロ°)*:･ﾟ✧\n\n` +
      `📊 *Ranking de Kills:*\n${killRanking}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏹 *TIEBREAKER — Formato:*\n\n` +
      `⚔️ *Tiebreaker Ronda 1*\n` +
      `🛡️ *${tb1A}* vs *${tb1B}* 🛡️\n` +
      `_(Los 2 equipos con más kills)_\n\n` +
      `⚔️ *Tiebreaker Ronda 2*\n` +
      `🛡️ *Perdedor TB1* vs *${tbOutsider}* 🛡️\n` +
      `_(El ganador TB1 ya clasifica a la final)_\n\n` +
      `🏆 *Final:* Ganador TB1 vs Ganador TB2\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `💡 *${tb1A}* y *${tb1B}* tienen segunda oportunidad por sus kills~\n\n` +
      `📌 Registra el resultado con *!win <equipo>*`,
  );
}

// ─── Manejar victoria en Tiebreaker ──────────────────────────────────────────
async function handleTiebreakerWin(message, winner, teams, tournament) {
  const tbRounds = tournament.tiebreakerRounds;
  const phase = tournament.tiebreakerPhase;

  // ── TB Ronda 1 ────────────────────────────────────────────────────────────
  if (phase === 0) {
    const tb1 = tbRounds[0];
    if (tb1.teamA !== winner && tb1.teamB !== winner) {
      return humanReply(
        message,
        `⚠️ En el *Tiebreaker Ronda 1* juegan: *${tb1.teamA}* vs *${tb1.teamB}*~`,
      );
    }

    const loser = tb1.teamA === winner ? tb1.teamB : tb1.teamA;
    tb1.winner = winner;
    // El perdedor de TB1 juega TB2 contra el outsider
    tbRounds[1].teamA = loser;
    tournament.tiebreakerPhase = 1;
    storage.save("tournament", tournament);

    return humanReply(
      message,
      `✅ *Tiebreaker Ronda 1 — Resultado!*\n\n` +
        `🏆 Ganador: *${winner}* → ¡Clasifica a la final! ⭐\n` +
        `💀 Perdedor: *${loser}* → ¡Segunda oportunidad!\n\n` +
        `⚔️ *Tiebreaker Ronda 2:*\n` +
        `🛡️ *${loser}* vs *${tbRounds[1].teamB}* 🛡️\n\n` +
        `📌 El ganador de esta ronda será el segundo finalista~\n` +
        `Registra con *!win <equipo>* 🔥`,
    );
  }

  // ── TB Ronda 2 ────────────────────────────────────────────────────────────
  if (phase === 1) {
    const tb2 = tbRounds[1];
    if (tb2.teamA !== winner && tb2.teamB !== winner) {
      return humanReply(
        message,
        `⚠️ En el *Tiebreaker Ronda 2* juegan: *${tb2.teamA}* vs *${tb2.teamB}*~`,
      );
    }

    const loser = tb2.teamA === winner ? tb2.teamB : tb2.teamA;
    tb2.winner = winner;
    tournament.tiebreakerPhase = 2;

    const tb1Winner = tbRounds[0].winner;
    const finalists = [tb1Winner, winner];

    tournament.finished = true;
    tournament.finalists = finalists;
    storage.save("tournament", tournament);

    return humanReply(
      message,
      `✅ *Tiebreaker Ronda 2 — Resultado!*\n\n` +
        `🏆 Ganador: *${winner}* → ¡Clasifica a la final! ⭐\n` +
        `💀 Eliminado: *${loser}*\n\n` +
        `🎉 *¡TIEBREAKER COMPLETADO!*\n\n` +
        `🏆 *GRAN FINAL*\n` +
        `⚔️ ━━━━━━━━━━━━━━━━ ⚔️\n` +
        `🛡️ *${finalists[0]}*\n` +
        `         VS\n` +
        `🛡️ *${finalists[1]}*\n` +
        `⚔️ ━━━━━━━━━━━━━━━━ ⚔️\n\n` +
        `¡Usa *!final* para ver los detalles! ✨`,
    );
  }

  return humanReply(message, "⚠️ El tiebreaker ya finalizó~");
}

// ─── Generar final ────────────────────────────────────────────────────────────
async function generateFinal(message, tournament, teams, finalists, sorted) {
  tournament.finished = true;
  tournament.finalists = finalists;
  storage.save("tournament", tournament);

  const table = sorted
    .map((t, i) => {
      const medals = ["🥇", "🥈", "🥉"];
      return `${medals[i]} *${t.name}* — ${t.points} pts (${t.kills} kills)`;
    })
    .join("\n");

  return humanReply(
    message,
    `🎉 *¡RONDAS COMPLETADAS!*\n\n` +
      `📊 *Tabla Final:*\n${table}\n\n` +
      `🏆 *GRAN FINAL*\n` +
      `⚔️ ━━━━━━━━━━━━━━━━ ⚔️\n` +
      `🛡️ *${finalists[0]}*\n` +
      `         VS\n` +
      `🛡️ *${finalists[1]}*\n` +
      `⚔️ ━━━━━━━━━━━━━━━━ ⚔️\n\n` +
      `¡Usa *!final* para ver los detalles! ✨`,
  );
}

// ─── Tabla de posiciones ──────────────────────────────────────────────────────
async function showStandings(message) {
  const teams = storage.load("teams");
  const tournament = storage.load("tournament");
  const names = Object.keys(teams);

  if (names.length === 0)
    return humanReply(message, "📭 No hay equipos registrados~");

  const sorted = getSorted(teams);
  const medals = ["🥇", "🥈", "🥉"];
  const rows = sorted
    .map(
      (t, i) =>
        `${medals[i]} *${t.name}*\n   V: ${t.wins} | D: ${t.losses} | Pts: ${t.points} | Kills: ${t.kills}`,
    )
    .join("\n\n");

  let status = "📋 Torneo no iniciado";
  if (tournament.started) {
    if (tournament.finished) status = "🏁 Torneo finalizado";
    else if (tournament.tiebreaker) status = "⚡ En Tiebreaker";
    else {
      const pending = tournament.rounds.filter((r) => r.winner === null).length;
      status = `⚔️ En curso — ${3 - pending}/3 rondas jugadas`;
    }
  }

  // Mostrar estado del tiebreaker si aplica
  let tbInfo = "";
  if (tournament.tiebreaker && !tournament.finished) {
    const phase = tournament.tiebreakerPhase;
    const tbR = tournament.tiebreakerRounds;
    if (phase === 0) {
      tbInfo = `\n\n⚡ *TB Ronda 1 pendiente:*\n${tbR[0].teamA} vs ${tbR[0].teamB}`;
    } else if (phase === 1) {
      tbInfo = `\n\n⚡ *TB Ronda 2 pendiente:*\n${tbR[1].teamA} vs ${tbR[1].teamB}`;
    }
  }

  return humanReply(
    message,
    `📊 *TABLA DE POSICIONES*\n${status}${tbInfo}\n\n${rows}`,
  );
}

// ─── Registrar estadísticas ───────────────────────────────────────────────────
async function registerStats(message, args) {
  if (args.length < 2)
    return humanReply(
      message,
      "⚠️ Uso: *!stats <equipo> <número>kills*\nEjemplo: !stats Alpha 25kills",
    );
  // Último arg contiene el número de kills, todo lo anterior es el nombre del equipo
  const killsArg = args[args.length - 1].toLowerCase();
  const teamName = args.slice(0, -1).join(" ").trim();
  const kills = parseInt(killsArg.replace("kills", ""));
  const teams = storage.load("teams");
  if (!teams[teamName])
    return humanReply(message, `❌ El equipo *${teamName}* no existe~`);
  if (isNaN(kills))
    return humanReply(
      message,
      "⚠️ Formato incorrecto~ Ejemplo: *!stats Alpha 25kills*",
    );
  teams[teamName].kills += kills;
  storage.save("teams", teams);
  return humanReply(
    message,
    `📈 *Stats actualizados para ${teamName}~*\n🗡️ Total kills: *${teams[teamName].kills}*`,
  );
}

// ─── Ver la final ─────────────────────────────────────────────────────────────
async function showFinal(message) {
  const tournament = storage.load("tournament");

  if (!tournament.finished || tournament.finalists.length < 2)
    return humanReply(
      message,
      "⏳ La final aún no está disponible~ Completa todas las rondas primero.",
    );

  if (tournament.finalWinner) {
    return humanReply(
      message,
      `🏆 *¡CAMPEÓN DEL TORNEO!*\n\n` +
        `👑 *${tournament.finalWinner}* 👑\n\n` +
        `¡Ya ganaron la gran final. ＼(٥⁀▽⁀ )／! 🎉\n` +
        `Usa *!ranking* para ver el MVP del torneo~`,
    );
  }

  const [f1, f2] = tournament.finalists;
  return humanReply(
    message,
    `🏆 *GRAN FINAL*\n\n` +
      `⚔️ ━━━━━━━━━━━━━━━━ ⚔️\n` +
      `🛡️ *${f1}*\n` +
      `         VS\n` +
      `🛡️ *${f2}*\n` +
      `⚔️ ━━━━━━━━━━━━━━━━ ⚔️\n\n` +
      `¡Que comience la batalla final! 🔥✨\n` +
      `Registra el ganador con *!win <equipo>*`,
  );
}

// ─── Registrar ganador de la Final ────────────────────────────────────────────
async function registerFinalWin(message, args) {
  if (!args[0]) return humanReply(message, "⚠️ Uso: *!win <equipo>*");

  const winner = args.join(" ").trim();
  const tournament = storage.load("tournament");

  if (!tournament.finished || tournament.finalists.length < 2)
    return humanReply(message, "⚠️ La final aún no está disponible~");

  if (tournament.finalWinner)
    return humanReply(
      message,
      `🏆 La final ya fue registrada~ Ganó *${tournament.finalWinner}*`,
    );

  if (!tournament.finalists.includes(winner))
    return humanReply(
      message,
      `⚠️ *${winner}* no está en la final~\n` +
        `Los finalistas son: *${tournament.finalists[0]}* vs *${tournament.finalists[1]}*`,
    );

  tournament.finalWinner = winner;
  storage.save("tournament", tournament);

  const chat = await message.getChat();
  await humanReply(
    message,
    `✅ *¡Ganador de la Final registrado!*\n\n🏆 *${winner}* ¡es el CAMPEÓN! 👑`,
  );
  await sendCongratulations(chat, winner);
}

// ─── Seleccionar y enviar imagen de felicitaciones ────────────────────────────
async function sendCongratulations(chat, winner) {
  const name = winner.toLowerCase().trim();

  let imagePath = null;
  if (name.includes("zenith")) {
    imagePath = path.join(__dirname, "..", "assets", "team-zenith.jpeg");
  } else if (name.includes("mythic")) {
    imagePath = path.join(__dirname, "..", "assets", "team-mythic.jpeg");
  } else if (name.startsWith("dx")) {
    imagePath = path.join(__dirname, "..", "assets", "team-dx.jpeg");
  }

  const congrats =
    `🎊✨ *¡FELICITACIONES, ${winner.toUpperCase()}!* ✨🎊\n\n` +
    `👑 *¡CAMPEONES DEL TORNEO MLBB!* 👑\n\n` +
    `🏆 ━━━━━━━━━━━━━━━━━━ 🏆\n` +
    `   ¡Lo lograron!\n` +
    `   ¡El esfuerzo y la dedicación\n` +
    `   los llevaron a la cima! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n` +
    `🏆 ━━━━━━━━━━━━━━━━━━ 🏆\n\n` +
    `🌸 *Hoshi-san los felicita a todos~* 🌸\n` +
    `*LudwingJassir*: Me alegro que el torneo fue un exito hasta el final, gracias a *Rowler y Katt* por hacer todo esto posible.\n` +
    `Asi mismo, gracias por dejar a Hoshi-san ser parte de la organizacion. (⁀ᗢ⁀)\n` +
    `Gracias a todos.`;

  try {
    if (imagePath) {
      const media = MessageMedia.fromFilePath(imagePath);
      await chat.sendMessage(media, { caption: congrats });
    } else {
      await chat.sendMessage(congrats);
    }
    console.log(`🎉 Felicitaciones enviadas para: ${winner}`);
  } catch (err) {
    console.error("❌ Error enviando felicitaciones:", err.message);
    await chat.sendMessage(congrats);
  }
}

// ─── Helper: ordenar equipos por puntos desc, luego kills desc ────────────────
function getSorted(teams) {
  return Object.entries(teams)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.points - a.points || b.kills - a.kills);
}

// ─── Recalcular Tiebreaker manualmente ───────────────────────────────────────
async function recalculateTiebreaker(message) {
  const teams = storage.load("teams");
  const tournament = storage.load("tournament");

  // Validaciones
  if (!tournament.started)
    return humanReply(
      message,
      "⚠️ El torneo no ha iniciado~ Usa *!startTournament*",
    );

  if (tournament.finished)
    return humanReply(
      message,
      "🏆 El torneo ya finalizó~ No se puede recalcular el tiebreaker.",
    );

  const pendingNormal = tournament.rounds.find((r) => r.winner === null);
  if (pendingNormal)
    return humanReply(
      message,
      `⚠️ Aún hay rondas normales pendientes~\n` +
        `Completa la *Ronda ${pendingNormal.round}* primero antes de usar !tiebreaker.`,
    );

  const sorted = getSorted(teams);
  const [first, second, third] = sorted;

  // Verificar que realmente hay empate triple
  if (!(first.points === 1 && second.points === 1 && third.points === 1))
    return humanReply(
      message,
      `⚠️ No hay empate triple activo~\n\n` +
        `📊 Tabla actual:\n` +
        sorted
          .map(
            (t, i) =>
              `${i + 1}. *${t.name}* — ${t.points} pts | ${t.kills} kills`,
          )
          .join("\n") +
        "\n\n" +
        `Solo se puede usar *!tiebreaker* cuando los 3 equipos tienen 1 punto cada uno.`,
    );

  // Si ya había un tiebreaker en curso con rondas jugadas, advertir
  if (tournament.tiebreaker && tournament.tiebreakerPhase > 0) {
    await humanReply(
      message,
      `⚠️ *Atención:* Se recalculará el tiebreaker desde cero.\n` +
        `Los resultados del tiebreaker anterior serán descartados~`,
    );
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Recalcular con kills actualizados
  const byKills = [...sorted].sort((a, b) => b.kills - a.kills);
  const tb1A = byKills[0].name;
  const tb1B = byKills[1].name;
  const tbOutsider = byKills[2].name;

  // Resetear tiebreaker con los nuevos datos
  tournament.tiebreaker = true;
  tournament.tiebreakerPhase = 0;
  tournament.tiebreakerRounds = [
    { round: "TB1", teamA: tb1A, teamB: tb1B, winner: null },
    { round: "TB2", teamA: null, teamB: tbOutsider, winner: null },
  ];
  tournament.finished = false;
  tournament.finalists = [];
  storage.save("tournament", tournament);

  const killRanking = byKills
    .map((t, i) => `${i + 1}. 🗡️ *${t.name}* — ${t.kills} kills`)
    .join("\n");

  return humanReply(
    message,
    `🔄 *¡Tiebreaker recalculado con kills actualizados~!* ✨\n\n` +
      `🔥 *¡EMPATE TRIPLE ACTIVO!* 🔥\n\n` +
      `¡Los 3 equipos tienen *1 punto* cada uno! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n\n` +
      `📊 *Ranking de Kills (actualizado):*\n${killRanking}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏹 *TIEBREAKER — Formato:*\n\n` +
      `⚔️ *Tiebreaker Ronda 1*\n` +
      `🛡️ *${tb1A}* vs *${tb1B}* 🛡️\n` +
      `_(Los 2 equipos con más kills — tienen segunda oportunidad)_\n\n` +
      `⚔️ *Tiebreaker Ronda 2*\n` +
      `🛡️ *Perdedor TB1* vs *${tbOutsider}* 🛡️\n` +
      `_(El ganador TB1 ya clasifica a la final)_\n\n` +
      `🏆 *Final:* Ganador TB1 vs Ganador TB2\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `💡 *${tb1A}* y *${tb1B}* tienen segunda oportunidad por sus kills~\n\n` +
      `📌 Registra el resultado con *!win <equipo>* desu~ ⭐`,
  );
}

module.exports = {
  startTournament,
  registerWin,
  showStandings,
  registerStats,
  showFinal,
  recalculateTiebreaker,
  registerFinalWin,
};
