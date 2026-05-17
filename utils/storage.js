const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Valores por defecto para cada archivo
const DEFAULTS = {
    teams:      {},
    players:    {},
    mvp:        {},
    tournament: {
        started:   false,
        finished:  false,
        finalists: [],
        rounds:    []
    }
};

// Asegurarse de que el directorio data/ existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Cargar datos ─────────────────────────────────────────────────────────────
function load(filename) {
    const filePath = path.join(DATA_DIR, `${filename}.json`);
    try {
        if (!fs.existsSync(filePath)) {
            const defaultData = DEFAULTS[filename] || {};
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return JSON.parse(JSON.stringify(defaultData));
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`❌ Error leyendo ${filename}.json:`, err.message);
        return JSON.parse(JSON.stringify(DEFAULTS[filename] || {}));
    }
}

// ─── Guardar datos ────────────────────────────────────────────────────────────
function save(filename, data) {
    const filePath = path.join(DATA_DIR, `${filename}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`❌ Error guardando ${filename}.json:`, err.message);
    }
}

module.exports = { load, save };