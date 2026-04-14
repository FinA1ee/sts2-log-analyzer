const https = require('https');
const fs = require('fs');

const HOST = 'open.feishu.cn';
const APP_ID = 'cli_a95707b1df24dbb5';
const APP_SECRET = 'IWRVbqyBb1kkyHtqSbryTfABgpGN4aY4';

let _token = null;

function getToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET });
    const opts = { hostname: HOST, path: '/open-apis/auth/v3/tenant_access_token/internal', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = https.request(opts, (res) => { let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => { _token = JSON.parse(d).tenant_access_token; resolve(_token); }); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = { hostname: HOST, path, method: 'POST', headers: { 'Authorization': 'Bearer ' + _token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = https.request(opts, (res) => { let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('Not JSON: ' + d)); } }); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const els = [];
  for (const p of parts) {
    if (!p) continue;
    if (/^\*\*(.+)\*\*$/.test(p)) {
      els.push({ text_run: { content: p.replace(/^\*\*|\*\*$/g, ''), text_element_style: { bold: true } } });
    } else {
      els.push({ text_run: { content: p, text_element_style: {} } });
    }
  }
  return els.length ? els : [{ text_run: { content: text, text_element_style: {} } }];
}

// All headings become bold paragraphs
function h1(text) { return { block_type: 2, text: { elements: parseInline('【 ' + text + ' 】'), style: {} } }; }
function h2(text) { return { block_type: 2, text: { elements: parseInline('◆ ' + text), style: {} } }; }
function h3(text) { return { block_type: 2, text: { elements: parseInline('▶ ' + text), style: {} } }; }
function para(text) { return { block_type: 2, text: { elements: parseInline(text), style: {} } }; }
function blank() { return { block_type: 2, text: { elements: [{ text_run: { content: ' ', text_element_style: {} } }], style: {} } }; }

function mdToBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  for (const line of lines) {
    if (/^# /.test(line)) { blocks.push(h1(line.replace(/^# /, '').trim())); continue; }
    if (/^## /.test(line)) { blocks.push(h2(line.replace(/^## /, '').trim())); continue; }
    if (/^### /.test(line)) { blocks.push(h3(line.replace(/^### /, '').trim())); continue; }
    if (/^---+$/.test(line.trim())) { blocks.push(blank()); continue; }
    if (/^- /.test(line)) { blocks.push(para('• ' + line.replace(/^- /, '').trim())); continue; }
    if (/^\|/.test(line)) {
      if (/^\|[-| :]+\|$/.test(line.trim())) continue;
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      blocks.push(para(cells.join('  |  ')));
      continue;
    }
    if (/^>/.test(line)) { blocks.push(para(line.replace(/^> /, '').trim())); continue; }
    if (line.trim() === '') { blocks.push(blank()); continue; }
    blocks.push(para(line.trim()));
  }
  return blocks;
}

async function main() {
  await getToken();
  console.log('Got token');

  const create = await apiPost('/open-apis/docx/v1/documents', { folder_token: '', title: '🏹 猎人飞刀流完全指南 | STS2 复盘' });
  if (create.code !== 0) throw new Error('Create failed: ' + JSON.stringify(create));

  const docId = create.data.document.document_id;
  const url = 'https://open.feishu.cn/docx/' + docId;
  console.log('Created:', url);

  const content = fs.readFileSync('/tmp/hunter_guide_feishu.md', 'utf8');
  const blocks = mdToBlocks(content);
  console.log('Total blocks:', blocks.length);

  const CHUNK = 30;
  for (let i = 0; i < blocks.length; i += CHUNK) {
    const chunk = blocks.slice(i, i + CHUNK);
    const res = await apiPost('/open-apis/docx/v1/documents/' + docId + '/blocks/' + docId + '/children', { children: chunk, index: -1 });
    if (res.code !== 0) {
      console.error('Error at block', i, ':', res.code, res.msg);
      break;
    }
    process.stdout.write('.');
  }

  console.log('\n✅ Done! ' + url);
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });