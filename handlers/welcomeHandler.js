// handlers/welcomeHandler.js
const { MessageMedia } = require('whatsapp-web.js');
const path             = require('path');
const { randomDelay }  = require('../utils/humanDelay');

// Ruta local del MP4 — está en la carpeta assets/ del proyecto
const MP4_PATH = path.join(__dirname, '..', 'assets', 'welcome.mp4');

async function sendWelcome(client, groupId) {
    try {
        console.log(`🌸 Enviando bienvenida al grupo: ${groupId}`);
        const chat = await client.getChatById(groupId);

        await randomDelay(2000, 3000);

        // ── 1. Enviar MP4 local como GIF animado ──────────────────────────
        try {
            const media = MessageMedia.fromFilePath(MP4_PATH);
            await chat.sendMessage(media, {
                sendVideoAsGif: true,
                caption: '✨ *¡Hola a todos!* ✨'
            });
            console.log('✅ GIF animado enviado desde archivo local!');
        } catch (e) {
            console.warn('⚠️ Error enviando MP4:', e.message);
        }

        await randomDelay(1500, 2500);

        // ── 2. Mensaje de presentación ────────────────────────────────────
        const intro = [
            'Soy *Hoshi-san* ⭐, sere tu asistente oficial para el torneo de *MLBB*! (￣▽￣)/ ',
            '',
            '*Estas son mis funciones:*',
            '⚔️ Organizar rondas del torneo',
            '👥 Gestionar equipos y jugadores',
            '🏆 Registrar victorias y MVPs',
            '📊 Mostrar la tabla de posiciones',
            '🎯 Detectar a los finalistas automáticamente',
            '',
            'Escribe *!help* y te muestro todos mis comandos. 💫',
            '',
            '*¡Vamos a hacer el mejor torneo!* 🔥',
            '_(Solo los admins pueden usar comandos especiales.)_',
            '*Usa los comandos uno por uno, no saturen a Hoshi-san, Porfavor!* (￣▽￣*)ゞ ',
        ].join('\n');

        await chat.sendMessage(intro);
        console.log('✅ Mensaje de bienvenida completo enviado.');

    } catch (err) {
        console.error('❌ Error en sendWelcome:', err.message);
    }
}

module.exports = { sendWelcome };