/**
 * run-report.js - Rich Report Generator for .run files
 *
 * Generates a detailed Markdown report from a parsed .run object,
 * leveraging the full floor-by-floor data available in .run files.
 * Much richer than the Godot-log-based report.js.
 */

// ─── Label maps ───────────────────────────────────────────────────────────────

const CHAR_LABELS = {
  'CHARACTER.SILENT':   '无声者（Silent）',
  'CHARACTER.IRONCLAD': '铁甲战士（Ironclad）',
  'CHARACTER.DEFECT':   '机器人（Defect）',
  'CHARACTER.WATCHER':  '守望者（Watcher）',
};

const ACT_LABELS = {
  'ACT.UNDERDOCKS':  'Act 1 - 底码头',
  'ACT.GLORY':       'Act 3 - 荣耀殿堂',
};

const ROOM_EMOJI = {
  'monster':   '⚔️',
  'elite':     '💪',
  'boss':      '👹',
  'rest_site': '🔥',
  'treasure':  '💰',
  'shop':      '🛒',
  'event':     '❓',
  'unknown':   '❓',
};

const REST_LABELS = {
  'SMITH': '升级卡牌 (SMITH)',
  'REST':  '休息回血 (REST)',
  'RECALL': '召回 (RECALL)',
};

// ─── Main generator ───────────────────────────────────────────────────────────

function generateRunReport(run) {
  const lines = [];
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const charName = CHAR_LABELS[run.character] || run.character || '未知';
  const result = run.win ? '🏆 胜利' : (run.wasAbandoned ? '🚪 放弃' : '💀 阵亡');

  lines.push(`# 🗡️ 杀戮尖塔 2 战局详报`);
  lines.push(`> 生成时间：${now}`);
  lines.push('');

  // ── Overview ──
  lines.push(`## 📋 战局概览`);
  lines.push('');
  lines.push(`| 项目 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 角色 | ${charName} |`);
  lines.push(`| 结果 | **${result}** |`);
  lines.push(`| 到达楼层 | **Floor ${run.floorsReached}** |`);
  lines.push(`| 经历 Act | ${run.actsVisited.map(a => ACT_LABELS[a] || a).join(' → ') || '未知'} |`);
  lines.push(`| 开始时间 | ${run.startDate} |`);
  lines.push(`| 持续时间 | ${run.runDurationMin} 分钟 |`);
  lines.push(`| 种子 | \`${run.seed}\` |`);
  lines.push(`| 苦行等级 | ${run.ascension} |`);

  if (!run.win && run.killedByEncounter) {
    lines.push(`| 阵亡于 | \`${run.killedByEncounter}\` |`);
  }

  lines.push('');

  // ── HP & Gold summary ──
  lines.push(`## ❤️ HP & 💰 金币总结`);
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 最终 HP | ${run.finalHp ?? '?'} / ${run.finalMaxHp ?? '?'} |`);
  lines.push(`| 总承伤 | ${run.totalDmgTaken} 点 |`);
  lines.push(`| 总回血 | ${run.totalHpHealed} 点 |`);
  lines.push(`| 平均每场战斗回合数 | ${run.avgTurnsPerCombat} 回合 |`);
  lines.push(`| 最终金币 | ${run.finalGold ?? '?'} 💰 |`);
  lines.push(`| 总金币收入 | ${run.totalGoldGained} |`);
  lines.push(`| 总金币花费 | ${run.totalGoldSpent} |`);
  lines.push('');

  // ── Final Deck ──
  lines.push(`## 🃏 最终牌组（${run.finalDeckSize} 张，升级 ${run.upgradedCardCount} 张）`);
  lines.push('');
  const grouped = {};
  for (const c of run.finalDeck) {
    const key = c.id;
    if (!grouped[key]) grouped[key] = { id: c.id, count: 0, maxUpgrade: 0 };
    grouped[key].count++;
    grouped[key].maxUpgrade = Math.max(grouped[key].maxUpgrade, c.upgradeLevel);
  }
  for (const c of Object.values(grouped)) {
    const upgrade = c.maxUpgrade > 0 ? ` **+${c.maxUpgrade}**` : '';
    const multi   = c.count > 1 ? ` ×${c.count}` : '';
    lines.push(`- \`${c.id}\`${upgrade}${multi}`);
  }
  lines.push('');

  // ── Relics ──
  lines.push(`## 🏺 遗物（${run.relicCount} 个，按获取顺序）`);
  lines.push('');
  run.relics.forEach(r => lines.push(`- \`${r.id}\` *(Floor ${r.floorAdded})*`));
  lines.push('');

  // ── Rest site behavior ──
  lines.push(`## 🔥 营地决策`);
  lines.push('');
  lines.push(`| 选择 | 次数 |`);
  lines.push(`|------|------|`);
  lines.push(`| 升级卡牌 (SMITH) | ${run.smithCount} 次 |`);
  lines.push(`| 休息回血 (REST) | ${run.restCount} 次 |`);
  lines.push('');

  // ── Card draft decisions ──
  const cardsGained  = run.floors.flatMap(f => f.cardsGained);
  const cardsPicked  = run.floors.flatMap(f => f.cardChoices.filter(c => c.picked).map(c => c.id));
  const cardsSkipped = run.floors.flatMap(f => f.cardChoices.filter(c => !c.picked).map(c => c.id));

  lines.push(`## 📦 卡牌草稿决策`);
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 获得卡牌 | ${cardsGained.length} 张 |`);
  lines.push(`| 跳过卡牌机会次数 | ${cardsSkipped.length} 次 |`);
  lines.push(`| 拿牌率 | ${run.cardPickRate}% |`);
  lines.push('');

  if (cardsSkipped.length > 0) {
    // Count skips per card
    const skipCount = {};
    cardsSkipped.forEach(c => { skipCount[c] = (skipCount[c] || 0) + 1; });
    const topSkipped = Object.entries(skipCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    lines.push(`**最常跳过的卡牌：**`);
    topSkipped.forEach(([c, n]) => lines.push(`- \`${c}\` × ${n}`));
    lines.push('');
  }

  // ── Floor-by-floor timeline ──
  lines.push(`## 🗺️ 逐层时间线`);
  lines.push('');
  lines.push(`| 层 | 类型 | 遭遇 | HP后 | 获得 |`);
  lines.push(`|----|------|------|------|------|`);
  for (const f of run.floors) {
    const emoji = ROOM_EMOJI[f.roomType] || '?';
    const enc   = f.encounterId ? f.encounterId.replace(/^(ENCOUNTER|EVENT)\./, '') : f.roomType;
    const hpStr = f.hpEnd !== null ? `${f.hpEnd}/${f.hpMax}` : '-';
    const gained = [
      ...f.cardsGained.map(c => `🃏${c.replace('CARD.','')}`),
      ...f.relicChoices.filter(r => r.picked).map(r => `🏺${r.id.replace('RELIC.','')}`),
      ...(f.restAction ? [`🔥${REST_LABELS[f.restAction] || f.restAction}`] : []),
    ].join(' ') || '-';
    lines.push(`| ${f.floor} | ${emoji} ${f.roomType} | ${enc} | ${hpStr} | ${gained} |`);
  }
  lines.push('');

  lines.push(`---`);
  lines.push(`*由 OpenClaw Agent 基于游戏存档 \`${run.fileName}\` 自动生成*`);

  return lines.join('\n');
}

module.exports = { generateRunReport };
