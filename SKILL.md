# SKILL.md - STS2 Log Analyzer (OpenClaw Integration)

## What This Does

Analyzes Slay the Spire 2 game logs and posts a formatted run report to Feishu.
Works with both `.run` save files (preferred) and Godot engine logs.

## When to Use

Use this tool when the user says things like:
- "分析/查看今天的杀戮尖塔日志"
- "杀戮尖塔打了什么"
- "生成战局报告"
- "analyze my sts2/slay the spire run"
- "what did I play in Slay the Spire 2 today"
- Any question about their recent STS2 game sessions

## How to Run

### Default: Create Feishu Doc + send link card to chat
```bash
cd <workspace>/sts2-log-analysis
node script.js
# → Reads latest .run save file
# → Creates a cloud doc titled "[STS2] YYYY-MM-DD 战局报告 💀 阵亡 Floor N"
# → Sends an interactive card to Feishu chat with a "打开完整报告文档" button
```

### Only send inline chat card (no doc):
```bash
CREATE_DOC=false node script.js
```

### Dry run (print report locally, no Feishu):
```bash
DRY_RUN=true SAVE_REPORT=true node script.js
```

### Analyze a specific .run file:
```bash
RUN_FILE="1776095967.run" node script.js
```

### Analyze a specific historical Godot log:
```bash
USE_GODOT_LOG=true LOG_FILE="godot2026-04-13T11.00.54.log" node script.js
```

### Store doc in a specific Feishu Drive folder:
```bash
FEISHU_FOLDER_TOKEN="<folder_token>" node script.js
```

### List available .run files:
```bash
ls ~/Library/Application\ Support/SlayTheSpire2/steam/<STEAM_ID>/profile1/saves/history/
```

## Data Sources

### Primary: `.run` files (structured JSON — preferred)
```
~/Library/Application Support/SlayTheSpire2/steam/<STEAM_ID>/profile1/saves/history/
├── 1776095967.run    ← unix timestamp filename
├── 1776078236.run
└── ...               (289+ files retained)
```

### Fallback: Godot engine logs
```
~/Library/Application Support/SlayTheSpire2/logs/
├── godot.log                      ← current session
└── godot<timestamp>.log           ← historical sessions
```

## Output

- **Feishu Doc**: Full floor-by-floor report with deck, relics, timeline
- **Feishu chat card**: Summary stats + "打开完整报告文档" button
- **Reports dir**: `reports/sts2-report-<timestamp>.md` (when SAVE_REPORT=true)

## Weekly Analysis Job

Run `weekly.js` to aggregate the last 7 days across all runs.

### Manual trigger phrases:
- "生成本周的杀戮尖塔周报"
- "STS2 weekly report"
- "手动触发 STS2 周报"

### Run command:
```bash
node weekly.js              # default: last 7 days
DAYS_BACK=14 node weekly.js # last 2 weeks
DRY_RUN=true node weekly.js # dry run
```

### Cron job (auto, every Monday 09:00):
See `CRON_PROMPT.md` for the full prompt and registration instructions.

---

## File Map

| File | Purpose |
|------|---------|
| `script.js` | Single-run analysis entry point |
| `weekly.js` | Multi-session weekly analysis entry point |
| `run-parser.js` | Parse `.run` JSON files → structured data |
| `run-report.js` | Rich report from `.run` data |
| `parser.js` | Parse Godot `.log` files (fallback) |
| `weekly-aggregator.js` | Merge multiple Godot log sessions |
| `report.js` | Per-session Markdown report (Godot log) |
| `feishu.js` | Feishu chat messages |
| `feishu-doc.js` | Feishu cloud document creator |
| `CRON_PROMPT.md` | Cron job prompt for weekly auto-run |

---

## Dependencies

```bash
npm install
```
