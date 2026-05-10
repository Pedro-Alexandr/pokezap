const db = require('../database/db');

/**
 * Registra um evento de jogo e atualiza o progresso das missões ativas.
 * @param {string} trainerId
 * @param {string} eventType - 'capture'|'capture_rarity'|'defeat'|'explore'|'pvp_win'|'evolve'|'travel'|'spend'
 * @param {object} data - Dados extras (ex: { rarity, region, amount })
 * @returns {Array} Missões concluídas neste evento
 */
function trackEvent(trainerId, eventType, data = {}) {
  const missions = db.getTrainerMissions(trainerId);
  const completed = [];

  for (const m of missions) {
    let newProgress = m.progress;
    let progressed  = false;

    switch (m.type) {
      case 'capture':
        if (eventType === 'capture') { newProgress++; progressed = true; }
        break;
      case 'capture_rarity':
        if (eventType === 'capture' && data.rarity === m.target_rarity) { newProgress++; progressed = true; }
        break;
      case 'defeat':
        if (eventType === 'defeat') { newProgress++; progressed = true; }
        break;
      case 'explore':
        if (eventType === 'explore' && (!m.target_region || data.region === m.target_region)) {
          newProgress++;
          progressed = true;
        }
        break;
      case 'pvp_win':
        if (eventType === 'pvp_win') { newProgress++; progressed = true; }
        break;
      case 'evolve':
        if (eventType === 'evolve') { newProgress++; progressed = true; }
        break;
      case 'travel':
        if (eventType === 'travel') { newProgress++; progressed = true; }
        break;
      case 'spend':
        if (eventType === 'spend') { newProgress += data.amount || 0; progressed = true; }
        break;
    }

    if (progressed) {
      const done = newProgress >= m.target_value;
      db.updateMissionProgress(m.id, newProgress, done ? 'concluida' : 'ativa');
      if (done) completed.push(m);
    }
  }

  return completed;
}

/**
 * Formata as missões concluídas para exibição.
 */
function formatCompletedMissions(missions) {
  if (!missions.length) return '';
  return missions.map(m => {
    let r = `💰 +${m.reward_coins}  ✨ +${m.reward_xp} XP`;
    if (m.reward_pokeballs   > 0) r += `  🔴 +${m.reward_pokeballs}`;
    if (m.reward_great_balls > 0) r += `  🔵 +${m.reward_great_balls}`;
    if (m.reward_ultra_balls > 0) r += `  ⚫ +${m.reward_ultra_balls}`;
    return `\n\n🎊 *MISSÃO CONCLUÍDA!*\n${m.title}\n${r}`;
  }).join('');
}

/**
 * Aplica recompensas das missões concluídas ao treinador.
 */
function applyMissionRewards(trainerId, missions) {
  if (!missions.length) return;
  const t = db.getTrainer(trainerId);
  if (!t) return;

  let coins = 0, xp = 0, pb = 0, gb = 0, ub = 0;
  for (const m of missions) {
    coins += m.reward_coins       || 0;
    xp    += m.reward_xp         || 0;
    pb    += m.reward_pokeballs   || 0;
    gb    += m.reward_great_balls || 0;
    ub    += m.reward_ultra_balls || 0;
  }

  const newXp   = t.xp + xp;
  const lvlXp   = t.level * 150;
  const leveled = newXp >= lvlXp;

  db.updateTrainer(trainerId, {
    coins:        t.coins + coins,
    xp:           leveled ? newXp - lvlXp : newXp,
    level:        leveled ? t.level + 1 : t.level,
    pokeballs:    t.pokeballs  + pb,
    great_balls:  t.great_balls + gb,
    ultra_balls:  t.ultra_balls + ub,
  });
}

module.exports = { trackEvent, formatCompletedMissions, applyMissionRewards };