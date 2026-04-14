# 🗡️ STS2 Log Analyzer

> Automatically analyze **Slay the Spire 2** game sessions and publish rich reports to **Feishu (Lark)** — as cloud documents and interactive chat cards.

Works with both the structured `.run` save files (preferred, full floor-by-floor data) and Godot engine log files (fallback).

---

## Features

- 📂 **Auto-discovers** the latest `.run` save file — no manual path needed
- 🔍 **Floor-by-floor analysis**: HP, gold, card choices, relic picks, camp decisions
- 📊 **Rich report**: final deck, relics in order, defeat cause, timeline table
- 📄 **Feishu Doc**: creates a cloud document with the full report
- 💬 **Feishu chat card**: sends a summary card with a link to the doc
- 📅 **Weekly job**: aggregates 7 days of runs with AI-generated strategy recommendations
- 🤖 **OpenClaw integration**: trigger via natural language in Feishu chat

---

## Data Sources

### Primary: `.run` files (structured JSON — macOS path)
```
~/Library/Application Support/SlayTheSpire2/steam/<STEAM_ID>/profile1/saves/history/
```
Each file is named by Unix timestamp and contains the full run record: acts visited, every floor's room type, HP/gold deltas, card choices offered (picked + skipped), relic choices, rest site decisions, seed, ascension, and outcome.

### Fallback: Godot engine logs
```
~/Library/Application Support/SlayTheSpire2/logs/godot.log
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/<you>/sts2-log-analysis.git
cd sts2-log-analysis
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Feishu App ID, Secret, and target user/chat ID
```

You'll need a **Feishu custom app** with these permissions:
- `im:message:send_as_bot` — send messages
- `docx:document` — create cloud documents
- `drive:drive` — access Drive (for folder placement)

### 3. Run

```bash
# Analyze latest run → create Feishu Doc → send link card
node script.js

# Dry run (print report, no Feishu)
DRY_RUN=true node script.js

# Weekly summary (last 7 days)
node weekly.js

# Analyze a specific .run file
RUN_FILE="1776095967.run" node script.js
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FEISHU_APP_ID` | ✅ | Feishu app ID (from open.feishu.cn) |
| `FEISHU_APP_SECRET` | ✅ | Feishu app secret |
| `FEISHU_TARGET_ID` | ✅ | Recipient `open_id` or `chat_id` |
| `FEISHU_TARGET_TYPE` | — | `open_id` (default) or `chat_id` |
| `FEISHU_FOLDER_TOKEN` | — | Drive folder to store docs in (empty = root) |
| `STEAM_ID` | — | Steam user ID (default: auto-detected from path) |
| `PROFILE` | — | Game profile name (default: `profile1`) |
| `CREATE_DOC` | — | `false` to send inline card instead of creating doc |
| `DRY_RUN` | — | `true` to print only, no Feishu |
| `SAVE_REPORT` | — | `true` to also save Markdown to `reports/` |
| `RUN_FILE` | — | Specific `.run` file to analyze |
| `USE_GODOT_LOG` | — | `true` to force Godot log mode |
| `LOG_FILE` | — | Specific Godot log filename |
| `DAYS_BACK` | — | Days to look back for weekly job (default: 7) |

---

## Report Contents

### Single run (`script.js`)
- Overview: character, result, floors reached, acts, duration, seed, ascension
- HP & gold economy
- Final deck with upgrade levels
- Relics in order obtained (with floor number)
- Camp decisions (Smith vs Rest)
- Card draft pick rate + most-skipped cards
- Floor-by-floor timeline table

### Weekly summary (`weekly.js`)
- Win rate + by-character breakdown
- Defeat hotspots (where you die most often)
- Relic intelligence: which relics appear in wins vs losses
- Card skip patterns
- Deck stats: average size, upgrade count
- Rest behavior: Smith vs Rest preference
- AI strategy recommendations (when run via OpenClaw agent)

---

## OpenClaw Integration

This project is designed to work as an [OpenClaw](https://openclaw.ai) agent skill.
The agent can trigger it via natural language messages in Feishu:

| You say | What happens |
|---|---|
| `分析最新的杀戮尖塔日志` | Analyzes latest `.run` file, creates Feishu Doc |
| `STS2 weekly report` | Runs weekly aggregator + AI analysis |
| `查一下上一局斯莱的战局` | Same as default |
| `DRY_RUN 一下战局分析` | Prints report without sending to Feishu |

See `SKILL.md` and `CRON_PROMPT.md` for the agent configuration.

---

## Project Structure

```
sts2-log-analysis/
├── script.js              Entry point — single run analysis
├── weekly.js              Entry point — weekly aggregation
├── run-parser.js          Parse .run JSON files + multi-run aggregator
├── run-report.js          Rich Markdown report from .run data
├── parser.js              Parse Godot .log files (fallback)
├── weekly-aggregator.js   Aggregate multiple Godot log sessions
├── report.js              Markdown report from Godot log data
├── feishu.js              Feishu chat message API
├── feishu-doc.js          Feishu cloud document API (Docx v1)
├── SKILL.md               OpenClaw agent instructions
├── CRON_PROMPT.md         Weekly cron job prompt for OpenClaw
├── .env.example           Environment variable template
└── reports/               Generated report archives (gitignored)
```

---

## License

MIT
