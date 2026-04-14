# SKILL.md - STS2 Log Analyzer (OpenClaw Integration)

## ⚡ ALWAYS USE .run FILES — NOT GODOT LOGS

The `.run` files are the canonical game save records and contain far richer data.
Godot logs (`godot.log`) are a last resort only when no `.run` files exist.

**Default command** (always start here):
```bash
cd <workspace>/sts2-log-analysis && node script.js
```
This automatically reads the newest `.run` file. Only add `USE_GODOT_LOG=true`
if the user explicitly asks or no `.run` files exist.

---

## How the Agent Decides What to Run

```
User message received
        │
        ▼
Does message mention a specific date? (e.g. "昨天", "4月13号", "yesterday")
        │
   YES ─┤                                NO
        │                                 │
        ▼                                 ▼
findRunFilesForDate('YYYY-MM-DD')    Does message mention a specific run?
(pure filename math, no file reads)  (e.g. "上一局", "那场赢的", "seed R66U...")
        │                                 │
        ▼                            YES ─┤        NO
List matching .run files                  │         │
(may be 0, 1, or many that day)           ▼         ▼
        │                         Ask user to       findLatestRunFile()
        ▼                         clarify which     → analyze that one
If multiple: show list, ask which        one
If one:      analyze it directly
If zero:     "那天没有找到记录"
```

---

## When to Use Which Command

| User says | Command |
|---|---|
| "分析最新的战局" / "帮我看看今天" / default | `node script.js` |
| "分析昨天的战局" | `RUN_DATE=2026-04-13 node script.js` |
| "4月12号那几场" | `RUN_DATE=2026-04-12 node script.js` |
| "列出最近的战局记录" | `node script.js --list` |
| "分析那场种子是 R66U 的" | find matching file, then `RUN_FILE=<name> node script.js` |
| "本周周报" | `node weekly.js` |
| "强制用 godot log" (rare) | `USE_GODOT_LOG=true node script.js` |

---

## Key: .run Filenames ARE the Unix Timestamp

```
1776095967.run
│
└─ Unix timestamp (seconds since epoch)
   = 2026-04-14 16:39:27 CST
```

**No file reads needed to find runs by date.** The parser filters by
comparing the timestamp in the filename to the requested date range.
A 289-file directory filters in <5ms.

---

## Run Commands Reference

```bash
# Latest run (default)
node script.js

# Specific date — finds all runs that started on that day (CST)
RUN_DATE=2026-04-13 node script.js

# Specific file
RUN_FILE=1776095967.run node script.js

# List recent .run files (shows date + result for each)
node script.js --list

# Dry run (print report, no Feishu)
DRY_RUN=true node script.js

# No doc, just chat card
CREATE_DOC=false node script.js

# Weekly summary (last 7 days)
node weekly.js

# Weekly for last 14 days
DAYS_BACK=14 node weekly.js
```

---

## Data Source Priority

```
1. ✅ PREFERRED: .run files
   Path: ~/Library/Application Support/SlayTheSpire2/steam/<STEAM_ID>/profile1/saves/history/
   Format: JSON, one file per completed run
   Contains: floor-by-floor HP/gold/cards/relics, Neow choice, deck, outcome

2. ⚠️  FALLBACK: Godot logs (USE_GODOT_LOG=true only)
   Path: ~/Library/Application Support/SlayTheSpire2/logs/godot.log
   Use when: user explicitly requests, or no .run files found
```

---

## Looking Up Runs by Date — Detail

The agent should:
1. Parse the date from the user's message (convert "昨天"→yesterday's date, "上周一"→last Monday, etc.)
2. Format as `YYYY-MM-DD` in CST
3. Pass as `RUN_DATE=<date>` — script will call `findRunFilesForDate()` internally
4. If multiple runs on that date: list them all with time + result, ask which to analyze
5. If zero runs on that date: tell the user no sessions were found

The script handles the rest — no manual file searching needed.

---

## File Map

| File | Purpose |
|------|---------|
| `script.js` | Single-run analysis entry point |
| `weekly.js` | Multi-session weekly analysis |
| `run-parser.js` | Parse `.run` JSON files; `findRunFilesForDate()` for date lookup |
| `run-report.js` | Rich 12-section report from `.run` data |
| `parser.js` | Godot `.log` parser (fallback only) |
| `weekly-aggregator.js` | Aggregate Godot log sessions |
| `report.js` | Markdown report from Godot log data |
| `feishu.js` | Feishu chat messages |
| `feishu-doc.js` | Feishu cloud document creator |
| `CRON_PROMPT.md` | Weekly cron job prompt |

---

## Dependencies

```bash
npm install
```
