/**
 * run-report.js - Rich Markdown Report Generator for .run files (v2)
 *
 * All translation is handled by translations.js.
 * To fix a wrong translation: update translations.js + TRANSLATIONS.md
 */

const { translate, translateCharacter } = require('./translations');


const ACT_LABELS = {
  'ACT.UNDERDOCKS': 'Act 1 底码头',
  'ACT.GLORY':      'Act 3 荣耀殿堂',
};

const ROOM_EMOJI = {
  ancient:   '🌟',
  monster:   '⚔️',
  elite:     '💪',
  boss:      '👹',
  rest_site: '🔥',
  treasure:  '💰',
  shop:      '🛒',
  event:     '❓',
  unknown:   '❓',
};

const REST_LABELS = {
  SMITH:  '升级卡牌 (SMITH)',
  REST:   '休息回血 (REST)',
  RECALL: '召回遗物 (RECALL)',
};
──────

function generateRunReport(run) {
  const lines = [];
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const char = translateCharacter(run.character);
  const result = run.win ? '🏆 胜利' : run.wasAbandoned ? '🚪 放弃' : '💀 阵亡';
  const acts = (run.actsVisited || []).map(a => ACT_LABELS[a] || a).join(' → ') || '未知';


  lines.push(`# 🗡️ 杀戮尖塔 2 战局详报`);
  lines.push(`> 生成时间：${now}`);
  lines.push('');

  // ── 1. Overview ──────────────────────────────────────────────────────────
  lines.push(`## 📋 战局概览`);
  lines.push('');
  lines.push(`| 项目 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 角色 | ${char} |`);
  lines.push(`| 结果 | **${result}** |`);
  lines.push(`| 到达楼层 | **Floor ${run.floorsReached}** |`);
  lines.push(`| 经历 Act | ${acts} |`);
  lines.push(`| 苦行等级 | Ascension ${run.ascension} |`);
  lines.push(`| 开始时间 | ${run.startDate} |`);
  lines.push(`| 持续时间 | ${run.runDurationMin} 分钟 |`);
  lines.push(`| 种子 | \`${run.seed}\` |`);
  if (!run.win && run.killedByEncounter) {
    lines.push(`| 阵亡于 | ${translate(run.killedByEncounter)} *(\`${run.killedByEncounter}\`)* |`);
  }
  lines.push('');

  // ── 2. Neow Opening Choice ───────────────────────────────────────────────
  if (run.neowOptions && run.neowOptions.length > 0) {
    lines.push(`## 🌟 开局选择（Neow / Ancient）`);
    lines.push('');
    lines.push(`**选择了：** ${translate(run.neowPicked || '')} *(\`${run.neowPicked || '未知'}\`)*`);
    lines.push('');
    lines.push(`**放弃了：**`);
    (run.neowNotPicked || []).forEach(id => lines.push(`- ${translate(id)} *(\`${id}\`)* `));
    lines.push('');
  }

  // ── 3. HP & Gold Economy ─────────────────────────────────────────────────
  lines.push(`## ❤️ HP & 💰 金币`);
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 最终 HP | ${run.finalHp ?? '?'} / ${run.finalMaxHp ?? '?'} |`);
  lines.push(`| 最大 HP 增加 | +${run.totalMaxHpGained} |`);
  lines.push(`| 总承伤 | ${run.totalDmgTaken} 点 |`);
  lines.push(`| 总回血 | ${run.totalHpHealed} 点 |`);
  lines.push(`| 平均战斗回合数 | ${run.avgTurnsPerCombat} 回合 |`);
  lines.push(`| 最终金币 | ${run.finalGold ?? '?'} 💰 |`);
  lines.push(`| 总金币收入 | ${run.totalGoldGained} |`);
  lines.push(`| 总金币花费 | ${run.totalGoldSpent} |`);
  if (run.totalGoldStolen > 0) lines.push(`| 被偷金币 | ${run.totalGoldStolen} |`);
  lines.push('');

  // ── 4. Boss Encounters ───────────────────────────────────────────────────
  if (run.bossEncounters && run.bossEncounters.length > 0) {
    lines.push(`## 👹 Boss 战详情`);
    lines.push('');
    lines.push(`| Boss | 楼层 | 承伤 | 回合数 |`);
    lines.push(`|------|------|------|--------|`);
    run.bossEncounters.forEach(b => {
      const name = translate(b.id || '');
      lines.push(`| ${name} | Floor ${b.floor} | ${b.hpLost} | ${b.turns} |`);
    });
    lines.push('');
  }

  // ── 5. Elite Encounters ──────────────────────────────────────────────────
  if (run.eliteEncounters && run.eliteEncounters.length > 0) {
    lines.push(`## 💪 精英战详情`);
    lines.push('');
    lines.push(`| 精英 | 楼层 | 承伤 | 回合数 |`);
    lines.push(`|------|------|------|--------|`);
    run.eliteEncounters.forEach(e => {
      const name = translate(e.id || '');
      lines.push(`| ${name} | Floor ${e.floor} | ${e.hpLost} | ${e.turns} |`);
    });
    lines.push('');
  }

  // ── 6. Final Deck ────────────────────────────────────────────────────────
  lines.push(`## 🃏 最终牌组（${run.finalDeckSize} 张 | 升级 ${run.upgradedCardCount} 张）`);
  lines.push('');
  const grouped = {};
  for (const c of run.finalDeck) {
    if (!grouped[c.id]) grouped[c.id] = { id: c.id, count: 0, maxUpgrade: 0 };
    grouped[c.id].count++;
    grouped[c.id].maxUpgrade = Math.max(grouped[c.id].maxUpgrade, c.upgradeLevel);
  }
  for (const c of Object.values(grouped)) {
    const upg = c.maxUpgrade > 0 ? ` **+${c.maxUpgrade}**` : '';
    const mul = c.count > 1 ? ` ×${c.count}` : '';
    const name = translate(c.id, 'card');
    lines.push(`- ${name}${upg}${mul} *(\`${c.id}\`)*`);
  }
  lines.push('');

  // ── 7. Upgrades Breakdown ────────────────────────────────────────────────
  if (run.totalUpgrades > 0) {
    lines.push(`## 🔧 升级明细（共 ${run.totalUpgrades} 次）`);
    lines.push('');
    if (run.smithUpgrades.length > 0)    lines.push(`**营地升级 (SMITH × ${run.smithCount})：** ${run.smithUpgrades.map(c => translate(c,'card')).join(', ')}`);
    if (run.treasureUpgrades.length > 0) lines.push(`**宝箱升级：** ${run.treasureUpgrades.map(c => translate(c,'card')).join(', ')}`);
    if (run.eventUpgrades.length > 0)    lines.push(`**事件升级：** ${run.eventUpgrades.map(c => translate(c,'card')).join(', ')}`);
    lines.push('');
  }

  // ── 8. Relics ────────────────────────────────────────────────────────────
  lines.push(`## 🏺 遗物（${run.relicCount} 个）`);
  lines.push('');
  run.relics.forEach(r => {
    const src = run.allBoughtRelics?.includes(r.id) ? ' 🛒' :
                r.floorAdded === 1 ? ' 🌟' : '';
    const name = translate(r.id, 'relic');
    lines.push(`- ${name}${src} *(Floor ${r.floorAdded} | \`${r.id}\`)*`);
  });
  lines.push('');
  lines.push(`> 🛒 = 商店购买 | 🌟 = 开局选择`);
  lines.push('');

  if (run.relicsOfferedNotTaken && run.relicsOfferedNotTaken.length > 0) {
    const skipRelicCount = {};
    run.relicsOfferedNotTaken.forEach(r => { skipRelicCount[r] = (skipRelicCount[r] || 0) + 1; });
    const topSkipped = Object.entries(skipRelicCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    lines.push(`**跳过的遗物：**`);
    topSkipped.forEach(([r, n]) => lines.push(`- ${translate(r,'relic')}${n > 1 ? ` ×${n}` : ''} *(\`${r}\`)*`));
    lines.push('');
  }

  // ── 9. Shop ──────────────────────────────────────────────────────────────
  if (run.shopVisits > 0) {
    lines.push(`## 🛒 商店（${run.shopVisits} 次）`);
    lines.push('');
    if (run.allShopCards.length > 0)    lines.push(`**购买卡牌：** ${run.allShopCards.map(c => translate(c,'card')).join(', ')}`);
    if (run.allBoughtRelics.length > 0) lines.push(`**购买遗物：** ${run.allBoughtRelics.map(r => translate(r,'relic')).join(', ')}`);
    lines.push(`**总花费：** ${run.totalGoldSpent} 金币`);
    lines.push('');
  }

  // ── 10. Card Draft Decisions ─────────────────────────────────────────────
  lines.push(`## 📦 卡牌草稿`);
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 拿牌率 | ${run.cardPickRate}% |`);
  lines.push(`| 跳过次数 | ${run.skippedCards.length} 次 |`);
  lines.push('');
  if (run.skippedCards.length > 0) {
    const sc = {};
    run.skippedCards.forEach(c => { sc[c] = (sc[c] || 0) + 1; });
    const top = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    lines.push(`**最常跳过：**`);
    top.forEach(([c, n]) => lines.push(`- ${translate(c,'card')} ×${n} *(\`${c}\`)*`));
    lines.push('');
  }

  // ── 11. Potions ──────────────────────────────────────────────────────────
  if (run.allPotionsUsed.length > 0 || run.finalPotions.length > 0) {
    lines.push(`## 🧪 药水`);
    lines.push('');
    if (run.allPotionsUsed.length > 0) {
      const pc = {};
      run.allPotionsUsed.forEach(p => { pc[p] = (pc[p] || 0) + 1; });
      lines.push(`**使用：** ${Object.entries(pc).map(([p, n]) => `${translate(p,'potion')}${n > 1 ? `×${n}` : ''}`).join(', ')}`);
    }
    if (run.finalPotions.length > 0) {
      lines.push(`**剩余：** ${run.finalPotions.map(p => translate(p,'potion')).join(', ')}`);
    }
    lines.push('');
  }

  // ── 12. Rest site behavior ───────────────────────────────────────────────
  lines.push(`## 🔥 营地决策（${run.totalRestSites} 处）`);
  lines.push('');
  lines.push(`| 选择 | 次数 |`);
  lines.push(`|------|------|`);
  lines.push(`| 升级卡牌 (SMITH) | ${run.smithCount} |`);
  lines.push(`| 休息回血 (REST) | ${run.restCount} |`);
  if (run.recallCount > 0) lines.push(`| 召回 (RECALL) | ${run.recallCount} |`);
  lines.push('');

  // ── 13. Floor-by-floor timeline ──────────────────────────────────────────
  lines.push(`## 🗺️ 逐层时间线`);
  lines.push('');
  lines.push(`| 层 | 类型 | 遭遇/事件 | HP后 | ±HP | 获得 |`);
  lines.push(`|----|------|-----------|------|-----|------|`);

  for (const f of run.floors) {
    if (f.mapPointType === 'ancient') continue; // shown in Neow section
    const emoji = ROOM_EMOJI[f.mapPointType] || ROOM_EMOJI[f.roomType] || '?';
    const enc   = f.encounterId ? translate(f.encounterId) : f.mapPointType;
    const hpStr = f.hpEnd !== null ? `${f.hpEnd}/${f.hpMax}` : '-';
    const dmg   = f.hpLost > 0 ? `-${f.hpLost}` : f.hpHealed > 0 ? `+${f.hpHealed}` : '0';
    const gained = [
      ...f.cardsGained.map(c => `🃏${translate(c,'card')}`),
      ...f.relicChoices.filter(r => r.picked).map(r => `🏺${translate(r.id,'relic')}`),
      ...f.boughtRelics.map(r => `🛒${translate(r,'relic')}`),
      ...(f.restAction && f.restAction !== 'REST' ? [`🔥${REST_LABELS[f.restAction] || f.restAction}`] : []),
      ...(f.restAction === 'REST' && f.hpHealed > 0 ? [`❤️+${f.hpHealed}`] : []),
      ...f.upgradedCards.map(c => `⬆️${translate(c,'card')}`),
    ].join(' ') || '-';
    lines.push(`| ${f.floor} | ${emoji} ${f.mapPointType} | ${enc} | ${hpStr} | ${dmg} | ${gained} |`);
  }

  lines.push('');
  lines.push(`---`);
  lines.push(`*由 OpenClaw Agent 基于存档 \`${run.fileName}\` 自动生成 — STS2 v0.99+*`);

  return lines.join('\n');
}

module.exports = { generateRunReport };
