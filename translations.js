/**
 * translations.js - STS2 Game ID → Chinese Translation Dictionary
 *
 * All game IDs use the format PREFIX.NAME (e.g. "CARD.DAGGER_THROW").
 * This module strips the prefix and returns a localized Chinese name.
 *
 * HOW TO UPDATE:
 *   1. Find the wrong translation in TRANSLATIONS.md
 *   2. Add or fix the entry in the correct section below
 *   3. Run `node script.js` — the fix takes effect immediately
 *   4. Commit: git add translations.js && git commit -m "fix: translation ..."
 *
 * Entries are intentionally kept flat (no nested objects) for easy grepping.
 */

// ─── Characters ───────────────────────────────────────────────────────────────

const CHARACTERS = {
  'CHARACTER.SILENT': '静默猎手',
  'CHARACTER.IRONCLAD': '铁甲战士',
  'CHARACTER.DEFECT': '故障机器人',
  'CHARACTER.WATCHER': '守望者',
  'CHARACTER.REGENT': '储君',
  'CHARACTER.NECROBINDER': '亡灵契约师',
};

// ─── Cards ────────────────────────────────────────────────────────────────────
// Standard starting cards + common Silent / Ironclad / Defect / Watcher cards.
// Add missing ones as you encounter them.

const CARDS = {
  // ── Silent starters ──
  'CARD.STRIKE_SILENT': '打击（无声者）',
  'CARD.DEFEND_SILENT': '防御（无声者）',
  'CARD.NEUTRALIZE': '中和',
  'CARD.SURVIVOR': '求生',

  // ── Silent skills ──
  'CARD.ACROBATICS': '杂技',
  'CARD.BACKFLIP': '后空翻',
  'CARD.BLADE_DANCE': '刀锋之舞',
  'CARD.BURST': '迸发',
  'CARD.CALCULATED_GAMBLE': '精算赌注',
  'CARD.CLOAK_AND_DAGGER': '斗篷与匕首',
  'CARD.CONCENTRATE': '专注',
  'CARD.DAGGER_THROW': '掷匕首',
  'CARD.DASH': '突刺',
  'CARD.DEFLECT': '偏转',
  'CARD.DEXTERITY_POTION': '敏捷药水',
  'CARD.DIE_DIE_DIE': '杀杀杀',
  'CARD.DISTRACTION': '分神',
  'CARD.ENDLESS_AGONY': '无尽苦痛',
  'CARD.ENVENOM': '淬毒',
  'CARD.ESCAPE_PLAN': '逃脱计划',
  'CARD.EXPERTISE': '熟练',
  'CARD.FINISHER': '终结者',
  'CARD.FLECHETTES': '毒镖',
  'CARD.FLICK_FLACK': '閃避反击',
  'CARD.FOOTWORK': '步法',
  'CARD.GLASS_KNIFE': '玻璃刀',
  'CARD.GRAND_FINALE': '大结局',
  'CARD.HEEL_HOOK': '脚跟钩',
  'CARD.INFINITE_BLADES': '无限刀刃',
  'CARD.MALAISE': '不适',
  'CARD.MASTERFUL_STAB': '精湛穿刺',
  'CARD.MEMENTO_MORI': '死亡纪念',
  'CARD.NOXIOUS_FUMES': '毒性烟雾',
  'CARD.OUTMANEUVER': '超前布局',
  'CARD.PHANTASMAL_KILLER': '幻影杀手',
  'CARD.PIERCING_WAIL': '穿云哭嚎',
  'CARD.PINPOINT': '精准打击',
  'CARD.PREPARED': '有备而来',
  'CARD.PREDATOR': '掠食者',
  'CARD.QUICK_SLASH': '快速斩击',
  'CARD.REFLEX': '反射',
  'CARD.RIDDLE_WITH_HOLES': '千疮百孔',
  'CARD.SETUP': '布局',
  'CARD.SKEWER': '穿刺',
  'CARD.SLICE': '切割',
  'CARD.SNAKEBITE': '蛇咬',
  'CARD.SPLASH': '飞溅',
  'CARD.STILETTO': '细刃匕首',
  'CARD.STORM_OF_STEEL': '钢铁风暴',
  'CARD.STRANGLE': '勒杀',
  'CARD.SUCKER_PUNCH': '偷袭',
  'CARD.TACTICIAN': '战术家',
  'CARD.TERROR': '恐惧',
  'CARD.THE_HUNT': '猎杀',
  'CARD.TOOLS_OF_THE_TRADE': '行当工具',
  'CARD.UNLOAD': '卸载',
  'CARD.WELL_LAID_PLANS': '精心策划',
  'CARD.WRAITH_FORM': '幽灵形态',

  // ── Ironclad ──
  'CARD.STRIKE_IRONCLAD': '打击（铁甲）',
  'CARD.DEFEND_IRONCLAD': '防御（铁甲）',
  'CARD.BASH': '重击',
  'CARD.ANGER': '愤怒',
  'CARD.ARMAMENTS': '武装',
  'CARD.BODY_SLAM': '身体冲撞',
  'CARD.CLASH': '碰撞',
  'CARD.CLEAVE': '劈砍',
  'CARD.CLOTHESLINE': '横扫',
  'CARD.FLEX': '炫耀',
  'CARD.HEAVY_BLADE': '重刃',
  'CARD.IRON_WAVE': '铁波',
  'CARD.PERFECTED_STRIKE': '完美打击',
  'CARD.POMMEL_STRIKE': '剑柄打击',
  'CARD.SHRUG_IT_OFF': '不在乎',
  'CARD.SWORD_BOOMERANG': '回旋剑',
  'CARD.THUNDERCLAP': '雷击',
  'CARD.TRUE_GRIT': '真勇气',
  'CARD.TWIN_STRIKE': '双重打击',
  'CARD.WARCRY': '战吼',
  'CARD.WILD_STRIKE': '狂野打击',

  // ── Special / event cards ──
  'CARD.FOLLOW_THROUGH': '贯穿',
  'CARD.MAYHEM': '混乱',
  'CARD.SPOILS_MAP': '战利地图',
};

// ─── Relics ───────────────────────────────────────────────────────────────────

const RELICS = {
  // ── Silent starters ──
  'RELIC.RING_OF_THE_SNAKE': '蛇纹戒指',

  // ── Common ──
  'RELIC.AKABEKO': '红牛',
  'RELIC.ANCHOR': '锚点',
  'RELIC.ANCIENT_TEA_SET': '古老茶具组',
  'RELIC.ART_OF_WAR': '孙子兵法',
  'RELIC.BAG_OF_MARBLES': '弹珠袋',
  'RELIC.BAG_OF_PREPARATION': '准备袋',
  'RELIC.BLOOD_VIAL': '血瓶',
  'RELIC.BRONZE_SCALES': '青铜鳞片',
  'RELIC.LANTERN': '灯笼',
  'RELIC.NUNCHAKU': '双节棍',
  'RELIC.ODD_MUSHROOM': '奇怪蘑菇',
  'RELIC.ORICHALCUM': '精金',
  'RELIC.PEN_NIB': '笔尖',
  'RELIC.PRESERVED_BUG': '保存的虫子',
  'RELIC.RED_SKULL': '红色骷髅头',
  'RELIC.SMILING_MASK': '微笑面具',
  'RELIC.SNAKE_SKULL': '蛇颅骨',
  'RELIC.STRAWBERRY': '草莓',
  'RELIC.THE_BOOT': '靴子',
  'RELIC.TINY_CHEST': '小宝箱',
  'RELIC.TOY_ORNITHOPTER': '玩具扑翼机',
  'RELIC.VAJRA': '金刚杵',
  'RELIC.WAR_PAINT': '战争彩绘',
  'RELIC.WHETSTONE': '磨刀石',

  // ── Uncommon ──
  'RELIC.BLUE_CANDLE': '蓝色蜡烛',
  'RELIC.BOTTLED_FLAME': '瓶装火焰',
  'RELIC.BOTTLED_LIGHTNING': '瓶装闪电',
  'RELIC.BOTTLED_TORNADO': '瓶装龙卷风',
  'RELIC.DARKSTONE_PERIAPT': '暗石护符',
  'RELIC.ETERNAL_FEATHER': '永恒羽毛',
  'RELIC.FROZEN_EGG': '冷冻蛋',
  'RELIC.GREMLIN_HORN': '小恶魔角',
  'RELIC.HORN_CLEAT': '角形系缆栓',
  'RELIC.INK_BOTTLE': '墨水瓶',
  'RELIC.KUNAI': '飞镖',
  'RELIC.LETTER_OPENER': '拆信刀',
  'RELIC.MATRYOSHKA': '套娃',
  'RELIC.MEAT_ON_THE_BONE': '骨上肉',
  'RELIC.MERCURY_HOURGLASS': '水银沙漏',
  'RELIC.MOLTEN_EGG': '熔岩蛋',
  'RELIC.MUMMIFIED_HAND': '木乃伊手',
  'RELIC.OMAMORI': '护身符',
  'RELIC.ORNAMENTAL_FAN': '装饰扇',
  'RELIC.PAPER_FROG': '纸青蛙',
  'RELIC.PAPER_KRANE': '纸鹤',
  'RELIC.PEAR': '梨子',
  'RELIC.POTION_BELT': '药水腰带',
  'RELIC.QUESTION_CARD': '问号牌',
  'RELIC.SHURIKEN': '忍者镖',
  'RELIC.SINGING_BOWL': '颂钵',
  'RELIC.STRIKE_DUMMY': '打击靶子',
  'RELIC.SUNDIAL': '日晷',
  'RELIC.SYMBIOTIC_VIRUS': '共生病毒',
  'RELIC.TEARDROP_LOCKET': '泪珠锁坠',
  'RELIC.TOOLBOX': '工具箱',
  'RELIC.TOXIC_EGG': '有毒蛋',

  // ── Rare ──
  'RELIC.BIRDFACED_URN': '鸟面瓮',
  'RELIC.CALIPERS': '卡尺',
  'RELIC.CAPTAINS_WHEEL': '船长轮盘',
  'RELIC.DEAD_BRANCH': '枯树枝',
  'RELIC.DU_VU_DOLL': '巫毒娃娃',
  'RELIC.EMOTION_CHIP': '情绪芯片',
  'RELIC.GAMBLING_CHIP': '赌筹码',
  'RELIC.GINGER': '生姜',
  'RELIC.GIRYA': '哑铃',
  'RELIC.ICE_CREAM': '冰淇淋',
  'RELIC.INCENSE_BURNER': '香炉',
  'RELIC.LIZARD_TAIL': '蜥蜴尾巴',
  'RELIC.MAGIC_FLOWER': '魔法花朵',
  'RELIC.MANGO': '芒果',
  'RELIC.OLD_COIN': '古币',
  'RELIC.PEACE_PIPE': '和平烟斗',
  'RELIC.POCKETWATCH': '怀表',
  'RELIC.PRAYER_WHEEL': '转经筒',
  'RELIC.SHOVEL': '铲子',
  'RELIC.STONE_CALENDAR': '石历法',
  'RELIC.THE_SPECIMEN': '标本',
  'RELIC.THREAD_AND_NEEDLE': '针线',
  'RELIC.TORII': '鸟居',
  'RELIC.TOUGH_BANDAGES': '坚硬绷带',
  'RELIC.UNCEASING_TOP': '不停的陀螺',
  'RELIC.WING_BOOTS': '翼靴',

  // ── Boss ──
  'RELIC.BLACK_STAR': '黑星',
  'RELIC.BUSTED_CROWN': '破损王冠',
  'RELIC.CAULDRON': '大锅',
  'RELIC.CURSED_KEY': '诅咒钥匙',
  'RELIC.ECTOPLASM': '外质',
  'RELIC.EMPTY_CAGE': '空笼子',
  'RELIC.FUSION_HAMMER': '融合锤',
  'RELIC.PANDORAS_BOX': '潘多拉魔盒',
  'RELIC.PHILOSOPHERS_STONE': '点金石',
  'RELIC.RUNIC_DOME': '符文圆顶',
  'RELIC.RUNIC_PYRAMID': '符文金字塔',
  'RELIC.SACRED_BARK': '神圣树皮',
  'RELIC.SLAVERS_COLLAR': '奴隶主项圈',
  'RELIC.SNECKO_EYE': '蛇蝎之眼',
  'RELIC.SOZU': '竹水筒',
  'RELIC.TINY_HOUSE': '小房子',
  'RELIC.VELVET_CHOKER': '丝绒项圈',
  'RELIC.VIOLET_LOTUS': '紫莲花',

  // ── STS2-specific ──
  'RELIC.GOLDEN_PEARL': '金珍珠',
  'RELIC.PRECISE_SCISSORS': '精准剪刀',
  'RELIC.SCROLL_BOXES': '卷轴盒',
  'RELIC.TEA_OF_DISCOURTESY': '失礼茶',
  'RELIC.KUSARIGAMA': '锁镰',
  'RELIC.BEATING_REMNANT': '跳动残骸',
};

// ─── Encounters / Bosses / Elites ─────────────────────────────────────────────

const ENCOUNTERS = {
  // ── Act 1 Bosses ──
  'ENCOUNTER.WATERFALL_GIANT_BOSS': '瀑布巨人（Boss）',
  'ENCOUNTER.LAGOON_TITAN_BOSS': '海湾泰坦（Boss）',

  // ── Act 1 Elites ──
  'ENCOUNTER.TERROR_EEL_ELITE': '恐惧鳗鱼（精英）',
  'ENCOUNTER.GORGON_ELITE': '戈尔贡（精英）',
  'ENCOUNTER.BYRDOIDS_ELITE': '多尼斯异鸟（精英）',
  'ENCOUNTER.ENTOMANCER_ELITE': '蜂群术士（精英）',
  'ENCOUNTER.BYGONE_EFFIGY_ELITE': '旧日雕像（精英）',
  'ENCOUNTER.DECIMILLIPEDE_ELITE': '千足虫（精英）',
  'ENCOUNTER.INFESTED_PRISMS_ELITE': '感染棱柱（精英）',
  'ENCOUNTER.KNIGHTS_ELITE': '幽灵骑士（精英）',
  'ENCOUNTER.MECHA_KNIGHT_ELITE': '机甲骑士（精英）',
  'ENCOUNTER.PHANTASMAL_GARDENERS_ELITE': '幻影园丁（精英）',
  'ENCOUNTER.PHROG_PARASITE_ELITE': '蛙类寄生虫（精英）',
  'ENCOUNTER.SKULKING_COLONY_ELITE': '潜行集群（精英）',
  'ENCOUNTER.SOUL_NEXUS_ELITE': '灵魂枢纽（精英）',

  // ── Act 1 Common ──
  'ENCOUNTER.TOADPOLES_WEAK': '蟾蜍蝌蚪',
  'ENCOUNTER.TOADPOLE': '蟾蜍蝌蚪',
  'ENCOUNTER.SEWER_CLAM_NORMAL': '下水道蛤蜊',
  'ENCOUNTER.PUNCH_CONSTRUCT_NORMAL': '冲击构装体',
  'ENCOUNTER.CALCIFIED_CULTIST': '钙化信徒',
  'ENCOUNTER.DAMP_CULTIST': '潮湿信徒',

  // ── Events ──
  'EVENT.THE_LEGENDS_WERE_TRUE': '传说是真的（事件）',
  'EVENT.TEA_MASTER': '茶道大师（事件）',
};

// ─── Potions ─────────────────────────────────────────────────────────────────

const POTIONS = {
  'POTION.EXPLOSIVE_AMPOULE': '爆炸安瓿',
  'POTION.SPEED_POTION': '速度药水',
  'POTION.CLARITY': '清醒药水',
  'POTION.ATTACK_POTION': '攻击药水',
  'POTION.POWER_POTION': '力量药水',
  'POTION.WEAK_POTION': '虚弱药水',
  'POTION.SHIP_IN_A_BOTTLE': '瓶中船',
  'POTION.BLOCK_POTION': '格挡药水',
  'POTION.DEXTERITY_POTION': '敏捷药水',
  'POTION.ENERGY_POTION': '能量药水',
  'POTION.FIRE_POTION': '火焰药水',
  'POTION.FRUIT_JUICE': '果汁',
  'POTION.FAIRY_IN_A_BOTTLE': '瓶中仙子',
  'POTION.FLEX_POTION': '健壮药水',
  'POTION.GHOST_IN_A_JAR': '罐中鬼',
  'POTION.POISON_POTION': '毒药',
};

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Translate a game ID to Chinese.
 * Falls back to stripping the prefix and formatting the raw name.
 *
 * @param {string} id   - e.g. "CARD.DAGGER_THROW", "RELIC.TOOLBOX"
 * @param {'card'|'relic'|'encounter'|'potion'|'character'} [hint]
 * @returns {string}    Chinese name, or formatted raw ID if unknown
 */
function translate(id, hint) {
  if (!id) return '未知';

  // Try each dictionary in order
  if (CHARACTERS[id]) return CHARACTERS[id];
  if (RELICS[id]) return RELICS[id];
  if (CARDS[id]) return CARDS[id];
  if (ENCOUNTERS[id]) return ENCOUNTERS[id];
  if (POTIONS[id]) return POTIONS[id];

  // Fallback: strip prefix, replace underscores
  const name = id.includes('.') ? id.split('.').slice(1).join('.') : id;
  return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Translate a character ID to Chinese (with English in parentheses).
 */
function translateCharacter(id) {
  const map = {
    'CHARACTER.SILENT': '静默猎手（Silent）',
    'CHARACTER.IRONCLAD': '铁甲战士（Ironclad）',
    'CHARACTER.DEFECT': '故障机器人（Defect）',
    'CHARACTER.WATCHER': '守望者（Watcher）',
    'CHARACTER.REGENT': '储君（Regent）',
    'CHARACTER.NECROBINDER': '亡灵契约师（Necrobinder）',
  };
  return map[id] || translate(id);
}

module.exports = { translate, translateCharacter, CHARACTERS, CARDS, RELICS, ENCOUNTERS, POTIONS };
