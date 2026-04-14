/**
 * feishu-doc.js - Feishu Cloud Doc Creator
 *
 * Uses the Feishu Docx API (v1) to:
 *   1. Create a new document in the user's Drive root (or a specified folder)
 *   2. Write the STS2 report as structured content blocks
 *   3. Return the document URL for sharing in chat
 *
 * Feishu Docx API docs:
 *   https://open.feishu.cn/document/server-docs/docs/docs/docx-v1/document/create
 *
 * Block type reference (docx v1):
 *   1  = Page (root, auto-created)
 *   2  = Paragraph (plain text)
 *   3  = Heading 1
 *   4  = Heading 2
 *   5  = Heading 3
 *   12 = Bullet list item
 *   22 = Divider (---)
 *   24 = Code block
 */

const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────

const FEISHU_HOST = 'open.feishu.cn';

// Optionally scope all docs to a particular Drive folder.
// Set FEISHU_FOLDER_TOKEN env var to a folder token from Feishu Drive.
// Leave empty to create docs in the root ("我的空间").
const FOLDER_TOKEN = process.env.FEISHU_FOLDER_TOKEN || '';

// ─── HTTP helper (shared pattern with feishu.js) ──────────────────────────────

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function makeOptions(path, method, token, contentLength) {
  return {
    hostname: FEISHU_HOST,
    path,
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': contentLength,
    },
  };
}

// ─── Markdown → Feishu Doc blocks ────────────────────────────────────────────

/**
 * Convert the report Markdown into an array of Feishu Docx block objects.
 * Handles: headings (h1–h3), bullets, dividers, tables (as text), code spans,
 * bold text, and plain paragraphs.
 *
 * @param {string} markdown
 * @returns {Array} Array of Feishu block objects
 */
function markdownToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Heading 1: # text ──
    if (/^# /.test(line)) {
      blocks.push(headingBlock(3, line.replace(/^# /, '').trim()));
      continue;
    }
    // ── Heading 2: ## text ──
    if (/^## /.test(line)) {
      blocks.push(headingBlock(4, line.replace(/^## /, '').trim()));
      continue;
    }
    // ── Heading 3: ### text ──
    if (/^### /.test(line)) {
      blocks.push(headingBlock(5, line.replace(/^### /, '').trim()));
      continue;
    }
    // ── Divider: --- ──
    if (/^---+$/.test(line.trim())) {
      blocks.push({ block_type: 22 }); // divider
      continue;
    }
    // ── Bullet: - text ──
    if (/^- /.test(line)) {
      blocks.push(bulletBlock(line.replace(/^- /, '').trim()));
      continue;
    }
    // ── Blockquote: > text ──
    if (/^> /.test(line)) {
      blocks.push(paragraphBlock(line.replace(/^> /, '').trim(), { italic: true }));
      continue;
    }
    // ── Table row: | col | col | ──
    if (/^\|/.test(line)) {
      // Skip separator rows (|---|---|)
      if (/^\|[-| :]+\|$/.test(line.trim())) continue;
      // Convert table row to a bullet-style paragraph
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      const text = cells.join('  │  ');
      blocks.push(paragraphBlock(text));
      continue;
    }
    // ── Italic line: *text* ──
    if (/^\*[^*]/.test(line.trim())) {
      blocks.push(paragraphBlock(line.trim().replace(/^\*|\*$/g, ''), { italic: true }));
      continue;
    }
    // ── Empty line → skip (Feishu handles spacing) ──
    if (line.trim() === '') continue;

    // ── Default: paragraph ──
    blocks.push(paragraphBlock(line.trim()));
  }

  return blocks;
}

// ─── Block constructors ───────────────────────────────────────────────────────

/**
 * Parse inline markdown (bold, code) into Feishu inline text_run elements.
 * Handles: **bold**, `code`, mixed text.
 */
function parseInlineElements(text) {
  const elements = [];
  // Split by **bold** and `code` markers
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  for (const part of parts) {
    if (!part) continue;
    if (/^\*\*(.+)\*\*$/.test(part)) {
      elements.push(textRun(part.replace(/^\*\*|\*\*$/g, ''), { bold: true }));
    } else if (/^`(.+)`$/.test(part)) {
      elements.push(textRun(part.replace(/^`|`$/g, ''), { inline_code: true }));
    } else {
      elements.push(textRun(part));
    }
  }

  return elements.length > 0 ? elements : [textRun(text)];
}

function textRun(content, style = {}) {
  return {
    text_run: {
      content,
      text_element_style: style,
    },
  };
}

function paragraphBlock(text, extraStyle = {}) {
  return {
    block_type: 2,
    text: {
      elements: parseInlineElements(text).map(el => ({
        text_run: {
          ...el.text_run,
          text_element_style: { ...el.text_run.text_element_style, ...extraStyle },
        },
      })),
      style: {},
    },
  };
}

function headingBlock(blockType, text) {
  return {
    block_type: blockType, // 3=h1, 4=h2, 5=h3
    text: {
      elements: parseInlineElements(text),
      style: {},
    },
  };
}

function bulletBlock(text) {
  return {
    block_type: 12, // bullet
    text: {
      elements: parseInlineElements(text),
      style: {},
    },
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Create a new Feishu Doc, optionally in a folder.
 * @param {string} token - tenant_access_token
 * @param {string} title - Document title
 * @returns {Object} { document_id, revision_id, url }
 */
async function createDocument(token, title) {
  const body = JSON.stringify({
    folder_token: FOLDER_TOKEN, // empty string = root
    title,
  });

  const { status, body: res } = await httpRequest(
    makeOptions('/open-apis/docx/v1/documents', 'POST', token, Buffer.byteLength(body)),
    body
  );

  if (status !== 200 || res.code !== 0) {
    throw new Error(`Create doc failed (${status}): ${JSON.stringify(res)}`);
  }

  const doc = res.data.document;
  return {
    documentId: doc.document_id,
    revisionId: doc.revision_id,
    url: `https://open.feishu.cn/docx/${doc.document_id}`,
  };
}

/**
 * Append content blocks to a document.
 * Uses the document_id as the parent block_id (= page root).
 *
 * Feishu limits batch inserts — we chunk to 50 blocks max per request.
 *
 * @param {string} token
 * @param {string} documentId
 * @param {Array} blocks - Array of Feishu block objects
 */
async function appendBlocks(token, documentId, blocks) {
  const CHUNK_SIZE = 50;

  for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
    const chunk = blocks.slice(i, i + CHUNK_SIZE);
    const body = JSON.stringify({
      children: chunk,
      index: -1, // append at end
    });

    const path = `/open-apis/docx/v1/documents/${documentId}/blocks/${documentId}/children`;
    const { status, body: res } = await httpRequest(
      makeOptions(path, 'POST', token, Buffer.byteLength(body)),
      body
    );

    if (status !== 200 || res.code !== 0) {
      throw new Error(`Append blocks failed at chunk ${i} (${status}): ${JSON.stringify(res)}`);
    }

    console.log(`      Wrote blocks ${i + 1}–${Math.min(i + CHUNK_SIZE, blocks.length)} / ${blocks.length}`);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Create a Feishu Doc with the report content.
 *
 * @param {string} reportMd - Markdown report from report.js
 * @param {Object} summary - { runs, defeats, victories, maxFloor }
 * @param {string} token - Feishu tenant_access_token
 * @returns {Object} { documentId, url }
 */
async function createReportDoc(reportMd, summary, token) {
  const date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const resultLabel = summary.victories > 0 ? '🏆 胜利' : summary.defeats > 0 ? '💀 阵亡' : '⏳ 进行中';
  const title = `[STS2] ${date} 战局报告 ${resultLabel} Floor ${summary.maxFloor}`;

  console.log(`[Doc] Creating document: "${title}"`);
  const doc = await createDocument(token, title);
  console.log(`[Doc] Created: ${doc.url}`);

  console.log(`[Doc] Converting Markdown to ${reportMd.split('\n').length} lines → blocks...`);
  const blocks = markdownToBlocks(reportMd);
  console.log(`      Generated ${blocks.length} blocks`);

  await appendBlocks(token, doc.documentId, blocks);
  console.log('[Doc] ✅ Content written successfully');

  return doc;
}

module.exports = { createReportDoc };
