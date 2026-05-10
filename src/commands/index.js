// ═══════════════════════════════════════════════════════════
//  COMMANDS — Pokézap v2.1
// ═══════════════════════════════════════════════════════════

const db = require('../database/db');
const { getRandomWildPokemon, getStartersByRegion, buildPokemon, getPokemonById } = require('../game/pokemon');
const { calcDamage, calcCatchRate, levelUpCheck, xpGain, effectivenessMessage } = require('../game/battle');
const { setEncounter, getEncounter, updateEncounterHp, clearEncounter } = require('../game/encounters');
const { getRegion, canTravel, getRegionList, TRAVEL_COST } = require('../game/regions');
const { canEvolveByLevel, canEvolveByStone, canEvolveByHappiness, getEvolveInfo, STONES } = require('../game/evolution');
const { trackEvent, formatCompletedMissions, applyMissionRewards } = require('../game/missions');
const { hpBar, rarityEmoji, capitalize, formatTrainerStatus, formatCollection } = require('../utils/format');
const { STICKER_HELP, MIN_VIDEO_DURATION, MAX_VIDEO_DURATION } = require('../utils/sticker');

const pendingStarters = new Map();

async function handleCommand(text, senderId, chatId, isGroup) {
  const [cmd, ...args] = text.split(' ');
  const c = cmd.toLowerCase();

  switch (c) {
    case '!start':          return cmdStart(senderId, args);
    case '!escolher':       return cmdChooseStarter(senderId, args);
    case '!status':         return cmdStatus(senderId);
    case '!explorar':       return cmdExplore(senderId);
    case '!atacar':         return cmdAttack(senderId);
    case '!capturar':       return cmdCatch(senderId, args);
    case '!fugir':          return cmdFlee(senderId);
    case '!mochila':        return cmdBag(senderId);
    case '!ativar':         return cmdActivate(senderId, args);
    case '!curar':          return cmdHeal(senderId);
    case '!viajar':         return cmdTravel(senderId, args);
    case '!regioes':        return cmdRegions(senderId);
    case '!evoluir':        return cmdEvolve(senderId, args);
    case '!evolucoes':      return cmdShowEvolutions(senderId);
    case '!pedras':         return cmdStones();
    case '!loja':           return cmdShop(senderId);
    case '!comprar':        return cmdBuy(senderId, args);
    case '!batalha':        return cmdChallenge(senderId, args, chatId, isGroup);
    case '!aceitar':        return cmdAcceptBattle(senderId);
    case '!recusar':        return cmdDeclineBattle(senderId);
    case '!pvpataque':
    case '!pa':             return cmdPvpAttack(senderId);
    case '!pvpfugir':
    case '!pf':             return cmdPvpFlee(senderId);
    case '!ranking':        return cmdRanking();
    case '!missoes':        return cmdMyMissions(senderId);
    case '!missoes_disp':
    case '!md':             return cmdAvailableMissions(senderId, args);
    case '!aceitar_missao':
    case '!am':             return cmdAcceptMission(senderId, args);
    case '!figurinha':
    case '!sticker':        return STICKER_HELP;
    case '!ajuda':
    case '!help':           return cmdHelp();
    default:                return null;
  }
}

// ══════════════════════════════════════
//  INÍCIO
// ══════════════════════════════════════
async function cmdStart(id, args) {
  if (db.getTrainer(id)) return `⚠️ Você já tem uma conta! Use *!status*.`;
  const name = args.join(' ').trim();
  if (!name) return `👋 Bem-vindo!\nUse *!start [seu nome]* para iniciar.\nEx: *!start Ash*`;
  db.createTrainer(id, name);
  const starters = getStartersByRegion('kanto');
  pendingStarters.set(id, { starters });
  return (
    `🎉 *Olá, ${name}!* Bem-vindo ao mundo Pokémon!\n\n` +
    `Escolha seu parceiro inicial de Kanto:\n\n` +
    starters.map((p, i) =>
      `*${i + 1}.* ${p.emoji} *${p.name}* (${p.type.join('/')})\n` +
      `   ❤️${p.hp}  ⚔️${p.attack}  🛡️${p.defense}  💨${p.speed}`
    ).join('\n\n') +
    `\n\nResponda com *!escolher 1*, *2* ou *3*`
  );
}

async function cmdChooseStarter(id, args) {
  const trainer = db.getTrainer(id);
  if (!trainer) return '❌ Use *!start [nome]* primeiro!';
  const pending = pendingStarters.get(id);
  if (!pending) return '❌ Sem escolha pendente.';
  const n = parseInt(args[0]);
  if (!n || n < 1 || n > 3) return '❌ Use *!escolher 1*, *2* ou *3*.';
  const chosen = pending.starters[n - 1];
  db.addPokemon(id, chosen);
  pendingStarters.delete(id);
  return (
    `🎊 ${chosen.emoji} *${chosen.name}* vai ser seu parceiro!\n\n` +
    `Dicas rápidas:\n` +
    `🌿 *!explorar* — encontrar Pokémon\n` +
    `📊 *!status* — ver perfil\n` +
    `🖼️ */f* — criar figurinhas\n` +
    `❓ *!ajuda* — todos os comandos`
  );
}

// ══════════════════════════════════════
//  STATUS & MOCHILA
// ══════════════════════════════════════
async function cmdStatus(id) {
  const t = db.getTrainer(id);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const active = db.getActivePokemon(id);
  const total = db.getTrainerPokemon(id).length;
  let msg = formatTrainerStatus(t, active);
  msg += `\n📦 Pokémon: ${total}/30`;
  msg += `  |  ✅ Missões: ${db.countCompletedMissions(id)} concluídas`;
  return msg;
}

async function cmdBag(id) {
  const t = db.getTrainer(id);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const list = db.getTrainerPokemon(id);
  if (!list.length) return '📦 Mochila vazia! Use *!explorar*.';
  return `🎒 *Mochila de ${t.name}*\n━━━━━━━━━━\n` + formatCollection(list) + `\n\nTrocar ativo: *!ativar [nº]*`;
}

async function cmdActivate(id, args) {
  const list = db.getTrainerPokemon(id);
  const idx = parseInt(args[0]) - 1;
  if (isNaN(idx) || idx < 0 || idx >= list.length) return `❌ Número inválido. Você tem ${list.length} Pokémon.`;
  const p = list[idx];
  if (p.hp <= 0) return `❌ ${p.name} está desmaiado! Use *!curar* primeiro.`;
  db.setPokemonActive(id, p.id);
  return `✅ *${p.name}* Lv.${p.level} agora é seu Pokémon ativo!`;
}

// ══════════════════════════════════════
//  EXPLORAÇÃO
// ══════════════════════════════════════
async function cmdExplore(trainerId) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Sem Pokémon ativo! Use *!mochila* e *!ativar [nº]*.';
  if (active.hp <= 0) return '💔 Seu Pokémon desmaiou! Use *!curar*.';
  if (getEncounter(trainerId)) return `⚠️ Você já está em batalha!\n⚔️ *!atacar*  🎯 *!capturar*  🏃 *!fugir*`;

  const wild = getRandomWildPokemon(t.region, t.level);
  if (!wild) return '🌿 Nenhum Pokémon por aqui...';

  setEncounter(trainerId, wild);

  const completed = trackEvent(trainerId, 'explore', { region: t.region });
  applyMissionRewards(trainerId, completed);

  const region = getRegion(t.region);
  return (
    `🌿 *Explorando ${region?.name || t.region}...*\n\n` +
    `⚠️ Um Pokémon selvagem apareceu!\n\n` +
    `${wild.emoji} *${wild.name}* ${rarityEmoji(wild.rarity)} Lv.${wild.level}\n` +
    `🏷️ ${wild.type.join(' / ')}\n` +
    `❤️ ${hpBar(wild.hp, wild.hp)}\n\n` +
    `⚔️ *!atacar*  🎯 *!capturar*  🏃 *!fugir*` +
    formatCompletedMissions(completed)
  );
}

async function cmdAttack(trainerId) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Sem encontro ativo! Use *!explorar*.';
  const active = db.getActivePokemon(trainerId);
  if (!active || active.hp <= 0) return '💔 Seu Pokémon está desmaiado!';

  const activeType = (() => { try { return JSON.parse(active.type || '["Normal"]'); } catch { return ['Normal']; } })();
  const { damage: myDmg, effectiveness } = calcDamage({ ...active, type: activeType }, enc.pokemon);
  const wildHpAfter = Math.max(0, enc.pokemon.hp - myDmg);
  updateEncounterHp(trainerId, wildHpAfter);

  const { damage: wildDmg } = calcDamage(
    { level: enc.pokemon.level, attack: enc.pokemon.attack, type: enc.pokemon.type },
    active
  );
  const myHpAfter = Math.max(0, active.hp - wildDmg);
  db.updatePokemon(active.id, { hp: myHpAfter });

  const effMsg = effectivenessMessage(effectiveness);
  let msg = `⚔️ *${active.name}* atacou *${enc.pokemon.name}*!\n💥 Dano: *${myDmg}*${effMsg}\n\n`;

  if (wildHpAfter <= 0) {
    clearEncounter(trainerId);
    const xp = xpGain(enc.pokemon.level);
    const newXp = active.xp + xp;
    const lvl = levelUpCheck({ ...active, xp: newXp });
    if (lvl.leveledUp) {
      db.updatePokemon(active.id, { xp: lvl.newXp, level: lvl.newLevel });
      msg += `🏆 *${enc.pokemon.name}* foi derrotado!\n✨ +${xp} XP\n🎉 *LEVEL UP!* ${active.name} → Lv.${lvl.newLevel}!`;
      const evoCheck = canEvolveByLevel({ ...active, level: lvl.newLevel, pokemon_id: active.pokemon_id });
      if (evoCheck) msg += `\n💡 *${active.name}* pode evoluir! Use *!evoluir*`;
    } else {
      db.updatePokemon(active.id, { xp: newXp });
      msg += `🏆 *${enc.pokemon.name}* foi derrotado! ✨ +${xp} XP`;
    }
    const comp = trackEvent(trainerId, 'defeat');
    applyMissionRewards(trainerId, comp);
    msg += formatCompletedMissions(comp);
  } else {
    msg += `${enc.pokemon.emoji} *${enc.pokemon.name}* contra-atacou! 💥 Dano: *${wildDmg}*\n\n`;
    if (myHpAfter <= 0) {
      clearEncounter(trainerId);
      msg += `💔 *${active.name}* desmaiou!\nUse *!curar* para recuperá-lo.`;
    } else {
      msg += `Seu: ❤️ ${hpBar(myHpAfter, active.max_hp)}\n`;
      msg += `${enc.pokemon.name}: ❤️ ${hpBar(wildHpAfter, enc.pokemon.max_hp)}\n\n`;
      msg += `⚔️ *!atacar*  🎯 *!capturar*  🏃 *!fugir*`;
    }
  }
  return msg;
}

async function cmdCatch(trainerId, args) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Sem Pokémon selvagem! Use *!explorar*.';
  const t = db.getTrainer(trainerId);
  const ballType = args[0]?.toLowerCase() || 'pokebola';
  const ballMap = {
    pokebola: { field: 'pokeballs',   mult: 1,   emoji: '🔴' },
    great:    { field: 'great_balls', mult: 1.5, emoji: '🔵' },
    ultra:    { field: 'ultra_balls', mult: 2,   emoji: '⚫' },
  };
  const ball = ballMap[ballType] || ballMap.pokebola;
  if (t[ball.field] <= 0) return `❌ Sem ${ballType}! Use *!loja* para comprar.`;
  db.updateTrainer(trainerId, { [ball.field]: t[ball.field] - 1 });

  const rate = calcCatchRate(enc.pokemon, ball.mult);
  if (Math.random() < rate) {
    if (db.getTrainerPokemon(trainerId).length >= 30) {
      clearEncounter(trainerId);
      return `❌ Mochila cheia (máx 30)!`;
    }
    db.addPokemon(trainerId, enc.pokemon);
    clearEncounter(trainerId);
    const comp = trackEvent(trainerId, 'capture', { rarity: enc.pokemon.rarity });
    applyMissionRewards(trainerId, comp);
    return (
      `${ball.emoji} Você jogou uma ${ballType}...\n\n` +
      `🎊 *${enc.pokemon.emoji} ${enc.pokemon.name} foi capturado!*\n` +
      `${rarityEmoji(enc.pokemon.rarity)} ${enc.pokemon.rarity}` +
      formatCompletedMissions(comp)
    );
  }
  return (
    `${ball.emoji} Você jogou uma ${ballType}...\n\n` +
    `💨 *${enc.pokemon.name}* escapou! (${Math.round(rate * 100)}% chance)\n\n` +
    `❤️ ${hpBar(enc.pokemon.hp, enc.pokemon.max_hp)}\n\n` +
    `⚔️ *!atacar*  🎯 *!capturar*  🏃 *!fugir*`
  );
}

async function cmdFlee(trainerId) {
  const enc = getEncounter(trainerId);
  if (!enc) return '❌ Não está em batalha!';
  clearEncounter(trainerId);
  return `🏃 Você fugiu de *${enc.pokemon.name}*!`;
}

// ══════════════════════════════════════
//  CURA & LOJA
// ══════════════════════════════════════
async function cmdHeal(trainerId) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  if (t.coins < 50) return `❌ Cura custa 50 moedas. Você tem ${t.coins}.`;
  const list = db.getTrainerPokemon(trainerId);
  if (!list.length) return '❌ Sem Pokémon!';
  for (const p of list) db.updatePokemon(p.id, { hp: p.max_hp });
  db.updateTrainer(trainerId, { coins: t.coins - 50 });
  return `💊 *Centro Pokémon!*\nTodos os Pokémon curados! (-50 moedas)\nSaldo: ${t.coins - 50} 💰`;
}

async function cmdShop(trainerId) {
  const t = db.getTrainer(trainerId);
  const coins = t?.coins ?? '?';
  const stoneList = Object.entries(STONES)
    .map(([name, s]) => `  ${s.emoji} Pedra ${name} — ${s.price} moedas`)
    .join('\n');
  return (
    `🏪 *Loja Pokémon*\n💰 Suas moedas: *${coins}*\n━━━━━━━━━\n` +
    `🔴 pokebola — 50\n🔵 great — 100\n⚫ ultra — 200\n` +
    `💊 pocao — 80 (cura 50 HP)\n💊 superpocao — 150 (cura total)\n\n` +
    `🪨 *Pedras Evolutivas:*\n${stoneList}\n\n` +
    `*!comprar [item] [qtd]*\nEx: *!comprar pedra_trovao 1*`
  );
}

async function cmdBuy(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const item = args[0]?.toLowerCase();
  const qty  = Math.max(1, parseInt(args[1]) || 1);

  if (item?.startsWith('pedra_')) {
    const stoneName = capitalize(item.replace('pedra_', ''));
    const stone = STONES[stoneName];
    if (!stone) return `❌ Pedra desconhecida. Veja *!pedras*.`;
    const total = stone.price * qty;
    if (t.coins < total) return `❌ Precisa de ${total} moedas. Você tem ${t.coins}.`;
    db.updateTrainer(trainerId, { coins: t.coins - total });
    return `✅ Comprado! ${stone.emoji} *${qty}x Pedra ${stoneName}* por ${total} moedas.\nUse *!evoluir pedra_${stoneName.toLowerCase()}* para evoluir.`;
  }

  const shop = {
    pokebola:   { field: 'pokeballs',   price: 50,  type: 'ball',      emoji: '🔴' },
    great:      { field: 'great_balls', price: 100, type: 'ball',      emoji: '🔵' },
    ultra:      { field: 'ultra_balls', price: 200, type: 'ball',      emoji: '⚫' },
    pocao:      { field: null,          price: 80,  type: 'pocao',     heal: 50    },
    superpocao: { field: null,          price: 150, type: 'superpocao',heal: 9999  },
  };

  const product = shop[item];
  if (!product) return `❌ Item inválido! Use *!loja* para ver os itens.`;
  const total = product.price * qty;
  if (t.coins < total) return `❌ Precisa de ${total} moedas. Você tem ${t.coins}.`;

  if (product.type === 'ball') {
    db.updateTrainer(trainerId, { coins: t.coins - total, [product.field]: t[product.field] + qty });
    return `✅ ${product.emoji} *${qty}x ${item}* por ${total} moedas. Saldo: ${t.coins - total} 💰`;
  }

  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Sem Pokémon ativo!';
  const healed = Math.min(active.max_hp, active.hp + product.heal * qty) - active.hp;
  const newHp  = active.hp + healed;
  db.updatePokemon(active.id, { hp: newHp });
  db.updateTrainer(trainerId, { coins: t.coins - total });
  return `💊 *${active.name}* recuperou *${healed} HP*!\n❤️ ${hpBar(newHp, active.max_hp)}\nSaldo: ${t.coins - total} 💰`;
}

// ══════════════════════════════════════
//  EVOLUÇÃO
// ══════════════════════════════════════
async function cmdEvolve(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const active = db.getActivePokemon(trainerId);
  if (!active) return '❌ Sem Pokémon ativo!';

  const stoneArg = args[0]?.toLowerCase();
  let evo = null;

  if (stoneArg?.startsWith('pedra_')) {
    const stoneName = capitalize(stoneArg.replace('pedra_', ''));
    evo = canEvolveByStone(active, stoneName);
    if (!evo) return `❌ *${active.name}* não evolui com Pedra ${stoneName}.`;
  } else {
    evo = canEvolveByLevel(active) || canEvolveByHappiness(active);
    if (!evo) {
      const info = getEvolveInfo(active.pokemon_id);
      if (info) return `❌ *${active.name}* ainda não pode evoluir.\nRequisito: ${info.description} (atual: Lv.${active.level})`;
      return `❌ *${active.name}* não tem evolução conhecida.`;
    }
  }

  const nextBase = getPokemonById(evo.into);
  if (!nextBase) return `❌ Dados da evolução não encontrados.`;

  const newPoke = buildPokemon(nextBase, active.level);
  const oldName = active.name;

  db.updatePokemon(active.id, {
    pokemon_id: newPoke.id,
    name: newPoke.name,
    max_hp: newPoke.hp,
    hp: newPoke.hp,
    attack: newPoke.attack,
    defense: newPoke.defense,
    speed: newPoke.speed,
  });

  const comp = trackEvent(trainerId, 'evolve');
  applyMissionRewards(trainerId, comp);

  return (
    `✨ *${oldName}* está evoluindo...\n\n` +
    `🌟 *${oldName}* evoluiu para *${newPoke.emoji} ${newPoke.name}*!\n\n` +
    `❤️ ${newPoke.hp}  ⚔️ ${newPoke.attack}  🛡️ ${newPoke.defense}  💨 ${newPoke.speed}` +
    formatCompletedMissions(comp)
  );
}

async function cmdShowEvolutions(trainerId) {
  const list = db.getTrainerPokemon(trainerId);
  if (!list.length) return '❌ Você não tem Pokémon!';
  const lines = list.map(p => {
    const info = getEvolveInfo(p.pokemon_id);
    if (!info) return `⭐ ${p.name} — não evolui`;
    const next = getPokemonById(info.into);
    const ready = info.method === 'level' ? p.level >= info.value : true;
    return `${ready ? '✅' : '⏳'} ${p.name} Lv.${p.level} → ${next?.name || '?'} (${info.description})`;
  });
  return `🔬 *Evoluções:*\n━━━━━━━━━━\n` + lines.join('\n');
}

async function cmdStones() {
  const lines = Object.entries(STONES).map(([n, s]) =>
    `${s.emoji} *Pedra ${n}* — ${s.price} moedas — *!comprar pedra_${n.toLowerCase()}*`
  );
  return `💎 *Pedras Evolutivas*\n━━━━━━━━━━\n` + lines.join('\n');
}

// ══════════════════════════════════════
//  VIAGEM
// ══════════════════════════════════════
async function cmdTravel(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const dest = args[0]?.toLowerCase();
  if (!dest) return cmdRegions(trainerId);
  const region = getRegion(dest);
  if (!region) return `❌ Região desconhecida. Use *!regioes*.`;
  if (t.region === dest) return `📍 Você já está em *${region.name}*!`;
  if (!canTravel(dest, t.level)) return `🔒 Precisa de Nível *${region.unlockLevel}* para ir a *${region.name}*. Você está no Nível ${t.level}.`;
  const cost = TRAVEL_COST[dest] || 0;
  if (cost > 0 && t.coins < cost) return `❌ Precisa de *${cost} moedas*. Você tem ${t.coins}.`;
  db.updateTrainer(trainerId, { region: dest, coins: t.coins - cost });
  const comp = trackEvent(trainerId, 'travel');
  applyMissionRewards(trainerId, comp);
  return (
    `${region.emoji} *Viagem para ${region.name}!*\n\n${region.description}\n\n` +
    `💰 Custo: ${cost} moedas\n\nUse *!explorar* para começar!` +
    formatCompletedMissions(comp)
  );
}

async function cmdRegions(trainerId) {
  const t = db.getTrainer(trainerId);
  const list = getRegionList();
  let msg = `🗺️ *Regiões*\n━━━━━━━━━━\n`;
  for (const r of list) {
    const locked = t && t.level < r.unlockLevel;
    const cur    = t?.region === r.key ? ' ◄ ATUAL' : '';
    const cost   = TRAVEL_COST[r.key];
    msg += `${r.emoji} *${r.name}*${cur}\n`;
    msg += locked ? `  🔒 Nível ${r.unlockLevel} necessário\n` : (cost ? `  💰 ${cost} moedas\n` : `  ✅ Disponível\n`);
  }
  msg += `\n*!viajar [região]*`;
  return msg;
}

// ══════════════════════════════════════
//  PvP
// ══════════════════════════════════════
async function cmdChallenge(challengerId, args, chatId, isGroup) {
  const challenger = db.getTrainer(challengerId);
  if (!challenger) return '❌ Use *!start [nome]* primeiro!';
  if (getEncounter(challengerId)) return '❌ Você está em batalha selvagem!';
  if (db.getActivePvpBattle(challengerId)) return '❌ Você já está em batalha PvP!';

  const tag = args[0];
  if (!tag) return `❌ Use *!batalha [número]*\nEx: *!batalha 5511999999999*`;

  const opponentId = (tag.replace('@', '').replace(/\D/g, '')) + '@s.whatsapp.net';
  const opponent   = db.getTrainer(opponentId);
  if (!opponent) return `❌ Oponente não encontrado. Ele precisa ter iniciado o jogo com *!start*.`;
  if (opponentId === challengerId) return `❌ Você não pode batalhar consigo mesmo!`;
  if (db.getActivePvpBattle(opponentId)) return `❌ *${opponent.name}* já está em batalha!`;

  const myPoke    = db.getActivePokemon(challengerId);
  const theirPoke = db.getActivePokemon(opponentId);
  if (!myPoke || myPoke.hp <= 0) return '❌ Seu Pokémon ativo está desmaiado! Use *!curar*.';
  if (!theirPoke) return `❌ *${opponent.name}* não tem Pokémon ativo.`;

  db.createPvpBattle(challengerId, challenger.name, opponentId, opponent.name,
    myPoke.id, theirPoke.id, myPoke.hp, theirPoke.hp);

  return (
    `⚔️ *${challenger.name}* desafiou *${opponent.name}*!\n\n` +
    `${myPoke.emoji || '🔴'} ${myPoke.name} Lv.${myPoke.level} vs ` +
    `${theirPoke.emoji || '🔴'} ${theirPoke.name} Lv.${theirPoke.level}\n\n` +
    `*${opponent.name}*, responda:\n✅ *!aceitar*\n❌ *!recusar*`
  );
}

async function cmdAcceptBattle(opponentId) {
  const battle = db.getPendingPvpChallenge(opponentId);
  if (!battle) return '❌ Sem desafio pendente.';
  db.updatePvpBattle(battle.id, { status: 'active' });
  const myPoke    = db.getTrainerPokemon(opponentId).find(p => p.id === battle.opponent_pokemon_id);
  const theirPoke = db.getTrainerPokemon(battle.challenger_id).find(p => p.id === battle.challenger_pokemon_id);
  return (
    `⚔️ *BATALHA PvP INICIADA!*\n\n` +
    `🔴 *${battle.challenger_name}*: ${theirPoke?.name} Lv.${theirPoke?.level}\n` +
    `🔵 *${battle.opponent_name}*: ${myPoke?.name} Lv.${myPoke?.level}\n\n` +
    `*${battle.challenger_name}*, é sua vez! Use *!pa*.`
  );
}

async function cmdDeclineBattle(opponentId) {
  const battle = db.getPendingPvpChallenge(opponentId);
  if (!battle) return '❌ Sem desafio pendente.';
  db.updatePvpBattle(battle.id, { status: 'recusada' });
  return `❌ *${battle.opponent_name}* recusou o desafio de *${battle.challenger_name}*.`;
}

async function cmdPvpAttack(trainerId) {
  const battle = db.getActivePvpBattle(trainerId);
  if (!battle) return '❌ Você não está em batalha PvP! Use *!batalha [número]*.';
  if (battle.turn_id !== trainerId) {
    const turnTrainer = db.getTrainer(battle.turn_id);
    return `⏳ Aguarde a vez de *${turnTrainer?.name}*!`;
  }

  const isChallenger  = battle.challenger_id === trainerId;
  const attackerId    = trainerId;
  const defenderId    = isChallenger ? battle.opponent_id   : battle.challenger_id;
  const myPokeId      = isChallenger ? battle.challenger_pokemon_id : battle.opponent_pokemon_id;
  const theirPokeId   = isChallenger ? battle.opponent_pokemon_id  : battle.challenger_pokemon_id;
  const myHp          = isChallenger ? battle.challenger_current_hp : battle.opponent_current_hp;
  const theirHp       = isChallenger ? battle.opponent_current_hp   : battle.challenger_current_hp;

  const attacker = db.getTrainerPokemon(attackerId).find(p => p.id === myPokeId);
  const defender = db.getTrainerPokemon(defenderId).find(p => p.id === theirPokeId);
  if (!attacker || !defender) return '❌ Erro na batalha.';

  const { damage, effectiveness } = calcDamage({ ...attacker, hp: myHp }, { ...defender, hp: theirHp });
  const effMsg   = effectivenessMessage(effectiveness);
  const newDefHp = Math.max(0, theirHp - damage);

  let msg = `⚔️ *${attacker.name}* atacou *${defender.name}*!\n💥 Dano: *${damage}*${effMsg}\n\n`;

  if (newDefHp <= 0) {
    const winner = db.getTrainer(attackerId);
    const loser  = db.getTrainer(defenderId);
    db.updatePvpBattle(battle.id, { status: 'finalizada', winner_id: attackerId });
    db.updateTrainer(attackerId, { wins: winner.wins + 1, pvp_rating: winner.pvp_rating + 25, coins: winner.coins + 200 });
    db.updateTrainer(defenderId, { losses: loser.losses + 1, pvp_rating: Math.max(100, loser.pvp_rating - 20) });
    const compWin = trackEvent(attackerId, 'pvp_win');
    applyMissionRewards(attackerId, compWin);
    msg += `💀 *${defender.name}* desmaiou!\n🏆 *${winner.name}* venceu!\n+25 ELO | +200 moedas`;
    msg += formatCompletedMissions(compWin);
  } else {
    const newChalHp = isChallenger ? myHp     : newDefHp;
    const newOppHp  = isChallenger ? newDefHp : myHp;
    db.updatePvpBattle(battle.id, { challenger_current_hp: newChalHp, opponent_current_hp: newOppHp, turn_id: defenderId });
    const defTrainer = db.getTrainer(defenderId);
    msg += `${attacker.name} ❤️ ${hpBar(myHp, attacker.max_hp)}\n`;
    msg += `${defender.name} ❤️ ${hpBar(newDefHp, defender.max_hp)}\n\n`;
    msg += `Vez de *${defTrainer?.name}*! Use *!pa*.`;
  }
  return msg;
}

async function cmdPvpFlee(trainerId) {
  const battle = db.getActivePvpBattle(trainerId);
  if (!battle) return '❌ Você não está em batalha PvP.';
  const oppId = trainerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id;
  db.updatePvpBattle(battle.id, { status: 'finalizada', winner_id: oppId });
  db.updateTrainer(trainerId, { losses: (db.getTrainer(trainerId).losses || 0) + 1 });
  return `🏃 Você fugiu da batalha PvP e perdeu o confronto!`;
}

async function cmdRanking() {
  const top = db.getPvpRanking(10);
  if (!top.length) return '📊 Nenhum treinador no ranking ainda.';
  const lines = top.map((t, i) =>
    `${['🥇','🥈','🥉'][i] || `${i + 1}.`} *${t.name}* — ${t.pvp_rating} ELO (${t.wins}V/${t.losses}D)`
  );
  return `🏆 *Ranking PvP*\n━━━━━━━━━━\n` + lines.join('\n');
}

// ══════════════════════════════════════
//  MISSÕES
// ══════════════════════════════════════
async function cmdMyMissions(trainerId) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const missions = db.getTrainerMissions(trainerId);
  if (!missions.length) return `📋 Sem missões ativas!\nUse *!md* para ver missões disponíveis.`;
  const emoji = { facil: '🟢', medio: '🟡', dificil: '🔴' };
  return (
    `📋 *Suas Missões Ativas*\n━━━━━━━━━━\n` +
    missions.map(m => {
      const pct = Math.round(m.progress / m.target_value * 10);
      const bar = `[${'█'.repeat(pct)}${'░'.repeat(10 - pct)}]`;
      return `${emoji[m.difficulty] || '⚪'} *${m.title}*\n  ${m.description}\n  ${m.progress}/${m.target_value} ${bar}`;
    }).join('\n\n')
  );
}

async function cmdAvailableMissions(trainerId, args) {
  const diff    = args[0]?.toLowerCase();
  const all     = db.getMissionTemplates(diff || null);
  const active  = db.getTrainerMissions(trainerId).map(m => m.mission_id);
  const list    = all.filter(m => !active.includes(m.id));
  if (!list.length) return '❌ Nenhuma missão disponível. Conclua suas missões atuais!';
  const emoji = { facil: '🟢', medio: '🟡', dificil: '🔴' };
  return (
    `📋 *Missões Disponíveis*${diff ? ` (${diff})` : ''}\n━━━━━━━━━━\n` +
    list.map(m =>
      `${emoji[m.difficulty]} *[${m.id}]* ${m.title}\n  ${m.description}\n  💰${m.reward_coins} ✨${m.reward_xp} XP`
    ).join('\n\n') +
    `\n\n🔍 Filtrar: *!md facil* | *!md medio* | *!md dificil*\n✅ Aceitar: *!am [ID]*`
  );
}

async function cmdAcceptMission(trainerId, args) {
  const t = db.getTrainer(trainerId);
  if (!t) return '❌ Use *!start [nome]* primeiro!';
  const missionId = parseInt(args[0]);
  if (!missionId) return '❌ Use *!am [ID da missão]*. Veja *!md*.';
  const mission = db.getMissionTemplate(missionId);
  if (!mission) return `❌ Missão #${missionId} não encontrada.`;
  const active = db.getTrainerMissions(trainerId);
  if (active.length >= 5) return '❌ Você já tem 5 missões ativas! Conclua algumas primeiro.';
  if (active.find(m => m.mission_id === missionId)) return '❌ Você já tem esta missão ativa.';
  db.acceptMission(trainerId, missionId);
  const emoji = { facil: '🟢', medio: '🟡', dificil: '🔴' };
  let rewards = `💰 +${mission.reward_coins} moedas  ✨ +${mission.reward_xp} XP`;
  if (mission.reward_pokeballs > 0)   rewards += `  🔴 +${mission.reward_pokeballs}`;
  if (mission.reward_great_balls > 0) rewards += `  🔵 +${mission.reward_great_balls}`;
  if (mission.reward_ultra_balls > 0) rewards += `  ⚫ +${mission.reward_ultra_balls}`;
  return (
    `✅ *Missão aceita!*\n${emoji[mission.difficulty]} *${mission.title}*\n` +
    `📝 ${mission.description}\n\n🎁 Recompensas:\n${rewards}\n\n` +
    `Acompanhe com *!missoes*`
  );
}

// ══════════════════════════════════════
//  AJUDA
// ══════════════════════════════════════
function cmdHelp() {
  return (
    `🎮 *Pokémon WhatsApp RPG v2*\n━━━━━━━━━━\n\n` +

    `*📋 INÍCIO*\n` +
    `!start [nome] — Criar treinador\n` +
    `!escolher [1-3] — Escolher starter\n` +
    `!status — Ver perfil\n\n` +

    `*🌿 EXPLORAÇÃO*\n` +
    `!explorar — Encontrar Pokémon\n` +
    `!atacar — Atacar selvagem\n` +
    `!capturar [pokebola/great/ultra]\n` +
    `!fugir — Escapar\n\n` +

    `*🎒 TIME*\n` +
    `!mochila — Ver Pokémon\n` +
    `!ativar [nº] — Trocar ativo\n` +
    `!curar — Curar todos (50 💰)\n` +
    `!evolucoes — Ver evoluções\n` +
    `!evoluir [pedra?] — Evoluir\n\n` +

    `*🗺️ REGIÕES*\n` +
    `!regioes — Ver regiões\n` +
    `!viajar [kanto/johto/hoenn/sinnoh]\n\n` +

    `*⚔️ PvP*\n` +
    `!batalha [número] — Desafiar\n` +
    `!aceitar / !recusar — Responder\n` +
    `!pa — Atacar no PvP\n` +
    `!pf — Fugir do PvP\n` +
    `!ranking — Top 10\n\n` +

    `*📋 MISSÕES*\n` +
    `!missoes — Minhas missões\n` +
    `!md [dificuldade] — Disponíveis\n` +
    `!am [ID] — Aceitar missão\n\n` +

    `*🏪 LOJA*\n` +
    `!loja — Ver itens\n` +
    `!comprar [item] [qtd]\n` +
    `!pedras — Pedras evolutivas\n\n` +

    `*🖼️ FIGURINHAS*\n` +
    `*/f* — Figurinha 512×512 (estica a imagem)\n` +
    `*/f 2* — Figurinha no formato original\n` +
    `_Envie ou responda uma foto, vídeo\n` +
    `ou GIF com /f. Vídeos: ${MIN_VIDEO_DURATION}s–${MAX_VIDEO_DURATION}s._\n` +
    `!figurinha — Ajuda detalhada`
  );
}

module.exports = { handleCommand };