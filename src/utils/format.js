// ═══════════════════════════════════════════════
//  FORMAT UTILITIES
// ═══════════════════════════════════════════════

/**
 * Barra de HP visual..
 */
function hpBar(current, max, size = 10) {
  const ratio  = Math.max(0, Math.min(1, current / Math.max(1, max)));
  const filled = Math.round(ratio * size);
  return `[${'█'.repeat(filled)}${'░'.repeat(size - filled)}] ${current}/${max}`;
}

/**
 * Emoji de raridade.
 */
function rarityEmoji(rarity) {
  const map = {
    comum:    '⚪',
    incomum:  '🟢',
    raro:     '🔵',
    épico:    '🟣',
    lendário: '🟡',
    mítico:   '🔴',
  };
  return map[rarity] || '⚪';
}

/**
 * Capitaliza a primeira letra.
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formata o status do treinador.
 */
function formatTrainerStatus(trainer, activePoke) {
  let msg = `╔══ 🎮 TREINADOR ══╗\n`;
  msg += `👤 *${trainer.name}*  |  📍 ${capitalize(trainer.region)}\n`;
  msg += `⭐ Nível ${trainer.level} — ${trainer.xp}/${trainer.level * 150} XP\n`;
  msg += `🏆 ${trainer.wins}V/${trainer.losses}D  |  🏅 ${trainer.pvp_rating || 1000} ELO\n`;
  msg += `💰 ${trainer.coins} moedas  |  🔴${trainer.pokeballs} 🔵${trainer.great_balls} ⚫${trainer.ultra_balls}\n`;

  if (activePoke) {
    msg += `\n⚔️ Ativo: ${activePoke.emoji || '🔴'} ${activePoke.name} Lv.${activePoke.level}\n`;
    msg += `❤️ ${hpBar(activePoke.hp, activePoke.max_hp)}`;
  }

  return msg;
}

/**
 * Formata a lista de Pokémon da mochila.
 */
function formatCollection(list) {
  return list.map((p, i) => {
    const typeStr = (() => {
      try {
        const t = typeof p.type === 'string' ? JSON.parse(p.type) : p.type;
        return Array.isArray(t) ? t.join('/') : String(t);
      } catch { return '?'; }
    })();
    return `${i + 1}. ${p.emoji || '🔴'} *${p.name}* Lv.${p.level}  ❤️${p.hp}/${p.max_hp}  [${typeStr}]${p.is_active ? ' ◄ ATIVO' : ''}`;
  }).join('\n');
}

module.exports = { hpBar, rarityEmoji, capitalize, formatTrainerStatus, formatCollection };