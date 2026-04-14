# STS2 Weekly Analysis Cron Prompt

This file contains the prompt to register as an OpenClaw cron job.
It runs every Monday at 09:00 (local time) and delivers a weekly
AI-enriched Feishu Doc summarizing the past week of Slay the Spire 2 games.

## Cron Schedule

```
Schedule: Every Monday 09:00 local time
Cron expression (UTC+8): 0 1 * * 1
```

## The Cron Prompt

```
You are running the STS2 weekly analysis job. Follow these steps exactly:

STEP 1 — Run the weekly aggregator script:
  cd <path-to>/sts2-log-analysis && node weekly.js

STEP 2 — Read the JSON block printed between
  "--- WEEKLY_STATS_JSON_BEGIN ---" and "--- WEEKLY_STATS_JSON_END ---"
  in the script output.

STEP 3 — Write a strategic analysis section in Chinese that includes:
  a) **胜率分析**: Comment on the win rate. Is it improving or declining?
  b) **阵亡原因**: Based on the defeat hotspots, diagnose WHY the player is dying.
  c) **遗物策略**: Compare relics in winning vs losing runs. Recommend priorities.
  d) **3~5条具体建议**: Give 3-5 actionable improvement tips referencing actual
     encounter names and relic names from the stats.
  e) **本周亮点**: Highlight the best run of the week.

STEP 4 — Create a Feishu Doc with the full report (stats + your analysis).
  The script will handle doc creation. Insert your analysis where you see:
  <!-- AI_ANALYSIS_PLACEHOLDER -->

STEP 5 — Send a Feishu message to the configured TARGET_ID with:
  - A 2-3 sentence summary of the week
  - The doc link (printed as DOC_URL=... in the script output)

Keep your analysis grounded in the data. Be specific, not generic.
Write the analysis section entirely in Chinese.
```

## How to Register in OpenClaw

Tell the agent in Feishu:

> "设置一个每周一早上9点运行的定时任务，使用 sts2-log-analysis/CRON_PROMPT.md 里的提示词，每周生成一份杀戮尖塔2周报飞书文档"

## Manual Trigger

> "手动触发一次 STS2 周报分析"
> "现在生成本周的杀戮尖塔周报"
> "run sts2 weekly analysis now"
