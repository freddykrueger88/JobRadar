const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bewerbungen.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bewerbungen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titel TEXT NOT NULL,
    firma TEXT NOT NULL,
    ort TEXT,
    quelle TEXT,
    url TEXT,
    status TEXT DEFAULT 'beworben',
    beworben_am TEXT,
    followup_datum TEXT,
    bewertung INTEGER,
    notizen TEXT,
    anschreiben TEXT,
    archiviert INTEGER DEFAULT 0,
    erstellt_am TEXT DEFAULT (datetime('now')),
    aktualisiert_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kommentare (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bewerbung_id INTEGER NOT NULL REFERENCES bewerbungen(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    erstellt_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vorlagen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    einleitung TEXT,
    schluss TEXT,
    erstellt_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profil (
    id INTEGER PRIMARY KEY,
    name TEXT, email TEXT, rollen TEXT, ort TEXT,
    keywords TEXT, blacklist TEXT, kurzprofil TEXT, staerken TEXT
  );
`);

const count = db.prepare('SELECT COUNT(*) as c FROM vorlagen').get();
if (count.c === 0) {
  db.prepare(`INSERT INTO vorlagen (name, einleitung, schluss) VALUES (?, ?, ?)`).run(
    'Standard Linux / IT Support',
    'mit großem Interesse habe ich Ihre Stellenausschreibung gelesen. Aufgrund meines Profils sehe ich eine hohe fachliche Nähe zu Ihren Anforderungen.',
    'Gern möchte ich meine Erfahrung in Ihr Team einbringen und Sie in einem persönlichen Gespräch überzeugen.'
  );
  db.prepare(`INSERT INTO vorlagen (name, einleitung, schluss) VALUES (?, ?, ?)`).run(
    'Systemadministration Fokus',
    'die ausgeschriebene Position spricht mich besonders an, da sie meine Schwerpunkte in Linux, Infrastruktur und technischem Troubleshooting sehr gut trifft.',
    'Über die Gelegenheit, meine Kenntnisse praxisnah bei Ihnen einzubringen, würde ich mich sehr freuen.'
  );
}

const profil = db.prepare('SELECT COUNT(*) as c FROM profil').get();
if (profil.c === 0) {
  db.prepare(`INSERT INTO profil (id,name,email,rollen,ort,keywords,blacklist,kurzprofil,staerken) VALUES (1,?,?,?,?,?,?,?,?)`).run(
    'Max Mustermann','max@example.com',
    'Linux Administrator, IT Support, Systemadministrator',
    'Remote, Niedersachsen, Bremen',
    'Linux, Docker, Proxmox, Ansible, Support',
    'Vertrieb, SAP, Außendienst',
    'Fachinformatiker für Systemintegration mit Schwerpunkt Linux, Support und Automatisierung.',
    'Linux, Docker, Proxmox, Troubleshooting, Shell, Ansible Grundlagen'
  );
}

module.exports = db;
