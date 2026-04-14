/**
 * report.js - STS2 Report Generator
 * 
 * Converts parsed STS2 log data into a human-readable Markdown report
 * suitable for posting to Feishu.
 */

// ─── Mapping tables ───────────────────────────────────────────────────────────

const CHARACTER_NAMES = {
  'CHARACTER.SILENT':    '无声者（Silent）',
  'CHARACTER.IRONCLAD':  '铁甲战士（Ironclad）',
  'CHARACTER.DEFECT':    '机器人（Defect）',
  'CHARACTER.WATCHER':   '守望者（Watcher）',
};

const ACT_NAMES = {
  'ACT.UNDERDOCKS':  'Act 1 - 底码头（Underdocks）',
  'ACT.GLORY':       'Act 3 - 荣耀殿堂（Glory）',
  // Add more as discovered
};

const RESULT_EMOJI = {
  'DEFEAT':      '💀 阵亡',
  'VICTORY':     '🏆 胜利',
  'IN_PROGRESS': '⏳ 进行中',
  'UNKNOWN':     '❓ 未知',
};

// ─── Report Generator ─────────────────────────────────────────────────────────

/**
 * Generate a Markdown report from parsed log data.
 * @param {Object} logData - Output of parseLog()
 * @returns {string} Markdown report text
 */
function generateReport(logData) {
  const lines = [];
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  lines.push(`# 🗡️ 杀戮尖塔 2 战局报告`);
  lines.push(`> 生成时间：${now}`);
  lines.push('');

  // ── Session Info ──
  lines.push(`## 📋 本次会话信息`);
  lines.push('');
  lines.push(`| 项目 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 日志文件 | \`${logData.logFile}\` |`);
  lines.push(`| 游戏版本 | ${logData.gameVersion || '未知'} |`);
  lines.push(`| 游戏时间 | ${logData.timestamp || '未知'} |`);
  lines.push(`| 本次会话战局数 | ${logData.runs.length} 局 |`);
  lines.push('');

  if (logData.runs.length === 0) {
    lines.push('> ℹ️ 本次日志中未发现完整战局记录。');
    return lines.join('\n');
  }

  // ── Each Run ──
  logData.runs.forEach((run, idx) => {
    lines.push(`---`);
    lines.push('');
    lines.push(`## 🎮 战局 #${idx + 1}`);
    lines.push('');

    const charName = CHARACTER_NAMES[run.character] || run.character || '未知角色';
    const result = RESULT_EMOJI[run.result] || run.result || '未知';

    // Overview table
    lines.push(`| 项目 | 内容 |`);
    lines.push(`|------|------|`);
    lines.push(`| 角色 | ${charName} |`);
    lines.push(`| 结果 | **${result}** |`);
    lines.push(`| 最高楼层 | Floor ${run.maxFloor} |`);
    lines.push(`| 经历 Act | ${run.acts.map(a => ACT_NAMES[a] || a).join(' → ') || '未知'} |`);
    lines.push(`| 总金币收入 | ${run.goldEarned} 💰 |`);
    lines.push(`| QuickRestart 次数 | ${run.quickRestarts} 次 |`);

    if (run.result === 'DEFEAT') {
      const where = run.defeatEncounter || run.defeatMonster || '未知';
      lines.push(`| 阵亡位置 | \`${where}\` |`);
    }

    lines.push('');

    // Relics
    if (run.relics.length > 0) {
      lines.push(`### 🏺 获得遗物 (${run.relics.length})`);
      run.relics.forEach(r => lines.push(`- \`${r}\``));
      lines.push('');
    }

    // Bosses encountered
    if (run.bossesEncountered.length > 0) {
      lines.push(`### 👹 Boss 遭遇`);
      run.bossesEncountered.forEach(e => lines.push(`- \`${e}\``));
      lines.push('');
    }

    // Elites encountered
    if (run.elitesEncountered.length > 0) {
      lines.push(`### ⚔️ 精英遭遇 (${run.elitesEncountered.length})`);
      run.elitesEncountered.forEach(e => lines.push(`- \`${e}\``));
      lines.push('');
    }

    // Potions used
    if (run.potionsUsed.length > 0) {
      lines.push(`### 🧪 使用药水 (${run.potionsUsed.length})`);
      run.potionsUsed.forEach(p => lines.push(`- \`${p.potion}\` → 对 ${p.target}`));
      lines.push('');
    }

    // Kill summary
    if (run.kills.length > 0) {
      const uniqueMonsters = [...new Set(run.kills.map(k => k.monster))];
      lines.push(`### 💀 击杀总结`);
      lines.push(`共击杀 **${run.kills.length}** 个怪物，种类：`);
      uniqueMonsters.forEach(m => {
        const count = run.kills.filter(k => k.monster === m).length;
        lines.push(`- \`${m}\` × ${count}`);
      });
      lines.push('');
    }
  });

  // ── Summary ──
  lines.push(`---`);
  lines.push('');
  lines.push(`## 📊 会话总结`);
  lines.push('');
  const defeats = logData.runs.filter(r => r.result === 'DEFEAT').length;
  const victories = logData.runs.filter(r => r.result === 'VICTORY').length;
  const maxFloor = Math.max(...logData.runs.map(r => r.maxFloor));
  const totalRestarts = logData.runs.reduce((s, r) => s + r.quickRestarts, 0);

  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 总战局 | ${logData.runs.length} 局 |`);
  lines.push(`| 胜利 | ${victories} 局 🏆 |`);
  lines.push(`| 阵亡 | ${defeats} 局 💀 |`);
  lines.push(`| 最高楼层（全局） | Floor ${maxFloor} |`);
  lines.push(`| QuickRestart 总次数 | ${totalRestarts} 次 |`);
  lines.push('');
  lines.push(`---`);
  lines.push(`*由 OpenClaw Agent 自动生成 | Slay the Spire 2 Log Analyzer*`);

  return lines.join('\n');
}

/**
 * Generate a compact single-run card summary (for Feishu card messages).
 * @param {Object} run - A single run from logData.runs
 * @returns {string} Short text summary
 */
function generateRunSummary(run) {
  const charName = CHARACTER_NAMES[run.character] || run.character || '???';
  const result = RESULT_EMOJI[run.result] || '❓';
  const acts = run.acts.map(a => ACT_NAMES[a] || a).join(' → ');
  return [
    `${result} | ${charName} | Floor ${run.maxFloor}`,
    acts,
    run.relics.length > 0 ? `遗物: ${run.relics.join(', ')}` : '',
    run.result === 'DEFEAT' ? `止步于: ${run.defeatEncounter || run.defeatMonster || '?'}` : '',
  ].filter(Boolean).join('\n');
}

module.exports = { generateReport, generateRunSummary };
