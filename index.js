const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const qrcodeLib = require("qrcode");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { handleMessage } = require("./handlers/messageRouter");
const { sendWelcome } = require("./handlers/welcomeHandler");
const { randomDelay } = require("./utils/humanDelay");

// ─── Limpiar locks de Chromium al iniciar ─────────────────────────────────────
function cleanChromiumLocks() {
  const lockFiles = [
    ".wwebjs_auth/session-tournament-bot/SingletonLock",
    ".wwebjs_auth/session-tournament-bot/SingletonCookie",
    ".wwebjs_auth/session-tournament-bot/SingletonSocket",
  ];
  lockFiles.forEach((lockPath) => {
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
        console.log("🔓 Lock eliminado: " + lockPath);
      }
    } catch (e) {
      console.warn("⚠️ No se pudo eliminar " + lockPath + ":", e.message);
    }
  });
}
cleanChromiumLocks();

// ─── Servidor web para mostrar QR en Railway ──────────────────────────────────
const app = express();
let qrData = null;
let botReady = false;

app.get("/", async (req, res) => {
  if (botReady) {
    return res.send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#0f0">
                <h1>✅ Hoshi-chan está ONLINE</h1>
                <p>El bot está conectado y funcionando correctamente.</p>
                <p style="color:#888">No necesitas hacer nada más.</p>
            </body></html>
        `);
  }
  if (!qrData) {
    return res.send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
                <h1>⏳ Esperando QR...</h1>
                <p>El bot está iniciando. Recarga la página en unos segundos.</p>
                <script>setTimeout(()=>location.reload(), 3000)</script>
            </body></html>
        `);
  }
  // Generar imagen QR
  const qrImage = await qrcodeLib.toDataURL(qrData);
  res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
            <h1>📱 Escanea este QR con WhatsApp Business</h1>
            <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
            <img src="${qrImage}" style="width:300px;border:8px solid white;border-radius:12px"/>
            <p style="color:#888;font-size:12px">El QR se actualiza automáticamente. Si expira, recarga la página.</p>
            <script>setTimeout(()=>location.reload(), 30000)</script>
        </body></html>
    `);
});

// Ruta para apagar el bot de forma remota (protegida por token)
app.get("/shutdown", (req, res) => {
  const token = req.query.token;
  if (token !== process.env.SHUTDOWN_TOKEN) {
    return res.status(403).send("❌ Token incorrecto.");
  }
  res.send("🛑 Apagando Hoshi-chan...");
  console.log("🛑 Shutdown solicitado vía web.");
  setTimeout(() => process.exit(0), 1000);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🌐 Panel QR disponible en el puerto ${PORT}`),
);

// ─── Cliente WhatsApp ─────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "tournament-bot" }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  },
});

// ─── QR ───────────────────────────────────────────────────────────────────────
client.on("qr", (qr) => {
  qrData = qr;
  botReady = false;
  console.log(
    "\n📱 QR generado — visita la URL de tu proyecto en Railway para escanearlo\n",
  );
  qrcode.generate(qr, { small: true });
});

// ─── Listo ────────────────────────────────────────────────────────────────────
client.on("ready", async () => {
  qrData = null;
  botReady = true;
  console.log("\n✅ Hoshi-chan está lista! Bot de Torneo MLBB conectado~ ⭐\n");
  try {
    console.log(`📱 ID del bot: ${client.info.wid._serialized}`);
  } catch (_) {}
});

// ─── Bienvenida al unirse a grupo ─────────────────────────────────────────────
client.on("group_join", async (notification) => {
  try {
    const botId = client.info.wid._serialized;
    const addedIds = notification.recipientIds || [];
    const botJoined = addedIds.some(
      (id) =>
        id === botId || id.replace("@c.us", "") === botId.replace("@c.us", ""),
    );
    if (botJoined) {
      const chat = await notification.getChat();
      console.log(`🎉 Bot añadido al grupo: "${chat.name}"`);
      await sendWelcome(client, chat.id._serialized);
    }
  } catch (err) {
    console.error("❌ Error en group_join:", err.message);
  }
});

// ─── Mensajes ─────────────────────────────────────────────────────────────────
client.on("message", async (message) => {
  try {
    if (!message.body.startsWith("!")) return;
    await randomDelay(500, 1500);
    await handleMessage(client, message);
  } catch (err) {
    console.error("❌ Error al procesar mensaje:", err);
  }
});

client.on("auth_failure", () => console.error("❌ Error de autenticación."));
client.on("disconnected", (reason) =>
  console.warn("⚠️ Bot desconectado:", reason),
);

client.initialize();
