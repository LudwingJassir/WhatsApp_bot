// ─── IDs de WhatsApp de los administradores autorizados ──────────────────────
// Formato: número@c.us  (ej: 50588888888@c.us para Nicaragua)
// Para obtener tu ID: el bot puede logearlo en consola con message.author
const ADMIN_IDS = [
    '149263048802440@lid',
    '273963095703754@lid',
    '27818704527378@lid',
];

/**
 * Verifica si quien envió el mensaje es un administrador autorizado.
 * En grupos también acepta a los administradores del grupo de WhatsApp.
 */
async function isAdmin(message) {
    try {
        const authorId = message.author || message.from;

        // Verificar lista manual de admins
        if (ADMIN_IDS.includes(authorId)) return true;

        // Verificar si es admin del grupo de WhatsApp
        const chat = await message.getChat();
        if (chat.isGroup) {
            const participant = chat.participants.find(p => p.id._serialized === authorId);
            if (participant && (participant.isAdmin || participant.isSuperAdmin)) return true;
        }

        // Debug: loguear el ID del usuario para facilitar la configuración
        console.log(`[AUTH] ID del usuario: ${authorId} — No es admin.`);
        return false;

    } catch (err) {
        console.error('Error validando admin:', err.message);
        return false;
    }
}

module.exports = { isAdmin, ADMIN_IDS };