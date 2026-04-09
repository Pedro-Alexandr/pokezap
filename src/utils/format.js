function hpBar(current, max, size = 10) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * size);
  const bar = '█'.repeat(filled) + '░'.repeat(size - filled);
  const percent = Math.round(ratio * 100);
  return `[${bar}] ${current}/${max} (${percent}%)`;
}

function rarityEmoji(rarity) {
  const map = { comum: '⚪', incomum: '🟢', raro: '🔵', épico: '🟣', lendário: '🟡', mítico: '🔴' };
  return map[rarity] || '⚪';
}

function formatTrainerStatus(trainer, pokemon) {
  const lvlBar = `Nível ${trainer.level} (${trainer.xp} XP / ${trainer.level * 150} XP)`;
  let msg = `╔══ 🎮 TREINADOR ══╗\n`;
  msg += `👤 ${trainer.name}\n`;
  msg += `📍 Região: ${capitalize(trainer.region)}\n`;
  msg += `⭐ ${lvlBar}\n`;
  msg += `🏆 Vitórias: ${trainer.wins} | Derrotas: ${trainer.losses}\n`;
  msg += `💰 Moedas: ${trainer.coins}\n`;
  msg += `🎒 Pokéballs: ${trainer.pokeballs} | Great: ${trainer.great_balls} | Ultra: ${trainer.ultra_balls}\n`;
  if (pokemon) {
    msg += `\n⚔️ Pokémon Ativo:\n`;
    msg += `${pokemon.emoji || '🔴'} ${pokemon.name} Lv.${pokemon.level}\n`;
    msg += `❤️ ${hpBar(pokemon.hp, pokemon.max_hp)}\n`;
  }
  return msg;
}

function formatPokemonInfo(p) {
  const types = (p.type || []).join(' / ');
  return (
    `${p.emoji || '🔴'} *${p.name}* (Lv.${p.level})\n` +
    `🏷️ Tipo: ${types}\n` +
    `❤️ HP: ${hpBar(p.hp, p.max_hp)}\n` +
    `⚔️ Atk: ${p.attack} | 🛡️ Def: ${p.defense} | 💨 Vel: ${p.speed}`
  );
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatCollection(pokemonList) {
  if (!pokemonList.length) return '📦 Sua mochila está vazia!';
  return pokemonList
    .map((p, i) => {
      const active = p.is_active ? ' ◄ ATIVO' : '';
      return `${i + 1}. ${p.name} Lv.${p.level}${active}`;
    })
    .join('\n');
}

module.exports = { hpBar, rarityEmoji, formatTrainerStatus, formatPokemonInfo, capitalize, formatCollection };
