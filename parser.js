/**
 * parser.js - STS2 Log Parser
 * 
 * Parses Godot game logs from Slay the Spire 2 to extract structured run data.
 * Log format uses [INFO], [WARN], [ERR] prefixes with [QuickRestart] mod tags.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Constants ────────────────────────────────────────────────────────────────

const STS2_LOG_DIR = path.join(
  os.homedir(),
  'Library/Application Support/SlayTheSpire2/logs'
);

// Regex patterns for key log events
const PATTERNS = {
  // Character: "Continuing run with character: CHARACTER.SILENT"
  character: /Continuing run with character: (CHARACTER\.\w+)/,
  // New run start: "Preloading 'characters=SILENT' assets..."
  newRun: /Preloading 'characters=(\w+)' assets\.\.\. count=(\d+) vfx=(\d+)/,
  // Floor: "RunState reconstructed: act=ACT.GLORY (\d+) floor=(\d+)"
  floorState: /RunState reconstructed: act=(ACT\.\w+) \(\d+\) floor=(\d+)/,
  // Act preload: "Preloading 'Act=GLORY' assets..."
  actLoad: /Preloading 'Act=(\w+)' assets/,
  // Kill events
  kill: /CHARACTER\.(\w+) has killed a (MONSTER\.\w+)\. That's (\d+) kills/,
  // Death/loss event
  loss: /CHARACTER\.(\w+) has (?:lost to encounter (ENCOUNTER\.\w+)|died to a (MONSTER\.\w+))\. That's (\d+) losses/,
  // Gold obtained
  goldObtained: /Obtained (\d+) gold from reward/,
  // Relic obtained
  relicObtained: /Obtained (RELIC\.\w+) from relic reward/,
  // Potion obtained
  potionObtained: /Obtained (POTION\.\w+) from potion reward/,
  // Potion used
  potionUsed: /Player 1 using potion (\w+) \(targeting (.+) \(index \d+\)\)/,
  // Potion discarded
  potionDiscarded: /Player 1 discarding potion (\w+)/,
  // Card played
  cardPlayed: /Player 1 playing card (\w+)/,
  // Card added (from choice)
  cardChosen: /Player 1 chose cards \[([^\]]+)\]/,
  // Boss encounter
  bossRoom: /QuickRestart\] Current room: class=CombatRoom type=Boss modelId=(ENCOUNTER\.\w+)/,
  // Elite encounter
  eliteRoom: /QuickRestart\] Current room: class=CombatRoom type=Elite modelId=(ENCOUNTER\.\w+)/,
  // QuickRestart complete
  quickRestartComplete: /QuickRestart\] === QuickRestart complete ===/,
  // Run saved to history
  runSaved: /Saved run history: (\d+)\.run/,
  // Run history created
  runHistoryCreated: /Created Run History entry!/,
  // Game version
  version: /Release Version: (v[\d.]+)/,
  // Game timestamp
  timestamp: /Timestamp: (.+)/,
  // Session start
  sessionStart: /Steamworks initialization succeeded!/,
  // Game quit
  gameQuit: /NGame\.Quit called/,
  // Epoch/Act bosses unlocked
  epochUnlocked: /Player already has Epoch: (\w+)/,
};

// ─── Main Parser ──────────────────────────────────────────────────────────────

/**
 * Find the most recent log file in the STS2 log directory.
 * @returns {string} Absolute path to the log file
 */
function findLatestLogFile(specificFile = null) {
  if (specificFile) {
    return path.join(STS2_LOG_DIR, specificFile);
  }

  // Default: use current session log
  const defaultLog = path.join(STS2_LOG_DIR, 'godot.log');
  if (fs.existsSync(defaultLog)) {
    return defaultLog;
  }

  // Fallback: find most recently modified file
  const files = fs.readdirSync(STS2_LOG_DIR)
    .filter(f => f.endsWith('.log') && f !== 'QuickRestart.log')
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(STS2_LOG_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) throw new Error('No STS2 log files found');
  return path.join(STS2_LOG_DIR, files[0].name);
}

/**
 * Parse a STS2 Godot log file and extract structured run data.
 * @param {string} logPath - Path to the log file
 * @returns {Object} Parsed run data
 */
function parseLog(logPath) {
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');

  const data = {
    logFile: path.basename(logPath),
    logPath,
    gameVersion: null,
    timestamp: null,
    session: {
      start: null,
      quit: null,
    },
    runs: [],           // Each distinct run within this session
    currentRun: null,   // Active run state
  };

  let currentRun = createEmptyRun();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // ── Session metadata ──
    const vMatch = line.match(PATTERNS.version);
    if (vMatch) data.gameVersion = vMatch[1];

    const tsMatch = line.match(PATTERNS.timestamp);
    if (tsMatch) data.timestamp = tsMatch[1];

    if (PATTERNS.sessionStart.test(line)) {
      data.session.start = extractPrefix(line);
    }
    if (PATTERNS.gameQuit.test(line)) {
      data.session.quit = extractPrefix(line);
    }

    // ── Run detection ──
    const charMatch = line.match(PATTERNS.character);
    if (charMatch) {
      currentRun.character = charMatch[1];
    }

    // ── Floor / Act tracking ──
    const floorMatch = line.match(PATTERNS.floorState);
    if (floorMatch) {
      const act = floorMatch[1];
      const floor = parseInt(floorMatch[2], 10);
      currentRun.currentAct = act;
      currentRun.maxFloor = Math.max(currentRun.maxFloor, floor);
      if (!currentRun.acts.includes(act)) {
        currentRun.acts.push(act);
      }
    }

    // ── Act load (first real act transition) ──
    const actLoadMatch = line.match(PATTERNS.actLoad);
    if (actLoadMatch && !currentRun.acts.includes(`ACT.${actLoadMatch[1]}`)) {
      currentRun.acts.push(`ACT.${actLoadMatch[1]}`);
    }

    // ── Kills ──
    const killMatch = line.match(PATTERNS.kill);
    if (killMatch) {
      currentRun.kills.push({
        character: killMatch[1],
        monster: killMatch[2],
        totalKills: parseInt(killMatch[3], 10),
      });
    }

    // ── Death / Loss ──
    const lossMatch = line.match(PATTERNS.loss);
    if (lossMatch) {
      currentRun.result = 'DEFEAT';
      currentRun.defeatEncounter = lossMatch[2] || null;
      currentRun.defeatMonster = lossMatch[3] || null;
      currentRun.totalLosses = parseInt(lossMatch[4], 10);

      // Finalize and push this run
      data.runs.push({ ...currentRun });
      currentRun = createEmptyRun();
    }

    // ── Relics ──
    const relicMatch = line.match(PATTERNS.relicObtained);
    if (relicMatch) {
      currentRun.relics.push(relicMatch[1]);
    }

    // ── Potions ──
    const potionObtainMatch = line.match(PATTERNS.potionObtained);
    if (potionObtainMatch) {
      currentRun.potionsObtained.push(potionObtainMatch[1]);
    }
    const potionUsedMatch = line.match(PATTERNS.potionUsed);
    if (potionUsedMatch) {
      currentRun.potionsUsed.push({
        potion: potionUsedMatch[1],
        target: potionUsedMatch[2],
      });
    }

    // ── Gold ──
    const goldMatch = line.match(PATTERNS.goldObtained);
    if (goldMatch) {
      currentRun.goldEarned += parseInt(goldMatch[1], 10);
    }

    // ── Boss encounters ──
    const bossMatch = line.match(PATTERNS.bossRoom);
    if (bossMatch && !currentRun.bossesEncountered.includes(bossMatch[1])) {
      currentRun.bossesEncountered.push(bossMatch[1]);
    }

    // ── Elite encounters ──
    const eliteMatch = line.match(PATTERNS.eliteRoom);
    if (eliteMatch && !currentRun.elitesEncountered.includes(eliteMatch[1])) {
      currentRun.elitesEncountered.push(eliteMatch[1]);
    }

    // ── QuickRestart usage ──
    if (PATTERNS.quickRestartComplete.test(line)) {
      currentRun.quickRestarts++;
    }

    // ── Run saved to history (Victory or end) ──
    const savedMatch = line.match(PATTERNS.runSaved);
    if (savedMatch) {
      currentRun.runHistoryId = savedMatch[1];
    }
    if (PATTERNS.runHistoryCreated.test(line)) {
      if (currentRun.result === null) {
        currentRun.result = 'UNKNOWN'; // May be victory, check context
      }
      if (currentRun.character || currentRun.maxFloor > 0) {
        data.runs.push({ ...currentRun });
        currentRun = createEmptyRun();
      }
    }
  }

  // If there's an in-progress run (e.g. session ended mid-run), capture it
  if (currentRun.character || currentRun.maxFloor > 0) {
    currentRun.result = currentRun.result || 'IN_PROGRESS';
    data.runs.push({ ...currentRun });
  }

  data.currentRun = data.runs[data.runs.length - 1] || null;

  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyRun() {
  return {
    character: null,
    currentAct: null,
    acts: [],
    maxFloor: 0,
    result: null,             // 'DEFEAT' | 'VICTORY' | 'IN_PROGRESS' | 'UNKNOWN'
    defeatEncounter: null,
    defeatMonster: null,
    totalLosses: null,
    relics: [],
    potionsObtained: [],
    potionsUsed: [],
    goldEarned: 0,
    kills: [],
    bossesEncountered: [],
    elitesEncountered: [],
    quickRestarts: 0,
    runHistoryId: null,
  };
}

function extractPrefix(line) {
  // Strip log level tag like [INFO], timestamp if present
  return line.replace(/^\[[\w.]+\]\s*/, '').trim();
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { parseLog, findLatestLogFile, STS2_LOG_DIR };
