const { startBot } = require('./bot');
const { initDatabase } = require('./database/db');

async function main() {
  console.log('🎮 Iniciando Pokémon WhatsApp RPG Bot...');
  initDatabase();
  await startBot();
}

main().catch(console.error);
