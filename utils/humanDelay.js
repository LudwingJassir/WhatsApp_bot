// utils/humanDelay.js
// Simula comportamiento humano con delays aleatorios antes de responder

/**
 * Espera un tiempo aleatorio entre min y max milisegundos
 */
function randomDelay(minMs = 1500, maxMs = 4000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simula que el bot está "escribiendo" antes de responder
 * Más natural y menos detectable como bot
 */
async function humanReply(message, text, options = {}) {
    const {
        minDelay = 1500,
        maxDelay = 4000,
        typing   = true   // simular estado "escribiendo..."
    } = options;

    try {
        // Simular delay humano
        await randomDelay(minDelay, maxDelay);

        // Simular "escribiendo..." si está en un chat
        if (typing) {
            const chat = await message.getChat();
            await chat.sendStateTyping();
            // Tiempo adicional proporcional al largo del mensaje
            const typingTime = Math.min(text.length * 15, 3000);
            await randomDelay(typingTime, typingTime + 1000);
        }

        return await message.reply(text);
    } catch (err) {
        // Fallback: responder sin delay si algo falla
        return await message.reply(text);
    }
}

/**
 * Enviar mensaje a un chat con delay humano (sin reply)
 */
async function humanSend(chat, text, options = {}) {
    const { minDelay = 1000, maxDelay = 3000 } = options;
    await randomDelay(minDelay, maxDelay);
    try {
        await chat.sendStateTyping();
        const typingTime = Math.min(text.length * 12, 2500);
        await randomDelay(typingTime, typingTime + 800);
    } catch (_) {}
    return await chat.sendMessage(text);
}

module.exports = { randomDelay, humanReply, humanSend };