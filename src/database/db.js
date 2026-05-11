const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/game.db');
let db;

// ── Missões padrão para seed ──────────────────────────────
const DEFAULT_MISSIONS = [
  // Fáceis
  { title: 'Primeiros Passos',      description: 'Explore 5 vezes',              type: 'explore',        target_value: 5,   difficulty: 'facil',   reward_coins: 50,  reward_xp: 100, reward_pokeballs: 2, reward_great_balls: 0, reward_ultra_balls: 0, target_rarity: null, target_region: null },
  { title: 'Caçador Iniciante',     description: 'Capture 3 Pokémon',            type: 'capture',        target_value: 3,   difficulty: 'facil',   reward_coins: 80,  reward_xp: 150, reward_pokeballs: 3, reward_great_balls: 0, reward_ultra_balls: 0, target_rarity: null, target_region: null },
  { title: 'Força Bruta',           description: 'Derrote 5 Pokémon selvagens',  type: 'defeat',         target_value: 5,   difficulty: 'facil',   reward_coins: 60,  reward_xp: 120, reward_pokeballs: 1, reward_great_balls: 1, reward_ultra_balls: 0, target_rarity: null, target_region: null },
  { title: 'Viajante',              description: 'Viaje para outra região',       type: 'travel',         target_value: 1,   difficulty: 'facil',   reward_coins: 100, reward_xp: 200, reward_pokeballs: 2, reward_great_balls: 0, reward_ultra_balls: 0, target_rarity: null, target_region: null },
  // Médias
  { title: 'Explorador de Kanto',   description: 'Explore 20 vezes em Kanto',    type: 'explore',        target_value: 20,  difficulty: 'medio',   reward_coins: 200, reward_xp: 400, reward_pokeballs: 0, reward_great_balls: 3, reward_ultra_balls: 0, target_rarity: null, target_region: 'kanto' },
  { title: 'Colecionador',          description: 'Capture 10 Pokémon',           type: 'capture',        target_value: 10,  difficulty: 'medio',   reward_coins: 250, reward_xp: 500, reward_pokeballs: 0, reward_great_balls: 5, reward_ultra_balls: 0, target_rarity: null, target_region: null },
  { title: 'Caça Rara',             description: 'Capture 1 Pokémon Raro',       type: 'capture_rarity', target_value: 1,   difficulty: 'medio',   reward_coins: 300, reward_xp: 600, reward_pokeballs: 0, reward_great_balls: 3, reward_ultra_balls: 1, target_rarity: 'raro', target_region: null },
  { title: 'Evolucionista',         description: 'Evolua 3 Pokémon',             type: 'evolve',         target_value: 3,   difficulty: 'medio',   reward_coins: 350, reward_xp: 700, reward_pokeballs: 0, reward_great_balls: 2, reward_ultra_balls: 1, target_rarity: null, target_region: null },
  { title: 'Lutador',               description: 'Vença 10 batalhas selvagens',  type: 'defeat',         target_value: 10,  difficulty: 'medio',   reward_coins: 200, reward_xp: 450, reward_pokeballs: 0, reward_great_balls: 4, reward_ultra_balls: 0, target_rarity: null, target_region: null },
  { title: 'Explorador de Johto',   description: 'Explore 20 vezes em Johto',    type: 'explore',        target_value: 20,  difficulty: 'medio',   reward_coins: 250, reward_xp: 500, reward_pokeballs: 0, reward_great_balls: 3, reward_ultra_balls: 1, target_rarity: null, target_region: 'johto' },
  // Difíceis
  { title: 'Mestre Capturador',     description: 'Capture 30 Pokémon',           type: 'capture',        target_value: 30,  difficulty: 'dificil', reward_coins: 800, reward_xp: 1500, reward_pokeballs: 0, reward_great_balls: 0, reward_ultra_balls: 5, target_rarity: null, target_region: null },
  { title: 'Caça Épica',            description: 'Capture 1 Pokémon Épico',      type: 'capture_rarity', target_value: 1,   difficulty: 'dificil', reward_coins: 600, reward_xp: 1200, reward_pokeballs: 0, reward_great_balls: 0, reward_ultra_balls: 3, target_rarity: 'épico', target_region: null },
  { title: 'Caça Lendária',         description: 'Capture 1 Pokémon Lendário',   type: 'capture_rarity', target_value: 1,   difficulty: 'dificil', reward_coins: 1000, reward_xp: 2000, reward_pokeballs: 0, reward_great_balls: 0, reward_ultra_balls: 5, target_rarity: 'lendário', target_region: null },
  { title: 'Campeão PvP',           description: 'Vença 5 batalhas PvP',         type: 'pvp_win',        target_value: 5,   difficulty: 'dificil', reward_coins: 1000, reward_xp: 2000, reward_pokeballs: 0, reward_great_balls: 5, reward_ultra_balls: 5, target_rarity: null, target_region: null },
  { title: 'Explorador de Hoenn',   description: 'Explore 30 vezes em Hoenn',    type: 'explore',        target_value: 30,  difficulty: 'dificil', reward_coins: 700, reward_xp: 1400, reward_pokeballs: 0, reward_great_balls: 3, reward_ultra_balls: 3, target_rarity: null, target_region: 'hoenn' },
  { title: 'Explorador de Sinnoh',  description: 'Explore 30 vezes em Sinnoh',   type: 'explore',        target_value: 30,  difficulty: 'dificil', reward_coins: 700, reward_xp: 1400, reward_pokeballs: 0, reward_great_balls: 3, reward_ultra_balls: 3, target_rarity: null, target_region: 'sinnoh' },
  { title: 'Guerreiro',             description: 'Derrote 50 Pokémon selvagens', type: 'defeat',         target_value: 50,  difficulty: 'dificil', reward_coins: 900, reward_xp: 1800, reward_pokeballs: 0, reward_great_balls: 5, reward_ultra_balls: 5, target_rarity: null, target_region: null },
];

function initDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // ── Treinadores ───────────────────────────────────────
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
      pvp_rating INTEGER DEFAULT 1000,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migração: adicionar pvp_rating se não existir
  try {
    db.exec(`ALTER TABLE trainers ADD COLUMN pvp_rating INTEGER DEFAULT 1000;`);
  } catch (_) { /* coluna já existe */ }

  // ── Coleção de Pokémon ────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS pokemon_collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id TEXT NOT NULL,
      pokemon_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT '["Normal"]',
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
  `);

  // Migração: adicionar coluna type se não existir
  try {
    db.exec(`ALTER TABLE pokemon_collection ADD COLUMN type TEXT DEFAULT '["Normal"]';`);
  } catch (_) { /* coluna já existe */ }

  // ── Batalhas PvP ─────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS pvp_battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id TEXT NOT NULL,
      challenger_name TEXT NOT NULL,
      opponent_id TEXT NOT NULL,
      opponent_name TEXT NOT NULL,
      challenger_pokemon_id INTEGER,
      opponent_pokemon_id INTEGER,
      challenger_current_hp INTEGER DEFAULT 0,
      opponent_current_hp INTEGER DEFAULT 0,
      turn_id TEXT,
      winner_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── Templates de missões ──────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS mission_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      target_value INTEGER DEFAULT 1,
      target_rarity TEXT,
      target_region TEXT,
      difficulty TEXT DEFAULT 'facil',
      reward_coins INTEGER DEFAULT 50,
      reward_xp INTEGER DEFAULT 100,
      reward_pokeballs INTEGER DEFAULT 0,
      reward_great_balls INTEGER DEFAULT 0,
      reward_ultra_balls INTEGER DEFAULT 0
    );
  `);

  // ── Missões dos treinadores ───────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS trainer_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id TEXT NOT NULL,
      mission_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ativa',
      accepted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (trainer_id) REFERENCES trainers(id),
      FOREIGN KEY (mission_id) REFERENCES mission_templates(id)
    );
  `);

  // Seed de missões (só insere se tabela estiver vazia)
  const missionCount = db.prepare('SELECT COUNT(*) as c FROM mission_templates').get().c;
  if (missionCount === 0) {
    const insert = db.prepare(`
      INSERT INTO mission_templates
        (title, description, type, target_value, target_rarity, target_region, difficulty,
         reward_coins, reward_xp, reward_pokeballs, reward_great_balls, reward_ultra_balls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((missions) => {
      for (const m of missions) {
        insert.run(m.title, m.description, m.type, m.target_value, m.target_rarity,
          m.target_region, m.difficulty, m.reward_coins, m.reward_xp,
          m.reward_pokeballs, m.reward_great_balls, m.reward_ultra_balls);
      }
    });
    insertMany(DEFAULT_MISSIONS);
    console.log(`✅ ${DEFAULT_MISSIONS.length} missões padrão carregadas.`);
  }

  console.log('✅ Banco de dados iniciado com sucesso!');
  return db;
}

function getDb() {
  if (!db) throw new Error('Banco de dados não iniciado!');
  return db;
}

// ════════════════════════════════════════
//  TREINADORES
// ════════════════════════════════════════
function getTrainer(id) {
  return getDb().prepare('SELECT * FROM trainers WHERE id = ?').get(id);
}

function createTrainer(id, name) {
  return getDb()
    .prepare(`INSERT INTO trainers (id, name, pvp_rating) VALUES (?, ?, 1000)`)
    .run(id, name);
}

function updateTrainer(id, fields) {
  const keys = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  return getDb().prepare(`UPDATE trainers SET ${keys} WHERE id = ?`).run(...values);
}

// ════════════════════════════════════════
//  POKÉMON
// ════════════════════════════════════════
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
  const database = getDb();
  const count = database
    .prepare('SELECT COUNT(*) as c FROM pokemon_collection WHERE trainer_id = ?')
    .get(trainerId).c;

  const typeStr = Array.isArray(pokemon.type)
    ? JSON.stringify(pokemon.type)
    : (pokemon.type || '["Normal"]');

  return database
    .prepare(`
      INSERT INTO pokemon_collection
        (trainer_id, pokemon_id, name, type, level, xp, hp, max_hp, attack, defense, speed, is_active)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      trainerId,
      pokemon.id,
      pokemon.name,
      typeStr,
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
  const database = getDb();
  database.prepare('UPDATE pokemon_collection SET is_active = 0 WHERE trainer_id = ?').run(trainerId);
  database.prepare('UPDATE pokemon_collection SET is_active = 1 WHERE id = ? AND trainer_id = ?').run(
    pokemonDbId,
    trainerId
  );
}

// ════════════════════════════════════════
//  BATALHAS PvP
// ════════════════════════════════════════
function createPvpBattle(challengerId, challengerName, opponentId, opponentName,
  challengerPokeId, opponentPokeId, challengerHp, opponentHp) {
  return getDb()
    .prepare(`
      INSERT INTO pvp_battles
        (challenger_id, challenger_name, opponent_id, opponent_name,
         challenger_pokemon_id, opponent_pokemon_id,
         challenger_current_hp, opponent_current_hp, turn_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `)
    .run(challengerId, challengerName, opponentId, opponentName,
      challengerPokeId, opponentPokeId, challengerHp, opponentHp, challengerId);
}

function getActivePvpBattle(trainerId) {
  return getDb()
    .prepare(`
      SELECT * FROM pvp_battles
      WHERE (challenger_id = ? OR opponent_id = ?)
        AND status IN ('pending', 'active')
    `)
    .get(trainerId, trainerId);
}

function getPendingPvpChallenge(opponentId) {
  return getDb()
    .prepare(`
      SELECT * FROM pvp_battles
      WHERE opponent_id = ? AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(opponentId);
}

function updatePvpBattle(id, fields) {
  const keys = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  return getDb().prepare(`UPDATE pvp_battles SET ${keys} WHERE id = ?`).run(...values);
}

function getPvpRanking(limit = 10) {
  return getDb()
    .prepare(`
      SELECT name, pvp_rating, wins, losses
      FROM trainers
      ORDER BY pvp_rating DESC
      LIMIT ?
    `)
    .all(limit);
}

// ════════════════════════════════════════
//  MISSÕES
// ════════════════════════════════════════
function getTrainerMissions(trainerId) {
  return getDb()
    .prepare(`
      SELECT tm.*, mt.title, mt.description, mt.type, mt.target_value,
             mt.target_rarity, mt.target_region, mt.difficulty,
             mt.reward_coins, mt.reward_xp, mt.reward_pokeballs,
             mt.reward_great_balls, mt.reward_ultra_balls,
             tm.id as id, mt.id as mission_id
      FROM trainer_missions tm
      JOIN mission_templates mt ON tm.mission_id = mt.id
      WHERE tm.trainer_id = ? AND tm.status = 'ativa'
      ORDER BY tm.accepted_at DESC
    `)
    .all(trainerId);
}

function countCompletedMissions(trainerId) {
  return getDb()
    .prepare(`SELECT COUNT(*) as c FROM trainer_missions WHERE trainer_id = ? AND status = 'concluida'`)
    .get(trainerId)?.c || 0;
}

function getMissionTemplates(difficulty = null) {
  if (difficulty) {
    return getDb()
      .prepare('SELECT * FROM mission_templates WHERE difficulty = ? ORDER BY id')
      .all(difficulty);
  }
  return getDb().prepare('SELECT * FROM mission_templates ORDER BY difficulty, id').all();
}

function getMissionTemplate(id) {
  return getDb().prepare('SELECT * FROM mission_templates WHERE id = ?').get(id);
}

function acceptMission(trainerId, missionId) {
  return getDb()
    .prepare(`INSERT INTO trainer_missions (trainer_id, mission_id) VALUES (?, ?)`)
    .run(trainerId, missionId);
}

function updateMissionProgress(id, progress, status) {
  const fields = { progress, status };
  if (status === 'concluida') fields.completed_at = new Date().toISOString();
  const keys = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(fields), id];
  return getDb().prepare(`UPDATE trainer_missions SET ${keys} WHERE id = ?`).run(...values);
}

module.exports = {
  initDatabase,
  getDb,
  // Treinadores
  getTrainer,
  createTrainer,
  updateTrainer,
  // Pokémon
  getTrainerPokemon,
  getActivePokemon,
  addPokemon,
  updatePokemon,
  setPokemonActive,
  // PvP
  createPvpBattle,
  getActivePvpBattle,
  getPendingPvpChallenge,
  updatePvpBattle,
  getPvpRanking,
  // Missões
  getTrainerMissions,
  countCompletedMissions,
  getMissionTemplates,
  getMissionTemplate,
  acceptMission,
  updateMissionProgress,
};