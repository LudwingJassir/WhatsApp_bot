// join-group.js
// Uso: node join-group.js <código-del-link>
// Ejemplo: node join-group.js AbCdEf123456
// ⚠️  Asegúrate de que index.js NO esté corriendo al ejecutar esto

const { Client, LocalAuth } = require('whatsapp-web.js');

const inviteCode = process.argv[2];

if (!inviteCode) {
    console.log('\n❌ Debes proporcionar el código del grupo.');
    console.log('📌 Uso: node join-group.js <código>');
    console.log('📌 Ejemplo: node join-group.js AbCdEf123456');
    console.log('\n💡 El código es la parte final del link:');
    console.log('   https://chat.whatsapp.com/ → AbCdEf123456\n');
    process.exit(1);
}

console.log('\n🔄 Conectando con la sesión guardada...\n');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'tournament-bot' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', () => {
    console.log('⚠️  Necesita QR. Ejecuta index.js primero para vincular la sesión.');
    process.exit(1);
});

client.on('ready', async () => {
    console.log('✅ Sesión activa!\n');
    console.log(`🔗 Uniéndose al grupo con código: ${inviteCode}\n`);

    try {
        const groupId = await client.acceptInvite(inviteCode);
        console.log('🎉 ¡Bot unido exitosamente al grupo!');
        console.log(`📋 Group ID: ${groupId}`);
        console.log('\n✅ Listo. Ahora ejecuta: npm start\n');
    } catch (err) {
        console.error('❌ Error al unirse:', err.message);
        console.log('\n💡 Posibles causas:');
        console.log('   - El link expiró → genera uno nuevo en el grupo');
        console.log('   - El bot ya está en el grupo → ejecuta npm start directo');
        console.log('   - El código es incorrecto\n');
    }

    // Salir sin destroy() para no corromper la sesión
    setTimeout(() => process.exit(0), 2000);
});

client.on('auth_failure', () => {
    console.error('❌ Fallo de autenticación.');
    process.exit(1);
});

client.initialize();