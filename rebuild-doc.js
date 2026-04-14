/**
 * rebuild-doc.js - Rebuild weekly Feishu doc with AI analysis injected
 * 
 * Usage: AI_ANALYSIS="..." node rebuild-doc.js
 */
const { getTenantToken } = require('./feishu');
const { createReportDoc } = require('./feishu-doc');
const { findRecentLogFiles, aggregateSessions, DAYS_BACK } = require('./weekly-aggregator');

const AI_ANALYSIS = process.env.AI_ANALYSIS || '';

const CHAR_LABELS = {
  'CHARACTER.SILENT':   '无声者',
  'CHARACTER.IRONCLAD': '铁甲战士',
  'CHARACTER.DEFECT':   '机器人',
  'CHARACTER.WATCHER':  '守望者',
};

const ACT_LABELS = {
  'ACT.UNDERDOCKS': 'Act 1 底码头',
  'ACT.GLORY':      'Act 3 荣耀殿堂',
  'ACT.HIVE':       'Act 2 蜂巢',
  'ACT.OVERGROWTH': 'Act 4 疯人院',
};

function buildMarkdown(stats, aiAnalysis) {
  const lines = [];
  const now = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric',
  });
  const startDate = new Date(Date.now() - DAYS_BACK * 86400000)
    .toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

  lines.push(`# 🗡️ 杀戮尖塔 2 — 周报 (${startDate} ～ ${now})`);
  lines.push('');

  // Overview
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

  // Character
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

  // Defeat hotspots
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

  // Act Progression
  lines.push(`## 🗺️ Act 到达情况`);
  lines.push('');
  for (const [act, count] of Object.entries(stats.actProgression)
    .sort((a, b) => b[1] - a[1])) {
    const label = ACT_LABELS[act] || act;
    lines.push(`- ${label}：共 ${count} 次进入`);
  }
  lines.push('');

  // Relic Intelligence
  lines.push(`## 🏺 遗物情报`);
  lines.push('');
  lines.push(`### 失败局最常见遗物（前 8）`);
  if (stats.relicStats.topInLosses.length === 0) {
    lines.push('> 暂无失败局数据');
  } else {
    stats.relicStats.topInLosses.slice(0, 8).forEach((r, i) => {
      lines.push(`${i + 1}. \`${r.relic}\` — ${r.count} 次`);
    });
  }
  lines.push('');

  // AI Analysis
  lines.push(`---`);
  lines.push('');
  lines.push(`## 🤖 AI 战略分析与建议`);
  lines.push('');
  lines.push(`> ⚡ 以下分析由 OpenClaw Agent 基于上述数据生成`);
  lines.push('');
  if (AI_ANALYSIS) {
    lines.push(AI_ANALYSIS);
  } else {
    lines.push('*(暂无 AI 分析)*');
  }
  lines.push('');
  lines.push(`---`);
  lines.push(`*由 OpenClaw Agent 自动生成 | Slay the Spire 2 Weekly Report*`);

  return lines.join('\n');
}

async function main() {
  console.log('📂 Scanning logs...');
  const files = findRecentLogFiles();
  const stats = aggregateSessions(files);

  console.log(`Total runs: ${stats.totalRuns}, Victories: ${stats.victories}, Defeats: ${stats.defeats}`);

  const reportMd = buildMarkdown(stats, AI_ANALYSIS);
  const token = await getTenantToken();

  const startLabel = new Date(Date.now() - DAYS_BACK * 86400000)
    .toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const endLabel = new Date()
    .toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const doc = await createReportDoc(reportMd, {
    runs: stats.totalRuns,
    victories: stats.victories,
    defeats: stats.defeats,
    maxFloor: stats.floorStats.max,
    totalRestarts: stats.quickRestartTotal,
  }, token);

  console.log(`\n✅ Doc created: ${doc.url}`);
  console.log(`DOC_URL=${doc.url}`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
