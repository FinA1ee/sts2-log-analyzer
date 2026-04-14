/**
 * feishu.js - Feishu (Lark) API Integration
 *
 * Sends the STS2 analysis report to a Feishu channel using the
 * Bot credentials configured in OpenClaw's openclaw.json.
 *
 * Exports:
 *   sendToFeishu(reportMd, summary, opts)  - send report as chat card/text
 *   sendDocLinkCard(docUrl, docTitle, summary) - send doc link card in chat
 *   getTenantToken()                        - get auth token (shared)
 *
 * Uses Feishu's "interactive card" message type for a rich presentation.
 * Docs: https://open.feishu.cn/document/server-docs/im-v1/message/create
 */

const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────

// Load from environment variables (copy .env.example → .env and fill in your values)
// Required: FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_TARGET_ID
const CONFIG = {
  APP_ID:      requireEnv('FEISHU_APP_ID'),
  APP_SECRET:  requireEnv('FEISHU_APP_SECRET'),
  TARGET_ID:   requireEnv('FEISHU_TARGET_ID'),
  TARGET_TYPE: process.env.FEISHU_TARGET_TYPE || 'open_id', // 'open_id' | 'chat_id'
  BASE_URL:    'https://open.feishu.cn',
};

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}\nCopy .env.example to .env and fill in your values.`);
  return val;
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Get a tenant_access_token from Feishu.
 * @returns {string} Token string
 */
async function getTenantToken() {
  const payload = JSON.stringify({
    app_id: CONFIG.APP_ID,
    app_secret: CONFIG.APP_SECRET,
  });

  const options = {
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const { status, body } = await httpRequest(options, payload);
  if (status !== 200 || body.code !== 0) {
    throw new Error(`Failed to get Feishu token: ${JSON.stringify(body)}`);
  }
  return body.tenant_access_token;
}

// ─── Message builders ─────────────────────────────────────────────────────────

/**
 * Build a Feishu interactive card message with the report content.
 * @param {string} reportMd - Markdown report text
 * @param {Object} summary - Quick summary object { runs, defeats, victories, maxFloor }
 * @returns {Object} Message payload for Feishu API
 */
function buildCardMessage(reportMd, summary) {
  // Feishu card: uses their card DSL (not raw markdown)
  // We embed the full report in a markdown element inside the card.
  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: {
        tag: 'plain_text',
        content: '🗡️ 杀戮尖塔 2 战局报告',
      },
      template: summary.defeats > 0 ? 'red' : 'green',
    },
    elements: [
      {
        tag: 'div',
        fields: [
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**战局数**\n${summary.runs} 局`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**胜 / 负**\n🏆 ${summary.victories} 胜 / 💀 ${summary.defeats} 负`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**最高楼层**\nFloor ${summary.maxFloor}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**QR 次数**\n${summary.totalRestarts} 次`,
            },
          },
        ],
      },
      { tag: 'hr' },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          // Truncate to Feishu's ~4096 char limit for card element
          content: reportMd.length > 4000
            ? reportMd.slice(0, 3900) + '\n\n...(内容过长，请查看完整报告文件)'
            : reportMd,
        },
      },
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '由 OpenClaw Agent 自动分析生成 | Slay the Spire 2 v0.99+',
          },
        ],
      },
    ],
  };

  return {
    receive_id: CONFIG.TARGET_ID,
    msg_type: 'interactive',
    content: JSON.stringify(card),
  };
}

/**
 * Build a simple text message (fallback if card fails).
 */
function buildTextMessage(reportMd) {
  return {
    receive_id: CONFIG.TARGET_ID,
    msg_type: 'text',
    content: JSON.stringify({ text: reportMd.slice(0, 4000) }),
  };
}

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Send the report to Feishu.
 * @param {string} reportMd - Markdown report text
 * @param {Object} summary - Quick summary stats
 * @param {Object} opts - Options: { dryRun, useCard }
 */
async function sendToFeishu(reportMd, summary, opts = {}) {
  const { dryRun = false, useCard = true } = opts;

  if (dryRun) {
    console.log('[DRY RUN] Would send to Feishu:');
    console.log('Summary:', summary);
    console.log('Report length:', reportMd.length, 'chars');
    console.log('--- Report Preview (first 500 chars) ---');
    console.log(reportMd.slice(0, 500));
    return { success: true, dryRun: true };
  }

  try {
    console.log('[Feishu] Getting tenant token...');
    const token = await getTenantToken();

    const message = useCard
      ? buildCardMessage(reportMd, summary)
      : buildTextMessage(reportMd);

    const payload = JSON.stringify(message);
    const options = {
      hostname: 'open.feishu.cn',
      path: `/open-apis/im/v1/messages?receive_id_type=${CONFIG.TARGET_TYPE}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    console.log('[Feishu] Sending message...');
    const { status, body } = await httpRequest(options, payload);

    if (status !== 200 || body.code !== 0) {
      console.error('[Feishu] Send failed:', JSON.stringify(body));
      return { success: false, error: body };
    }

    console.log('[Feishu] ✅ Message sent! message_id:', body.data?.message_id);
    return { success: true, messageId: body.data?.message_id };

  } catch (err) {
    console.error('[Feishu] Error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a Feishu card with a button that links to the created cloud doc.
 * @param {string} token - Already-fetched tenant_access_token
 * @param {string} docUrl - URL of the Feishu Doc
 * @param {string} docTitle - Title of the doc
 * @param {Object} summary - { runs, defeats, victories, maxFloor }
 */
async function sendDocLinkCard(token, docUrl, docTitle, summary) {
  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📄 STS2 战局报告已生成' },
      template: summary.defeats > 0 ? 'red' : 'green',
    },
    elements: [
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: `**战局数**\n${summary.runs} 局` } },
          { is_short: true, text: { tag: 'lark_md', content: `**胜 / 负**\n🏆 ${summary.victories} 胜 / 💀 ${summary.defeats} 负` } },
          { is_short: true, text: { tag: 'lark_md', content: `**最高楼层**\nFloor ${summary.maxFloor}` } },
          { is_short: true, text: { tag: 'lark_md', content: `**QuickRestart**\n${summary.totalRestarts} 次` } },
        ],
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '📖 打开完整报告文档' },
            type: 'primary',
            url: docUrl,
          },
        ],
      },
      {
        tag: 'note',
        elements: [{ tag: 'plain_text', content: `文档：${docTitle}` }],
      },
    ],
  };

  const message = {
    receive_id: CONFIG.TARGET_ID,
    msg_type: 'interactive',
    content: JSON.stringify(card),
  };

  const payload = JSON.stringify(message);
  const options = {
    hostname: 'open.feishu.cn',
    path: `/open-apis/im/v1/messages?receive_id_type=${CONFIG.TARGET_TYPE}`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const { status, body } = await httpRequest(options, payload);
  if (status !== 200 || body.code !== 0) {
    console.error('[Feishu] Doc link card send failed:', JSON.stringify(body));
    return { success: false, error: body };
  }
  console.log('[Feishu] ✅ Doc link card sent!');
  return { success: true };
}

module.exports = { sendToFeishu, sendDocLinkCard, getTenantToken };
