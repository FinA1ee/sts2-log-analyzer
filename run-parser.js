/**
 * run-parser.js - STS2 .run File Parser (v2 — correct schema)
 *
 * Parses .run files from:
 *   ~/Library/Application Support/SlayTheSpire2/steam/<uid>/profile1/saves/history/
 *
 * IMPORTANT schema discoveries (v0.99.1, schema_version 8):
 *   - map_point_history is a LIST OF LISTS: one sub-array per Act visited
 *   - map_point_types: 'ancient','monster','elite','boss','rest_site','shop','treasure','unknown'
 *   - 'ancient' = the opening Neow relic choice (ancient_choice field)
 *   - 'unknown' = random event room (has event_choices + sometimes relic_choices)
 *   - 'shop' has:  bought_relics, card_choices (shown), cards_gained (purchased), relic_choices
 *   - 'treasure' has: relic_choices, upgraded_cards (Treasure chest upgrades)
 *   - 'rest_site' has: rest_site_choices ('SMITH'|'REST'|'RECALL'), upgraded_cards
 *   - player_stats.potion_used = array of potion IDs used during combat
 *   - player_stats.ancient_choice = starting relic picks [{ TextKey, was_chosen }]
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ─── Paths ────────────────────────────────────────────────────────────────────

const STEAM_ID = process.env.STEAM_ID || '76561199098125055';
const PROFILE  = process.env.PROFILE  || 'profile1';

const RUN_HISTORY_DIR = path.join(
  os.homedir(),
  'Library/Application Support/SlayTheSpire2/steam',
  STEAM_ID,
  PROFILE,
  'saves/history'
);

// ─── File discovery ───────────────────────────────────────────────────────────

function findRunFiles(daysBack = 7) {
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return fs.readdirSync(RUN_HISTORY_DIR)
    .filter(f => f.endsWith('.run'))
    .map(f => {
      const fullPath = path.join(RUN_HISTORY_DIR, f);
      const stat = fs.statSync(fullPath);
      const startTime = parseInt(f.replace('.run', ''), 10);
      return { name: f, path: fullPath, startTime, mtime: stat.mtime };
    })
    .filter(f => f.mtime.getTime() >= cutoff)
    .sort((a, b) => b.startTime - a.startTime);
}

function findLatestRunFile() {
  const all = findRunFiles(365);
  return all.length > 0 ? all[0] : null;
}

// ─── Single run parser ────────────────────────────────────────────────────────

function parseRunFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const player = raw.players?.[0] || {};

  // map_point_history is List<List<MapPoint>> — one list per act
  const actArrays = raw.map_point_history || [];
  // Flatten all floors with act index attached
  const allFloors = [];
  actArrays.forEach((actFloors, actIdx) => {
    if (!Array.isArray(actFloors)) return;
    actFloors.forEach(pt => allFloors.push({ ...pt, _actIndex: actIdx }));
  });

  // ── Parse each floor ──────────────────────────────────────────────────────
  const floors = allFloors.map((pt, i) => {
    const ps   = pt.player_stats?.[0] || {};
    const room = pt.rooms?.[0] || {};
    const mpt  = pt.map_point_type;

    // Starting Neow relic choice
    const ancientChoice = (ps.ancient_choice || []).map(c => ({
      id: c.TextKey,
      picked: c.was_chosen,
    }));

    // Card choices (offered at combat reward, shop, event)
    const cardChoices = (ps.card_choices || []).map(c => ({
      id: c.card?.id,
      picked: c.was_picked,
    }));

    // Shop: relics available vs bought
    const relicChoicesRaw = ps.relic_choices || [];
    const relicChoices = relicChoicesRaw.map(r => ({ id: r.choice, picked: r.was_picked }));
    const boughtRelics = ps.bought_relics || []; // shop purchases (separate from relic_choices)

    // Potion choices (offered in combat / event)
    const potionChoices = (ps.potion_choices || []).map(p => ({
      id: p.choice,
      picked: p.was_picked,
    }));

    // Event choices (text key of chosen option)
    const eventChoices = (ps.event_choices || []).map(e => ({
      key: e.title?.key || JSON.stringify(e),
      variables: e.variables || {},
    }));

    // Upgrades (from rest site SMITH, treasure chest, event)
    const upgradedCards = ps.upgraded_cards || [];

    // Rest site
    const restAction = ps.rest_site_choices?.[0] || null;

    return {
      floor: i + 1,
      actIndex: pt._actIndex,
      mapPointType: mpt,
      roomType: room.room_type || mpt,
      encounterId: room.model_id || null,
      monsterIds: room.monster_ids || [],
      turnsTaken: room.turns_taken || 0,

      // HP
      hpBefore: null, // not directly stored; track via prev floor's hpEnd
      hpEnd: ps.current_hp ?? null,
      hpMax: ps.max_hp ?? null,
      hpLost: ps.damage_taken ?? 0,
      hpHealed: ps.hp_healed ?? 0,
      maxHpGained: ps.max_hp_gained ?? 0,
      maxHpLost: ps.max_hp_lost ?? 0,

      // Gold
      goldEnd: ps.current_gold ?? null,
      goldGained: ps.gold_gained ?? 0,
      goldSpent: ps.gold_spent ?? 0,
      goldLost: ps.gold_lost ?? 0,
      goldStolen: ps.gold_stolen ?? 0,

      // Cards
      cardChoices,
      cardsGained: (ps.cards_gained || []).map(c => c.id),
      upgradedCards,

      // Relics
      ancientChoice,        // Neow opening choice
      relicChoices,         // combat/elite/treasure/event relic reward choices
      boughtRelics,         // shop purchases

      // Potions
      potionChoices,
      potionsUsed: ps.potion_used || [],

      // Event
      eventChoices,

      // Rest
      restAction,
    };
  });

  // ── Convenience derived stats ─────────────────────────────────────────────
  const combatFloors   = floors.filter(f => ['monster','elite','boss'].includes(f.roomType));
  const eliteFloors    = floors.filter(f => f.roomType === 'elite');
  const bossFloors     = floors.filter(f => f.roomType === 'boss');
  const restFloors     = floors.filter(f => f.roomType === 'rest_site');
  const shopFloors     = floors.filter(f => f.roomType === 'shop');
  const eventFloors    = floors.filter(f => f.roomType === 'event' || f.mapPointType === 'unknown');
  const treasureFloors = floors.filter(f => f.mapPointType === 'treasure');

  const totalDmgTaken    = floors.reduce((s, f) => s + f.hpLost, 0);
  const totalHpHealed    = floors.reduce((s, f) => s + f.hpHealed, 0);
  const totalGoldGained  = floors.reduce((s, f) => s + f.goldGained, 0);
  const totalGoldSpent   = floors.reduce((s, f) => s + f.goldSpent, 0);
  const totalGoldStolen  = floors.reduce((s, f) => s + f.goldStolen, 0);
  const totalMaxHpGained = floors.reduce((s, f) => s + f.maxHpGained, 0);

  const avgTurnsPerCombat = combatFloors.length
    ? +(combatFloors.reduce((s, f) => s + f.turnsTaken, 0) / combatFloors.length).toFixed(1)
    : 0;

  // Card decisions
  const allCardChoices = floors.flatMap(f => f.cardChoices);
  const cardPickCount  = allCardChoices.filter(c => c.picked).length;
  const cardPickRate   = allCardChoices.length > 0
    ? Math.round(cardPickCount / allCardChoices.length * 100) : 0;
  const skippedCards   = allCardChoices.filter(c => !c.picked).map(c => c.id);

  // Relic decisions (combat/elite/treasure rewards — not shop)
  const allRelicChoices     = floors.flatMap(f => f.relicChoices);
  const relicsOfferedNotTaken = allRelicChoices.filter(r => !r.picked).map(r => r.id);

  // Shop
  const allBoughtRelics = floors.flatMap(f => f.boughtRelics);
  const allShopCards    = shopFloors.flatMap(f => f.cardsGained);

  // Potions used
  const allPotionsUsed = floors.flatMap(f => f.potionsUsed);

  // Upgrades breakdown
  const smithUpgrades    = restFloors.flatMap(f => f.upgradedCards);
  const treasureUpgrades = treasureFloors.flatMap(f => f.upgradedCards);
  const eventUpgrades    = eventFloors.flatMap(f => f.upgradedCards);
  const totalUpgrades    = smithUpgrades.length + treasureUpgrades.length + eventUpgrades.length;

  // Neow choice
  const neowFloor      = floors.find(f => f.mapPointType === 'ancient');
  const neowChoice     = neowFloor?.ancientChoice || [];
  const neowPicked     = neowChoice.find(c => c.picked);
  const neowNotPicked  = neowChoice.filter(c => !c.picked).map(c => c.id);

  // Rest behavior
  const smithCount = restFloors.filter(f => f.restAction === 'SMITH').length;
  const restCount  = restFloors.filter(f => f.restAction === 'REST').length;
  const recallCount = restFloors.filter(f => f.restAction === 'RECALL').length;

  // Final deck + relics
  const finalDeck = (player.deck || []).map(c => ({
    id: c.id,
    upgradeLevel: c.current_upgrade_level || 0,
    floorAdded: c.floor_added_to_deck,
    props: c.props || null,
  }));
  const relics = (player.relics || []).map(r => ({
    id: r.id,
    floorAdded: r.floor_added_to_deck,
    props: r.props || null,
  })).sort((a, b) => a.floorAdded - b.floorAdded);
  const finalPotions = (player.potions || []).map(p => p.id);

  return {
    // ── Identity ──
    fileName: path.basename(filePath),
    runId: parseInt(path.basename(filePath).replace('.run', ''), 10),
    startTime: raw.start_time,
    startDate: new Date(raw.start_time * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    runDurationSeconds: raw.run_time,
    runDurationMin: Math.round(raw.run_time / 60),
    seed: raw.seed,
    gameMode: raw.game_mode,
    ascension: raw.ascension || 0,

    // ── Outcome ──
    win: raw.win,
    wasAbandoned: raw.was_abandoned,
    killedByEncounter: raw.killed_by_encounter || null,
    killedByEvent: raw.killed_by_event !== 'NONE.NONE' ? raw.killed_by_event : null,

    // ── Character / Acts ──
    character: player.character,
    actsVisited: raw.acts || [],
    floorsReached: floors.length,
    totalActs: actArrays.length,

    // ── Opening choice (Neow / Ancient) ──
    neowPicked: neowPicked?.id || null,
    neowOptions: neowChoice.map(c => c.id),
    neowNotPicked,

    // ── Final state ──
    finalDeck,
    finalDeckSize: finalDeck.length,
    upgradedCardCount: finalDeck.filter(c => c.upgradeLevel > 0).length,
    relics,
    relicCount: relics.length,
    finalPotions,
    finalHp: floors[floors.length - 1]?.hpEnd ?? null,
    finalMaxHp: floors[floors.length - 1]?.hpMax ?? null,
    finalGold: floors[floors.length - 1]?.goldEnd ?? null,

    // ── Combat stats ──
    totalCombats: combatFloors.length,
    elitesAttempted: eliteFloors.length,
    eliteEncounters: eliteFloors.map(f => ({ id: f.encounterId, floor: f.floor, hpLost: f.hpLost, turns: f.turnsTaken })),
    bossesAttempted: bossFloors.length,
    bossEncounters: bossFloors.map(f => ({ id: f.encounterId, floor: f.floor, hpLost: f.hpLost, turns: f.turnsTaken })),
    totalDmgTaken,
    totalHpHealed,
    avgTurnsPerCombat,
    totalMaxHpGained,

    // ── Economy ──
    totalGoldGained,
    totalGoldSpent,
    totalGoldStolen,
    shopVisits: shopFloors.length,
    allBoughtRelics,       // relics purchased at shop
    allShopCards,          // cards purchased at shop

    // ── Card drafting ──
    cardPickRate,
    skippedCards,
    allCardChoices,

    // ── Relic decisions ──
    relicsOfferedNotTaken, // relics offered at rewards but not picked

    // ── Potions ──
    allPotionsUsed,
    finalPotions,

    // ── Upgrades breakdown ──
    totalUpgrades,
    smithUpgrades,
    treasureUpgrades,
    eventUpgrades,

    // ── Rest behavior ──
    smithCount,
    restCount,
    recallCount,
    totalRestSites: restFloors.length,

    // ── Room counts ──
    shopVisits: shopFloors.length,
    eventCount: eventFloors.length,
    treasureCount: treasureFloors.length,

    // ── Full floor log ──
    floors,
  };
}

// ─── Multi-run aggregator ─────────────────────────────────────────────────────

function aggregateRunFiles(fileInfos) {
  const runs = [];
  const errors = [];

  for (const f of fileInfos) {
    try { runs.push(parseRunFile(f.path)); }
    catch (err) { errors.push({ file: f.name, error: err.message }); }
  }

  if (runs.length === 0) return { runs: [], errors, stats: null };

  const wins     = runs.filter(r => r.win);
  const defeats  = runs.filter(r => !r.win && !r.wasAbandoned);
  const abandoned = runs.filter(r => r.wasAbandoned);

  // By character
  const byCharacter = {};
  for (const run of runs) {
    const c = run.character || 'UNKNOWN';
    if (!byCharacter[c]) byCharacter[c] = { runs: 0, wins: 0, totalFloors: 0, maxFloor: 0, totalDmg: 0, totalDuration: 0 };
    byCharacter[c].runs++;
    if (run.win) byCharacter[c].wins++;
    byCharacter[c].totalFloors += run.floorsReached;
    byCharacter[c].maxFloor     = Math.max(byCharacter[c].maxFloor, run.floorsReached);
    byCharacter[c].totalDmg    += run.totalDmgTaken;
    byCharacter[c].totalDuration += run.runDurationMin;
  }
  for (const c of Object.values(byCharacter)) {
    c.avgFloor      = +(c.totalFloors / c.runs).toFixed(1);
    c.winRate       = `${Math.round(c.wins / c.runs * 100)}%`;
    c.avgDmgPerRun  = +(c.totalDmg / c.runs).toFixed(0);
    c.avgDurationMin = +(c.totalDuration / c.runs).toFixed(0);
  }

  // Defeat hotspots
  const defeatMap = {};
  for (const r of defeats) {
    const loc = r.killedByEncounter || 'UNKNOWN';
    defeatMap[loc] = (defeatMap[loc] || 0) + 1;
  }

  // Relic intelligence
  const relicWins = {};
  const relicDefeats = {};
  for (const r of wins)    r.relics.forEach(rel => { relicWins[rel.id]    = (relicWins[rel.id]    || 0) + 1; });
  for (const r of defeats) r.relics.forEach(rel => { relicDefeats[rel.id] = (relicDefeats[rel.id] || 0) + 1; });

  // Most skipped cards (frequently declined)
  const skipCount = {};
  for (const run of runs) run.skippedCards.forEach(c => { skipCount[c] = (skipCount[c] || 0) + 1; });

  // Most bought shop relics
  const shopRelicCount = {};
  for (const run of runs) run.allBoughtRelics.forEach(r => { shopRelicCount[r] = (shopRelicCount[r] || 0) + 1; });

  // Neow (opening) pick stats
  const neowCount = {};
  for (const run of runs) if (run.neowPicked) neowCount[run.neowPicked] = (neowCount[run.neowPicked] || 0) + 1;

  // Rest behavior aggregate
  const totalSmith = runs.reduce((s, r) => s + r.smithCount, 0);
  const totalRest  = runs.reduce((s, r) => s + r.restCount, 0);

  // Deck stats
  const avgDeckSize  = +(runs.reduce((s, r) => s + r.finalDeckSize, 0) / runs.length).toFixed(1);
  const avgUpgrades  = +(runs.reduce((s, r) => s + r.upgradedCardCount, 0) / runs.length).toFixed(1);
  const avgRelics    = +(runs.reduce((s, r) => s + r.relicCount, 0) / runs.length).toFixed(1);

  const floorNums = runs.map(r => r.floorsReached);
  const bestRun   = [...runs].sort((a, b) => b.floorsReached - a.floorsReached)[0];
  const fastestWin = wins.length ? [...wins].sort((a, b) => a.runDurationSeconds - b.runDurationSeconds)[0] : null;

  return {
    runs,
    errors,
    stats: {
      totalRuns: runs.length,
      wins: wins.length,
      defeats: defeats.length,
      abandoned: abandoned.length,
      winRate: `${Math.round(wins.length / runs.length * 100)}%`,
      byCharacter,
      defeatHotspots: Object.entries(defeatMap)
        .sort((a, b) => b[1] - a[1])
        .map(([enc, count]) => ({ encounter: enc, count })),
      relicStats: {
        topInWins: topN(relicWins, 10),
        topInDefeats: topN(relicDefeats, 10),
      },
      mostSkippedCards: topN(skipCount, 10),
      mostBoughtShopRelics: topN(shopRelicCount, 8),
      neowPickStats: topN(neowCount, 5),
      restBehavior: {
        smithCount: totalSmith,
        restCount: totalRest,
        smithPreference: totalSmith + totalRest > 0
          ? `${Math.round(totalSmith / (totalSmith + totalRest) * 100)}%` : 'N/A',
      },
      deckStats: { avgDeckSize, avgUpgrades, avgRelics },
      floorStats: {
        avg: +(floorNums.reduce((s, f) => s + f, 0) / floorNums.length).toFixed(1),
        max: Math.max(...floorNums),
        min: Math.min(...floorNums),
      },
      avgRunDurationMin: +(runs.reduce((s, r) => s + r.runDurationMin, 0) / runs.length).toFixed(0),
      avgDmgTaken: +(runs.reduce((s, r) => s + r.totalDmgTaken, 0) / runs.length).toFixed(0),
      avgGoldSpent: +(runs.reduce((s, r) => s + r.totalGoldSpent, 0) / runs.length).toFixed(0),
      bestRun: bestRun ? { runId: bestRun.runId, floors: bestRun.floorsReached, win: bestRun.win, character: bestRun.character, date: bestRun.startDate } : null,
      fastestWin: fastestWin ? { runId: fastestWin.runId, durationMin: fastestWin.runDurationMin, floors: fastestWin.floorsReached, date: fastestWin.startDate } : null,
    },
  };
}

function topN(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ id: k, count: v }));
}

module.exports = { parseRunFile, findRunFiles, findLatestRunFile, aggregateRunFiles, RUN_HISTORY_DIR };
