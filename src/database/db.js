const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/game.db');
let db;

function initDatabase() {
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Tabela de treinadores
  db.exec(`
    CREATE TABLE IF NOT EXISTS trainers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT DEFAULT 'kanto',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      pokeballs INTEGER DEFAULT 5,
      great_balls INTEGER DEFAULT 0,
      ultra_balls INTEGER DEFAULT 0,
      coins INTEGER DEFAULT 100,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pokemon_collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id TEXT NOT NULL,
      pokemon_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      hp INTEGER NOT NULL,
      max_hp INTEGER NOT NULL,
      attack INTEGER NOT NULL,
      defense INTEGER NOT NULL,
      speed INTEGER NOT NULL,
      is_active INTEGER DEFAULT 0,
      caught_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    );

    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id TEXT NOT NULL,
      opponent_id TEXT NOT NULL,
      winner_id TEXT,
      status TEXT DEFAULT 'pending',
      turn TEXT,
      challenger_pokemon INTEGER,
      opponent_pokemon INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Banco de dados iniciado com sucesso!');
  return db;
}

function getDb() {
  if (!db) throw new Error('Banco de dados não iniciado!');
  return db;
}

// ── Treinadores ──────────────────────────────────────────────
function getTrainer(id) {
  return getDb().prepare('SELECT * FROM trainers WHERE id = ?').get(id);
}

function createTrainer(id, name) {
  return getDb()
    .prepare(`INSERT INTO trainers (id, name) VALUES (?, ?)`)
    .run(id, name);
}

function updateTrainer(id, fields) {
  const keys = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  return getDb().prepare(`UPDATE trainers SET ${keys} WHERE id = ?`).run(...values);
}

// ── Pokémon ──────────────────────────────────────────────────
function getTrainerPokemon(trainerId) {
  return getDb()
    .prepare('SELECT * FROM pokemon_collection WHERE trainer_id = ? ORDER BY id')
    .all(trainerId);
}

function getActivePokemon(trainerId) {
  return getDb()
    .prepare('SELECT * FROM pokemon_collection WHERE trainer_id = ? AND is_active = 1')
    .get(trainerId);
}

function addPokemon(trainerId, pokemon) {
  const db = getDb();
  // Se é o primeiro, define como ativo
  const count = db
    .prepare('SELECT COUNT(*) as c FROM pokemon_collection WHERE trainer_id = ?')
    .get(trainerId).c;

  return db
    .prepare(`
      INSERT INTO pokemon_collection
        (trainer_id, pokemon_id, name, level, xp, hp, max_hp, attack, defense, speed, is_active)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      trainerId,
      pokemon.id,
      pokemon.name,
      pokemon.level,
      pokemon.hp,
      pokemon.hp,
      pokemon.attack,
      pokemon.defense,
      pokemon.speed,
      count === 0 ? 1 : 0
    );
}

function updatePokemon(pokemonDbId, fields) {
  const keys = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), pokemonDbId];
  return getDb()
    .prepare(`UPDATE pokemon_collection SET ${keys} WHERE id = ?`)
    .run(...values);
}

function setPokemonActive(trainerId, pokemonDbId) {
  const db = getDb();
  db.prepare('UPDATE pokemon_collection SET is_active = 0 WHERE trainer_id = ?').run(trainerId);
  db.prepare('UPDATE pokemon_collection SET is_active = 1 WHERE id = ? AND trainer_id = ?').run(
    pokemonDbId,
    trainerId
  );
}

// ── Batalhas ─────────────────────────────────────────────────
function createBattle(challengerId, opponentId, challengerPokemonId, opponentPokemonId) {
  return getDb()
    .prepare(`
      INSERT INTO battles (challenger_id, opponent_id, status, turn, challenger_pokemon, opponent_pokemon)
      VALUES (?, ?, 'active', ?, ?, ?)
    `)
    .run(challengerId, opponentId, challengerId, challengerPokemonId, opponentPokemonId);
}

function getBattle(id) {
  return getDb().prepare('SELECT * FROM battles WHERE id = ?').get(id);
}

function getActiveBattleForTrainer(trainerId) {
  return getDb()
    .prepare(`SELECT * FROM battles WHERE (challenger_id = ? OR opponent_id = ?) AND status = 'active'`)
    .get(trainerId, trainerId);
}

function updateBattle(id, fields) {
  const keys = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  return getDb().prepare(`UPDATE battles SET ${keys} WHERE id = ?`).run(...values);
}

module.exports = {
  initDatabase,
  getDb,
  getTrainer,
  createTrainer,
  updateTrainer,
  getTrainerPokemon,
  getActivePokemon,
  addPokemon,
  updatePokemon,
  setPokemonActive,
  createBattle,
  getBattle,
  getActiveBattleForTrainer,
  updateBattle,
};
