# TRANSLATIONS.md - STS2 Game Term Translation Reference

This file is the **agent's memory** for Slay the Spire 2 Chinese translations.

When you spot a wrong or missing translation in a generated report:
1. Fix it here in TRANSLATIONS.md (as the canonical reference)
2. Also update `translations.js` (used by the code at runtime)
3. Commit both files

The code uses `translations.js` automatically — this file exists so the
agent can read, verify, and correct translations in natural language.

---

## How to Fix a Wrong Translation

If the user says "XX 翻译错了，应该是 YY":

```bash
# 1. Update translations.js
# Find the ID, fix the Chinese value

# 2. Commit
cd /Users/finale1891/.openclaw/workspace/sts2-log-analysis
git add translations.js TRANSLATIONS.md
git commit -m "fix: translation CARD.XXX → 正确中文名"
git push
```

---

## Characters 角色

| ID | 中文 | 英文 |
|---|---|---|
| `CHARACTER.SILENT` | 静默猎手 | Silent |
| `CHARACTER.IRONCLAD` | 铁甲战士 | Ironclad |
| `CHARACTER.DEFECT` | 故障机器人 | Defect |
| `CHARACTER.WATCHER` | 守望者 | Watcher |
| `CHARACTER.REGENT` | 储君 | Regent |
| `CHARACTER.NECROBINDER` | 亡灵契约师 | Necrobinder |

---

## Room Types 房间类型

| ID | 中文 |
|---|---|
| `monster` | 普通怪物 |
| `elite` | 精英 |
| `boss` | Boss |
| `rest_site` | 营地 |
| `shop` | 商店 |
| `treasure` | 宝箱 |
| `event` / `unknown` | 随机事件 |
| `ancient` | 开局选择（Neow） |

---

## Rest Site Choices 营地选择

| ID | 中文 | 说明 |
|---|---|---|
| `SMITH` | 升级卡牌 | 将一张牌升级为+1 |
| `REST` | 休息回血 | 恢复 30% 最大HP |
| `RECALL` | 召回 | 取回召回钥匙 |

---

## Bosses & Elites 精英/Boss 中文名

| ID | 中文 |
|---|---|
| `ENCOUNTER.WATERFALL_GIANT_BOSS` | 瀑布巨人（Boss） |
| `ENCOUNTER.LAGOON_TITAN_BOSS` | 海湾泰坦（Boss） |
| `ENCOUNTER.TERROR_EEL_ELITE` | 恐惧鳗鱼（精英） |
| `ENCOUNTER.GORGON_ELITE` | 戈尔贡（精英） |
| `ENCOUNTER.BYRDOIDS_ELITE` | 多尼斯异鸟（精英） |
| `ENCOUNTER.ENTOMANCER_ELITE` | 蜂群术士（精英） |
| `ENCOUNTER.BYGONE_EFFIGY_ELITE` | 旧日雕像（精英） |
| `ENCOUNTER.DECIMILLIPEDE_ELITE` | 千足虫（精英） |
| `ENCOUNTER.INFESTED_PRISMS_ELITE` | 感染棱柱（精英） |
| `ENCOUNTER.KNIGHTS_ELITE` | 幽灵骑士（精英） |
| `ENCOUNTER.MECHA_KNIGHT_ELITE` | 机甲骑士（精英） |
| `ENCOUNTER.PHANTASMAL_GARDENERS_ELITE` | 幻影园丁（精英） |
| `ENCOUNTER.PHROG_PARASITE_ELITE` | 蛙类寄生虫（精英） |
| `ENCOUNTER.SKULKING_COLONY_ELITE` | 潜行集群（精英） |
| `ENCOUNTER.SOUL_NEXUS_ELITE` | 灵魂枢纽（精英） |

---

## Common Encounters 普通怪物

| ID | 中文 |
|---|---|
| `ENCOUNTER.TOADPOLES_WEAK` | 蟾蜍蝌蚪 |
| `ENCOUNTER.SEWER_CLAM_NORMAL` | 下水道蛤蜊 |
| `ENCOUNTER.PUNCH_CONSTRUCT_NORMAL` | 冲击构装体 |
| `ENCOUNTER.CALCIFIED_CULTIST` | 钙化信徒 |
| `ENCOUNTER.DAMP_CULTIST` | 潮湿信徒 |

---

## Key Relics 重要遗物

| ID | 中文 | 说明 |
|---|---|---|
| `RELIC.GOLDEN_PEARL` | 金珍珠 | STS2新增 |
| `RELIC.RING_OF_THE_SNAKE` | 蛇纹戒指 | Silent起始遗物：开局8张手牌 |
| `RELIC.TEA_OF_DISCOURTESY` | 失礼茶 | STS2新增 |
| `RELIC.KUSARIGAMA` | 锁镰 | STS2新增 |
| `RELIC.TOOLBOX` | 工具箱 | STS2新增 |
| `RELIC.WAR_PAINT` | 战争彩绘 | 升级2张技能牌 |
| `RELIC.PRECISE_SCISSORS` | 精准剪刀 | STS2新增 |

---

## Key Potions 药水

| ID | 中文 |
|---|---|
| `POTION.EXPLOSIVE_AMPOULE` | 爆炸安瓿 |
| `POTION.SPEED_POTION` | 速度药水 |
| `POTION.CLARITY` | 清醒药水 |
| `POTION.WEAK_POTION` | 虚弱药水 |
| `POTION.SHIP_IN_A_BOTTLE` | 瓶中船 |

---

## Key Cards 重要卡牌

| ID | 中文 |
|---|---|
| `CARD.DAGGER_THROW` | 掷匕首 |
| `CARD.SNAKEBITE` | 蛇咬 |
| `CARD.FLECHETTES` | 毒镖 |
| `CARD.BLADE_DANCE` | 刀锋之舞 |
| `CARD.STRANGLE` | 勒杀 |
| `CARD.PIERCING_WAIL` | 穿云哭嚎 |
| `CARD.BACKFLIP` | 后空翻 |
| `CARD.ACROBATICS` | 杂技 |
| `CARD.FLICK_FLACK` | 閃避反击 |
| `CARD.SPOILS_MAP` | 战利地图 |
| `CARD.MEMENTO_MORI` | 死亡纪念 |
| `CARD.THE_HUNT` | 猎杀 |

---

## Known Issues / 已知翻译问题

> When fixing a translation, add a note here with the date so there's a log.

| 日期 | ID | 错误翻译 | 正确翻译 | 状态 |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Adding New Translations

When you see a raw ID like `CARD.SOME_NEW_CARD` in a report output:

1. Look up the card name in-game or the [STS2 wiki]
2. Add it to `translations.js` under the correct section
3. Add a row to the relevant table above in this file
4. Commit both files

**Pattern:** If the report shows `Some New Card` (formatted raw ID with spaces), that
means the ID is missing from `translations.js` — add it.
