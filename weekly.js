#!/usr/bin/env node
/**
 * weekly.js - STS2 Weekly Analysis Entry Point
 *
 * 1. Scans all STS2 log files from the last 7 days
 * 2. Aggregates run stats into a structured summary
 * 3. Prints a JSON data block + Markdown skeleton for the agent to enrich
 * 4. The agent (running this via cron) reads the output, adds AI recommendations,
 *    then calls feishu-doc.js to create the weekly Feishu Doc.
 *
 * Environment variables:
 *   DAYS_BACK    - how many days to look back (default: 7)
 *   DRY_RUN      - if "true", print report only, no Feishu
 *   CREATE_DOC   - if "false", skip doc creation (default: true)
 *
 * This script is designed to be run BY the OpenClaw agent (via cron),
 * which then uses its LLM to enrich the report with strategic recommendations
 * before posting to Feishu. See SKILL.md for the full cron prompt.
 */

const fs   = require('fs');
const path = require('path');
const { findRunFiles, aggregateRunFiles }     = require('./run-parser');
const { findRecentLogFiles, aggregateSessions } = require('./weekly-aggregator'); // fallback
const { getTenantToken }   = require('./feishu');
const { createReportDoc }  = require('./feishu-doc');

const DAYS_BACK = parseInt(process.env.DAYS_BACK || '7', 10);
const USE_GODOT = process.env.USE_GODOT_LOG === 'true';

const DRY_RUN   = process.env.DRY_RUN   === 'true';
const CREATE_DOC = process.env.CREATE_DOC !== 'false';

// ─── Report builder ───────────────────────────────────────────────────────────

const ACT_LABELS = {
  'ACT.UNDERDOCKS': 'Act 1 底码头',
  'ACT.GLORY':      'Act 3 荣耀殿堂',
};

const CHAR_LABELS = {
  'CHARACTER.SILENT':   '无声者',
  'CHARACTER.IRONCLAD': '铁甲战士',
  'CHARACTER.DEFECT':   '机器人',
  'CHARACTER.WATCHER':  '守望者',
};

function buildWeeklyMarkdown(stats) {
  const lines = [];
  const now = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const startDate = new Date(Date.now() - DAYS_BACK * 86400000)
    .toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

  lines.push(`# 🗡️ 杀戮尖塔 2 — 周报 (${startDate} ～ ${now})`);
  lines.push('');

  if (stats.totalRuns === 0) {
    lines.push('> ℹ️ 本周未检测到任何战局记录。');
    return lines.join('\n');
  }

  // ── Overview ──
  lines.push(`## 📊 本周总览`);
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 扫描日志文件 | ${stats.filesScanned} 个 |`);
  lines.push(`| 总战局数 | **${stats.totalRuns}** 局 |`);
  lines.push(`| 胜利 | 🏆 ${stats.victories} 局 |`);
  lines.push(`| 阵亡 | 💀 ${stats.defeats} 局 |`);
  lines.push(`| 整体胜率 | **${stats.overallWinRate}** |`);
  lines.push(`| 平均到达楼层 | Floor ${stats.floorStats.avg} |`);
  lines.push(`| 最高楼层 | Floor ${stats.floorStats.max} |`);
  lines.push(`| QuickRestart 总次数 | ${stats.quickRestartTotal} 次 |`);
  lines.push('');

  // ── By Character ──
  lines.push(`## 🎭 角色分析`);
  lines.push('');
  for (const c of Object.values(stats.byCharacter)) {
    const name = CHAR_LABELS[c.character] || c.character;
    lines.push(`### ${name}`);
    lines.push(`| 项目 | 数值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 出场次数 | ${c.runs} 次 |`);
    lines.push(`| 胜率 | **${c.winRate}** |`);
    lines.push(`| 平均楼层 | Floor ${c.avgFloor} |`);
    lines.push(`| 最高楼层 | Floor ${c.maxFloor} |`);
    lines.push(`| QuickRestart | ${c.quickRestarts} 次 |`);
    lines.push('');
  }

  // ── Defeat Hotspots ──
  lines.push(`## 💀 阵亡热点（最常死于）`);
  lines.push('');
  if (stats.defeatHotspots.length === 0) {
    lines.push('> 无阵亡记录 — 本周全胜！');
  } else {
    stats.defeatHotspots.slice(0, 8).forEach((h, i) => {
      lines.push(`${i + 1}. \`${h.encounter}\` — ${h.count} 次`);
    });
  }
  lines.push('');

  // ── Act Progression ──
  lines.push(`## 🗺️ Act 到达情况`);
  lines.push('');
  for (const [act, count] of Object.entries(stats.actProgression)
    .sort((a, b) => b[1] - a[1])) {
    const label = ACT_LABELS[act] || act;
    lines.push(`- ${label}：共 ${count} 次进入`);
  }
  lines.push('');

  // ── Relic Intelligence ──
  lines.push(`## 🏺 遗物情报`);
  lines.push('');
  lines.push(`### 胜利局最常见遗物（前 8）`);
  stats.relicStats.topInWins.slice(0, 8).forEach((r, i) =>
    lines.push(`${i + 1}. \`${r.relic}\` — ${r.count} 次`)
  );
  lines.push('');
  lines.push(`### 失败局最常见遗物（前 8）`);
  stats.relicStats.topInLosses.slice(0, 8).forEach((r, i) =>
    lines.push(`${i + 1}. \`${r.relic}\` — ${r.count} 次`)
  );
  lines.push('');

  // ── Potion Usage ──
  if (stats.potionUsage.length > 0) {
    lines.push(`## 🧪 药水使用频率`);
    lines.push('');
    stats.potionUsage.slice(0, 8).forEach((p, i) =>
      lines.push(`${i + 1}. \`${p.potion}\` — ${p.count} 次`)
    );
    lines.push('');
  }

  // ── AI Analysis Placeholder ──
  // The OpenClaw agent will replace this section with real LLM output.
  lines.push(`---`);
  lines.push('');
  lines.push(`## 🤖 AI 战略分析与建议`);
  lines.push('');
  lines.push(`> ⚡ 以下分析由 OpenClaw Agent 基于上述数据生成`);
  lines.push('');
  lines.push(`<!-- AI_ANALYSIS_PLACEHOLDER -->`);
  lines.push('');
  lines.push(`---`);
  lines.push(`*由 OpenClaw Agent 自动生成 | Slay the Spire 2 Weekly Report*`);

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  📅  STS2 Weekly Aggregator  |  OpenClaw Agent');
  console.log('═══════════════════════════════════════════════════');

  // 1. Find source files (.run preferred)
  let stats;
  if (!USE_GODOT) {
    console.log(`\n[1/4] 📂 Scanning last ${DAYS_BACK} days of .run files...`);
    const runFiles = findRunFiles(DAYS_BACK);
    console.log(`      Found ${runFiles.length} .run file(s)`);
    runFiles.forEach(f => console.log(`        - ${f.name}`));

    // 2. Aggregate
    console.log('[2/4] 🔍 Aggregating runs...');
    const { stats: s, errors, runs } = aggregateRunFiles(runFiles);
    stats = s ? { ...s, period: `Last ${DAYS_BACK} days`, filesScanned: runFiles.length,
      sessionErrors: errors, quickRestartTotal: 0 } : null;

    if (!stats || stats.totalRuns === 0) {
      console.log('      No .run files found, falling back to Godot logs...');
      const logFiles = findRecentLogFiles();
      stats = { ...aggregateSessions(logFiles), filesScanned: logFiles.length };
    }
  } else {
    console.log(`\n[1/4] 📂 Scanning last ${DAYS_BACK} days of Godot logs...`);
    const files = findRecentLogFiles();
    console.log(`      Found ${files.length} log file(s)`);
    console.log('[2/4] 🔍 Aggregating runs...');
    stats = { ...aggregateSessions(files), filesScanned: files.length };
  }
  console.log(`      Total runs across all sessions: ${stats.totalRuns}`);
  console.log(`      Victories: ${stats.victories} | Defeats: ${stats.defeats}`);
  console.log(`      Win rate: ${stats.overallWinRate}`);

  if (stats.sessionErrors.length > 0) {
    console.warn(`      ⚠️  Skipped ${stats.sessionErrors.length} file(s) due to parse errors`);
  }

  // 3. Build Markdown skeleton
  console.log('[3/4] 📊 Building weekly report...');
  const reportMd = buildWeeklyMarkdown(stats);

  // Output the structured JSON stats to stdout for the agent to read
  // The agent uses this data to generate its AI recommendations.
  console.log('\n--- WEEKLY_STATS_JSON_BEGIN ---');
  console.log(JSON.stringify({
    period: stats.period,
    totalRuns: stats.totalRuns,
    victories: stats.victories,
    defeats: stats.defeats,
    overallWinRate: stats.overallWinRate,
    floorStats: stats.floorStats,
    byCharacter: stats.byCharacter,
    defeatHotspots: stats.defeatHotspots.slice(0, 5),
    relicStats: stats.relicStats,
    actProgression: stats.actProgression,
    quickRestartTotal: stats.quickRestartTotal,
  }, null, 2));
  console.log('--- WEEKLY_STATS_JSON_END ---\n');

  // 4. Create Feishu Doc
  if (!DRY_RUN && CREATE_DOC) {
    console.log('[4/4] 📄 Creating weekly Feishu Doc...');
    try {
      const token = await getTenantToken();
      const startLabel = new Date(Date.now() - DAYS_BACK * 86400000)
        .toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const endLabel = new Date()
        .toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const docTitle = `[STS2 周报] ${startLabel} ～ ${endLabel} | 胜率 ${stats.overallWinRate} | ${stats.totalRuns} 局`;

      const doc = await createReportDoc(reportMd, {
        runs: stats.totalRuns,
        victories: stats.victories,
        defeats: stats.defeats,
        maxFloor: stats.floorStats.max,
        totalRestarts: stats.quickRestartTotal,
      }, token);

      console.log('\n✅ Weekly doc created!');
      console.log(`   📖 Doc URL: ${doc.url}`);
      console.log(`   📄 Title: ${docTitle}`);
      console.log('');
      // The agent will use this URL to optionally send a Feishu message too.
      console.log(`DOC_URL=${doc.url}`);
    } catch (err) {
      console.error('[ERROR] Doc creation failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('[4/4] 🖨️  DRY RUN — printing report:\n');
    console.log(reportMd);
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
