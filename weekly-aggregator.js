/**
 * weekly-aggregator.js - Multi-session Log Aggregator
 *
 * Scans ALL STS2 log files modified within the last N days,
 * parses each one, and merges the runs into a single stats object.
 *
 * Used by weekly.js to produce the weekly summary dataset.
 */

const fs = require('fs');
const path = require('path');
const { parseLog, STS2_LOG_DIR } = require('./parser');

const DAYS_BACK = parseInt(process.env.DAYS_BACK || '7', 10);
const QUICK_RESTART_LOG = 'QuickRestart.log'; // always ignore

// ─── File scanner ─────────────────────────────────────────────────────────────

/**
 * Find all log files modified within the last N days.
 * @returns {Array<{name, path, mtime}>}
 */
function findRecentLogFiles(daysBack = DAYS_BACK) {
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  return fs.readdirSync(STS2_LOG_DIR)
    .filter(f => f.endsWith('.log') && f !== QUICK_RESTART_LOG)
    .map(f => {
      const fullPath = path.join(STS2_LOG_DIR, f);
      const stat = fs.statSync(fullPath);
      return { name: f, path: fullPath, mtime: stat.mtime };
    })
    .filter(f => f.mtime.getTime() >= cutoff)
    .sort((a, b) => a.mtime - b.mtime); // oldest first
}

// ─── Aggregator ───────────────────────────────────────────────────────────────

/**
 * Aggregate parsed run data from multiple log files into weekly stats.
 * @param {Array} files - Output of findRecentLogFiles()
 * @returns {Object} Weekly aggregated stats
 */
function aggregateSessions(files) {
  const allRuns = [];
  const sessionErrors = [];

  for (const file of files) {
    try {
      const logData = parseLog(file.path);
      for (const run of logData.runs) {
        allRuns.push({ ...run, _sourceFile: file.name, _sourceMtime: file.mtime });
      }
    } catch (err) {
      sessionErrors.push({ file: file.name, error: err.message });
    }
  }

  if (allRuns.length === 0) {
    return {
      period: `Last ${DAYS_BACK} days`,
      filesScanned: files.length,
      totalRuns: 0,
      sessionErrors,
      byCharacter: {},
      defeatHotspots: [],
      relicStats: { winning: [], losing: [] },
      potionUsage: {},
      floorStats: { min: 0, max: 0, avg: 0 },
      quickRestartTotal: 0,
      actProgression: {},
      rawRuns: [],
    };
  }

  // ── By-character breakdown ──
  const byCharacter = {};
  for (const run of allRuns) {
    const char = run.character || 'UNKNOWN';
    if (!byCharacter[char]) {
      byCharacter[char] = {
        character: char,
        runs: 0, wins: 0, defeats: 0, inProgress: 0,
        totalFloor: 0, maxFloor: 0,
        quickRestarts: 0,
      };
    }
    const c = byCharacter[char];
    c.runs++;
    if (run.result === 'VICTORY')     c.wins++;
    else if (run.result === 'DEFEAT') c.defeats++;
    else                               c.inProgress++;
    c.totalFloor += run.maxFloor;
    c.maxFloor = Math.max(c.maxFloor, run.maxFloor);
    c.quickRestarts += run.quickRestarts;
  }
  // Compute avg floor + win rate per character
  for (const c of Object.values(byCharacter)) {
    c.avgFloor = c.runs > 0 ? Math.round(c.totalFloor / c.runs) : 0;
    c.winRate  = c.runs > 0 ? `${Math.round((c.wins / c.runs) * 100)}%` : '0%';
  }

  // ── Defeat hotspots (where runs end most often) ──
  const defeatMap = {};
  for (const run of allRuns.filter(r => r.result === 'DEFEAT')) {
    const loc = run.defeatEncounter || run.defeatMonster || 'UNKNOWN';
    defeatMap[loc] = (defeatMap[loc] || 0) + 1;
  }
  const defeatHotspots = Object.entries(defeatMap)
    .sort((a, b) => b[1] - a[1])
    .map(([encounter, count]) => ({ encounter, count }));

  // ── Relic stats: which relics appear in winning vs losing runs ──
  const winRelics = {};
  const loseRelics = {};
  for (const run of allRuns) {
    const target = run.result === 'VICTORY' ? winRelics : loseRelics;
    for (const r of run.relics) {
      target[r] = (target[r] || 0) + 1;
    }
  }
  const sortedByCount = obj => Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([relic, count]) => ({ relic, count }));

  // ── Potion usage frequency ──
  const potionUsage = {};
  for (const run of allRuns) {
    for (const p of run.potionsUsed) {
      potionUsage[p.potion] = (potionUsage[p.potion] || 0) + 1;
    }
  }

  // ── Floor stats ──
  const floors = allRuns.map(r => r.maxFloor).filter(f => f > 0);
  const floorStats = {
    min: Math.min(...floors),
    max: Math.max(...floors),
    avg: Math.round(floors.reduce((s, f) => s + f, 0) / (floors.length || 1)),
  };

  // ── Act progression (how far players get each Act) ──
  const actProgression = {};
  for (const run of allRuns) {
    for (const act of run.acts) {
      actProgression[act] = (actProgression[act] || 0) + 1;
    }
  }

  const quickRestartTotal = allRuns.reduce((s, r) => s + r.quickRestarts, 0);
  const defeats = allRuns.filter(r => r.result === 'DEFEAT').length;
  const victories = allRuns.filter(r => r.result === 'VICTORY').length;

  return {
    period: `Last ${DAYS_BACK} days`,
    filesScanned: files.length,
    sessionErrors,
    totalRuns: allRuns.length,
    victories,
    defeats,
    inProgress: allRuns.length - victories - defeats,
    overallWinRate: `${Math.round((victories / allRuns.length) * 100)}%`,
    byCharacter,
    defeatHotspots,
    relicStats: {
      topInWins:   sortedByCount(winRelics),
      topInLosses: sortedByCount(loseRelics),
    },
    potionUsage: Object.entries(potionUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([potion, count]) => ({ potion, count })),
    floorStats,
    quickRestartTotal,
    actProgression,
    rawRuns: allRuns, // kept for AI analysis prompt context
  };
}

module.exports = { findRecentLogFiles, aggregateSessions, DAYS_BACK };
