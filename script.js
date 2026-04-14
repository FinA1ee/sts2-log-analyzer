#!/usr/bin/env node
/**
 * script.js - STS2 Analysis Entry Point (UPDATED: prefers .run files)
 *
 * Priority:
 *   1. Use the most recent .run file from saves/history/ (rich JSON, preferred)
 *   2. Fall back to Godot log (godot.log) if no .run file found
 *
 * Environment variables:
 *   RUN_FILE         - specific .run filename (e.g. "1776095967.run")
 *   USE_GODOT_LOG    - if "true", always use godot.log instead of .run
 *   LOG_FILE         - specific godot log filename (used with USE_GODOT_LOG)
 *   DRY_RUN          - if "true", print report but don't send to Feishu
 *   CREATE_DOC       - if "false", send inline card instead of creating doc
 *   SAVE_REPORT      - if "true", save report to reports/ directory
 */

const fs = require('fs');
const path = require('path');

const { parseRunFile, findLatestRunFile, findRunFilesForDate, listRunFiles, RUN_HISTORY_DIR } = require('./run-parser');
const { parseLog, findLatestLogFile } = require('./parser');
const { generateReport } = require('./report');
const { sendToFeishu, sendDocLinkCard, getTenantToken } = require('./feishu');
const { createReportDoc } = require('./feishu-doc');
const { generateRunReport } = require('./run-report');

const DRY_RUN = process.env.DRY_RUN === 'true';
const LOG_FILE = process.env.LOG_FILE || null;
const RUN_FILE = process.env.RUN_FILE || null;
const RUN_DATE = process.env.RUN_DATE || null;  // 'YYYY-MM-DD' in CST
const USE_GODOT = process.env.USE_GODOT_LOG === 'true';
const SAVE_REPORT = process.env.SAVE_REPORT === 'true';
const CREATE_DOC = process.env.CREATE_DOC !== 'false';
const LIST_MODE = process.argv.includes('--list');

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🗡️  STS2 Analyzer  |  OpenClaw Agent');
  console.log('═══════════════════════════════════════════');

  let reportMd;
  let summary;

  // ── --list mode: show recent .run files ────────────────────────────────────
  if (LIST_MODE) {
    console.log('\n📂 Recent .run files (newest first):');
    const files = listRunFiles(20);
    if (files.length === 0) {
      console.log('   No .run files found in', RUN_HISTORY_DIR);
    } else {
      files.forEach((f, i) => {
        console.log(`   ${String(i + 1).padStart(2)}. ${f.name}  →  ${f.dateStr}`);
      });
    }
    return;
  }

  if (!USE_GODOT) {
    // ── MODE 1: Parse .run file (preferred) ──────────────────────────────────
    let runFilePath;

    if (RUN_FILE) {
      // Explicit filename
      runFilePath = path.join(RUN_HISTORY_DIR, RUN_FILE);

    } else if (RUN_DATE) {
      // Find all runs on a specific date (pure filename timestamp math)
      const matches = findRunFilesForDate(RUN_DATE);
      if (matches.length === 0) {
        console.log(`\n❌ No .run files found for date: ${RUN_DATE} (CST)`);
        console.log('   Try: node script.js --list  to see available dates');
        process.exit(0);
      }
      if (matches.length > 1) {
        console.log(`\n📋 Multiple runs found on ${RUN_DATE}:`);
        matches.forEach((f, i) => console.log(`   ${i + 1}. ${f.name}  (${new Date(f.startTime * 1000).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })})`));
        console.log(`\n   Analyzing newest one. Use RUN_FILE=<filename> to pick a specific one.`);
      }
      runFilePath = matches[0].path; // newest first

    } else {
      // Default: latest .run file
      const latest = findLatestRunFile();
      if (!latest) {
        console.log('[!] No .run files found, falling back to Godot log...');
        return runWithGodotLog();
      }
      runFilePath = latest.path;
    }

    console.log(`\n[1/4] 📂 Reading run file: ${path.basename(runFilePath)}`);
    let run;
    try {
      run = parseRunFile(runFilePath);
    } catch (err) {
      console.error(`[ERROR] Failed to parse .run file: ${err.message}`);
      process.exit(1);
    }

    console.log(`[2/4] 🔍 Parsed run: ${run.character} | Floor ${run.floorsReached} | ${run.win ? 'WIN 🏆' : 'DEFEAT 💀'}`);
    console.log(`      Started: ${run.startDate} | Duration: ${run.runDurationMin}min | Seed: ${run.seed}`);

    console.log(`[3/4] 📊 Generating report...`);
    reportMd = generateRunReport(run);

    summary = {
      runs: 1,
      victories: run.win ? 1 : 0,
      defeats: run.win ? 0 : 1,
      maxFloor: run.floorsReached,
      totalRestarts: 0,
      character: run.character,
      result: run.win ? '🏆 胜利' : '💀 阵亡',
    };

  } else {
    // ── MODE 2: Fall back to Godot log ────────────────────────────────────────
    return runWithGodotLog();
  }

  await sendReport(reportMd, summary);
}

async function runWithGodotLog() {
  console.log(`\n[1/4] 📂 Reading Godot log...`);
  let logPath;
  try {
    logPath = findLatestLogFile(LOG_FILE);
    console.log(`      ${logPath}`);
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }

  const { parseLog } = require('./parser');
  const { generateReport } = require('./report');
  const logData = parseLog(logPath);

  console.log(`[2/4] 🔍 Found ${logData.runs.length} run(s)`);
  console.log(`[3/4] 📊 Generating report...`);
  const reportMd = generateReport(logData);
  const summary = {
    runs: logData.runs.length,
    victories: logData.runs.filter(r => r.result === 'VICTORY').length,
    defeats: logData.runs.filter(r => r.result === 'DEFEAT').length,
    maxFloor: logData.runs.length > 0 ? Math.max(...logData.runs.map(r => r.maxFloor)) : 0,
    totalRestarts: logData.runs.reduce((s, r) => s + r.quickRestarts, 0),
  };

  await sendReport(reportMd, summary);
}

async function sendReport(reportMd, summary) {
  // Optionally save
  if (SAVE_REPORT || DRY_RUN) {
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outPath = path.join(reportsDir, `sts2-report-${ts}.md`);
    fs.writeFileSync(outPath, reportMd, 'utf8');
    console.log(`      📄 Report saved: ${outPath}`);
  }

  if (!DRY_RUN && CREATE_DOC) {
    console.log('[4/4] 📄 Creating Feishu Doc...');
    try {
      const token = await getTenantToken();
      const doc = await createReportDoc(reportMd, summary, token);
      console.log(`      Doc URL: ${doc.url}`);
      const date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const title = `[STS2] ${date} ${summary.result || ''} Floor ${summary.maxFloor}`;
      await sendDocLinkCard(token, doc.url, title, summary);
      console.log('\n✅ Done!');
      console.log(`   📖 Doc: ${doc.url}`);
    } catch (err) {
      console.error('[ERROR] Doc creation failed:', err.message);
      console.log('   Falling back to inline card...');
      await sendToFeishu(reportMd, summary, { dryRun: false });
    }
  } else {
    console.log(`[4/4] 🚀 Sending${DRY_RUN ? ' (DRY RUN)' : ''}...`);
    const result = await sendToFeishu(reportMd, summary, { dryRun: DRY_RUN });
    if (!result.success) {
      console.error('\n❌ Failed:', result.error);
      process.exit(1);
    }
    console.log('\n✅ Done!');
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
