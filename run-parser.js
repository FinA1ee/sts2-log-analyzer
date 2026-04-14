/**
 * run-parser.js - STS2 .run File Parser
 *
 * Parses the structured JSON .run files from:
 *   ~/Library/Application Support/SlayTheSpire2/steam/<uid>/profile1/saves/history/
 *
 * These are the canonical run records saved by the game — far richer than Godot
 * log files. Each file is a JSON object with the full floor-by-floor history of
 * one complete run.
 *
 * Schema version: 8 (STS2 v0.99.1)
 *
 * Key fields available:
 *   .win                   bool
 *   .was_abandoned         bool
 *   .ascension             int
 *   .start_time            unix timestamp
 *   .run_time              seconds
 *   .seed                  string
 *   .killed_by_encounter   string
 *   .acts                  [string] — act names visited
 *   .players[0]:
 *     .character           string
 *     .deck[]              { id, current_upgrade_level, floor_added_to_deck }
 *     .relics[]            { id, floor_added_to_deck }
 *     .potions[]           { id, slot_index }
 *   .map_point_history[]   floor-by-floor: room type, HP, gold, cards, relics, choices
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ─── Path ─────────────────────────────────────────────────────────────────────

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

/**
 * Find all .run files modified within the last N days, newest first.
 * @param {number} daysBack
 * @returns {Array<{name, path, startTime, mtime}>}
 */
function findRunFiles(daysBack = 7) {
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  return fs.readdirSync(RUN_HISTORY_DIR)
    .filter(f => f.endsWith('.run'))
    .map(f => {
      const fullPath = path.join(RUN_HISTORY_DIR, f);
      const stat = fs.statSync(fullPath);
      // Filename is the unix start_time
      const startTime = parseInt(f.replace('.run', ''), 10);
      return { name: f, path: fullPath, startTime, mtime: stat.mtime };
    })
    .filter(f => f.mtime.getTime() >= cutoff)
    .sort((a, b) => b.startTime - a.startTime); // newest first
}

/**
 * Find the single most recent .run file.
 */
function findLatestRunFile() {
  return findRunFiles(365).slice(0, 1)[0] || null;
}

// ─── Single run parser ────────────────────────────────────────────────────────

/**
 * Parse one .run JSON file into a normalized run object.
 * @param {string} filePath
 * @returns {Object} Structured run data
 */
function parseRunFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const player = raw.players?.[0] || {};
  const history = raw.map_point_history || [];

  // ── Floor-by-floor analysis ──
  const floors = history.map((point, floorIndex) => {
    const ps = point.player_stats?.[0] || {};
    const room = point.rooms?.[0] || {};
    return {
      floor: floorIndex + 1,
      mapPointType: point.map_point_type,        // 'monster','elite','boss','rest_site','treasure','unknown'
      roomType: room.room_type,
      encounterId: room.model_id || null,
      monsterIds: room.monster_ids || [],
      turnsTaken: room.turns_taken || 0,

      // HP at END of this floor
      hpEnd: ps.current_hp ?? null,
      hpMax: ps.max_hp ?? null,
      hpLost: ps.damage_taken ?? 0,
      hpHealed: ps.hp_healed ?? 0,
      maxHpGained: ps.max_hp_gained ?? 0,
      maxHpLost: ps.max_hp_lost ?? 0,

      // Gold at END of this floor
      goldEnd: ps.current_gold ?? null,
      goldGained: ps.gold_gained ?? 0,
      goldSpent: ps.gold_spent ?? 0,
      goldLost: ps.gold_lost ?? 0,

      // Cards
      cardChoices: (ps.card_choices || []).map(c => ({
        id: c.card?.id,
        picked: c.was_picked,
      })),
      cardsGained: (ps.cards_gained || []).map(c => c.id),
      cardsRemoved: ps.cards_removed || [],
      upgradedCards: ps.upgraded_cards || [],

      // Relics
      relicChoices: (ps.relic_choices || []).map(r => ({
        id: r.choice,
        picked: r.was_picked,
      })),

      // Potions
      potionChoices: (ps.potion_choices || []).map(p => ({
        id: p.choice,
        picked: p.was_picked,
      })),
      potionsUsed: ps.potion_used || [],
      potionsDiscarded: ps.potion_discarded || [],

      // Rest site action
      restAction: ps.rest_site_choices?.[0] || null, // 'SMITH' | 'REST' | 'RECALL'

      // Events
      eventChoices: (ps.event_choices || []).map(e => e.title?.key || JSON.stringify(e)),
    };
  });

  // ── Derived stats ──
  const combatFloors   = floors.filter(f => ['monster','elite','boss'].includes(f.roomType));
  const eliteFloors    = floors.filter(f => f.roomType === 'elite');
  const bossFloors     = floors.filter(f => f.roomType === 'boss');
  const restFloors     = floors.filter(f => f.roomType === 'rest_site');
  const shopFloors     = floors.filter(f => f.roomType === 'shop');

  const totalDmgTaken  = floors.reduce((s, f) => s + f.hpLost, 0);
  const totalHpHealed  = floors.reduce((s, f) => s + f.hpHealed, 0);
  const totalGoldGained = floors.reduce((s, f) => s + f.goldGained, 0);
  const totalGoldSpent  = floors.reduce((s, f) => s + f.goldSpent, 0);
  const avgTurnsPerCombat = combatFloors.length
    ? (combatFloors.reduce((s, f) => s + f.turnsTaken, 0) / combatFloors.length).toFixed(1)
    : 0;

  // Card draft decisions
  const allCardChoices   = floors.flatMap(f => f.cardChoices);
  const cardPickRate     = allCardChoices.length > 0
    ? Math.round(allCardChoices.filter(c => c.picked).length / allCardChoices.length * 100)
    : 0;
  const skippedCards     = allCardChoices.filter(c => !c.picked).map(c => c.id);

  // Rest site choices
  const smithCount  = restFloors.filter(f => f.restAction === 'SMITH').length;
  const restCount   = restFloors.filter(f => f.restAction === 'REST').length;

  // Final deck
  const finalDeck = (player.deck || []).map(c => ({
    id: c.id,
    upgradeLevel: c.current_upgrade_level || 0,
    floorAdded: c.floor_added_to_deck,
  }));

  // Final relics (in order obtained)
  const relics = (player.relics || []).map(r => ({
    id: r.id,
    floorAdded: r.floor_added_to_deck,
  })).sort((a, b) => a.floorAdded - b.floorAdded);

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
    schemaVersion: raw.schema_version,

    // ── Outcome ──
    win: raw.win,
    wasAbandoned: raw.was_abandoned,
    killedByEncounter: raw.killed_by_encounter || null,
    killedByEvent: raw.killed_by_event !== 'NONE.NONE' ? raw.killed_by_event : null,

    // ── Character ──
    character: player.character,
    actsVisited: raw.acts || [],
    floorsReached: floors.length,

    // ── Final state ──
    finalDeck,
    finalDeckSize: finalDeck.length,
    upgradedCardCount: finalDeck.filter(c => c.upgradeLevel > 0).length,
    relics,
    relicCount: relics.length,
    finalPotions: (player.potions || []).map(p => p.id),
    finalHp: floors[floors.length - 1]?.hpEnd ?? null,
    finalMaxHp: floors[floors.length - 1]?.hpMax ?? null,
    finalGold: floors[floors.length - 1]?.goldEnd ?? null,

    // ── Combat stats ──
    totalCombats: combatFloors.length,
    elitesAttempted: eliteFloors.length,
    bossesAttempted: bossFloors.length,
    totalDmgTaken,
    totalHpHealed,
    avgTurnsPerCombat: parseFloat(avgTurnsPerCombat),

    // ── Economy ──
    totalGoldGained,
    totalGoldSpent,
    shopVisits: shopFloors.length,

    // ── Draft decisions ──
    cardPickRate,
    skippedCards,
    smithCount,
    restCount,

    // ── Full floor-by-floor history ──
    floors,
  };
}

// ─── Multi-run aggregator ─────────────────────────────────────────────────────

/**
 * Parse multiple .run files and aggregate stats.
 * @param {Array} fileInfos - Output of findRunFiles()
 * @returns {Object} Aggregated weekly stats
 */
function aggregateRunFiles(fileInfos) {
  const runs = [];
  const errors = [];

  for (const f of fileInfos) {
    try {
      runs.push(parseRunFile(f.path));
    } catch (err) {
      errors.push({ file: f.name, error: err.message });
    }
  }

  if (runs.length === 0) return { runs: [], errors, stats: null };

  const wins    = runs.filter(r => r.win);
  const defeats = runs.filter(r => !r.win && !r.wasAbandoned);
  const abandoned = runs.filter(r => r.wasAbandoned);

  // By character
  const byCharacter = {};
  for (const run of runs) {
    const c = run.character || 'UNKNOWN';
    if (!byCharacter[c]) byCharacter[c] = { runs: 0, wins: 0, totalFloors: 0, maxFloor: 0, totalDmg: 0 };
    byCharacter[c].runs++;
    if (run.win) byCharacter[c].wins++;
    byCharacter[c].totalFloors += run.floorsReached;
    byCharacter[c].maxFloor    = Math.max(byCharacter[c].maxFloor, run.floorsReached);
    byCharacter[c].totalDmg    += run.totalDmgTaken;
  }
  for (const c of Object.values(byCharacter)) {
    c.avgFloor  = +(c.totalFloors / c.runs).toFixed(1);
    c.winRate   = `${Math.round(c.wins / c.runs * 100)}%`;
    c.avgDmg    = +(c.totalDmg / c.runs).toFixed(0);
  }

  // Defeat hotspots
  const defeatMap = {};
  for (const r of defeats) {
    const loc = r.killedByEncounter || 'UNKNOWN';
    defeatMap[loc] = (defeatMap[loc] || 0) + 1;
  }

  // Relic frequency in wins vs defeats
  const relicWins   = {};
  const relicDefeats = {};
  for (const r of wins)    r.relics.forEach(rel => { relicWins[rel.id]    = (relicWins[rel.id]    || 0) + 1; });
  for (const r of defeats) r.relics.forEach(rel => { relicDefeats[rel.id] = (relicDefeats[rel.id] || 0) + 1; });

  // Most skipped cards (cards offered but declined repeatedly)
  const skipCount = {};
  for (const r of runs) r.skippedCards.forEach(c => { skipCount[c] = (skipCount[c] || 0) + 1; });

  // Rest site behavior
  const totalSmith = runs.reduce((s, r) => s + r.smithCount, 0);
  const totalRest  = runs.reduce((s, r) => s + r.restCount, 0);

  // Avg deck size at end
  const avgDeckSize = +(runs.reduce((s, r) => s + r.finalDeckSize, 0) / runs.length).toFixed(1);
  const avgUpgrades = +(runs.reduce((s, r) => s + r.upgradedCardCount, 0) / runs.length).toFixed(1);

  // Best run (most floors)
  const bestRun = [...runs].sort((a, b) => b.floorsReached - a.floorsReached)[0];
  // Fastest win
  const fastestWin = wins.length
    ? [...wins].sort((a, b) => a.runDurationSeconds - b.runDurationSeconds)[0]
    : null;

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
        topInWins: Object.entries(relicWins)
          .sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([relic, count]) => ({ relic, count })),
        topInDefeats: Object.entries(relicDefeats)
          .sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([relic, count]) => ({ relic, count })),
      },
      mostSkippedCards: Object.entries(skipCount)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([card, count]) => ({ card, count })),
      restBehavior: {
        smithCount: totalSmith,
        restCount: totalRest,
        smithPreference: totalSmith + totalRest > 0
          ? `${Math.round(totalSmith / (totalSmith + totalRest) * 100)}%`
          : 'N/A',
      },
      deckStats: { avgDeckSize, avgUpgrades },
      floorStats: {
        avg: +(runs.reduce((s, r) => s + r.floorsReached, 0) / runs.length).toFixed(1),
        max: Math.max(...runs.map(r => r.floorsReached)),
        min: Math.min(...runs.map(r => r.floorsReached)),
      },
      avgRunDurationMin: +(runs.reduce((s, r) => s + r.runDurationMin, 0) / runs.length).toFixed(0),
      avgDmgTaken: +(runs.reduce((s, r) => s + r.totalDmgTaken, 0) / runs.length).toFixed(0),
      bestRun: bestRun ? {
        runId: bestRun.runId,
        floors: bestRun.floorsReached,
        win: bestRun.win,
        character: bestRun.character,
        date: bestRun.startDate,
      } : null,
      fastestWin: fastestWin ? {
        runId: fastestWin.runId,
        durationMin: fastestWin.runDurationMin,
        floors: fastestWin.floorsReached,
        date: fastestWin.startDate,
      } : null,
    },
  };
}

module.exports = {
  parseRunFile,
  findRunFiles,
  findLatestRunFile,
  aggregateRunFiles,
  RUN_HISTORY_DIR,
};
