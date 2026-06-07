'use strict';

const LS_KEY_PREFIX = 'yana-api-key-';

// ── Provider / model catalog ──────────────────────────────────────────────────
const PROVIDER_MODELS = {
  anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-8'],
  groq:      ['llama-3.3-70b-versatile', 'qwen-qwq-32b', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  openai:    ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
};

// ── Element refs ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Markdown renderer (no external deps) ──────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code class="md-ic">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderMd(raw) {
  const lines  = raw.split('\n');
  const out    = [];
  let inCode   = false, codeBuf = [];
  let inList   = false, listBuf = [];

  function flushList() {
    if (!inList) return;
    out.push('<ul class="md-ul">' + listBuf.map(l => `<li>${l}</li>`).join('') + '</ul>');
    listBuf = []; inList = false;
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCode) { flushList(); inCode = true; codeBuf = []; }
      else {
        inCode = false;
        out.push(`<pre class="md-pre"><code>${escHtml(codeBuf.join('\n'))}</code></pre>`);
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    const hm = line.match(/^(#{1,3}) (.*)/);
    if (hm) { flushList(); out.push(`<h${hm[1].length} class="md-h">${inlineMd(escHtml(hm[2]))}</h${hm[1].length}>`); continue; }

    const lm = line.match(/^[-*] (.*)/);
    if (lm) { inList = true; listBuf.push(inlineMd(escHtml(lm[1]))); continue; }

    const om = line.match(/^\d+\. (.*)/);
    if (om) { inList = true; listBuf.push(inlineMd(escHtml(om[1]))); continue; }

    if (!line.trim()) { flushList(); out.push('<br>'); continue; }

    flushList();
    out.push(`<p class="md-p">${inlineMd(escHtml(line))}</p>`);
  }

  flushList();
  if (inCode) out.push(`<pre class="md-pre"><code>${escHtml(codeBuf.join('\n'))}</code></pre>`);
  return out.join('');
}

const keyInput       = $('api-key-input');
const saveKeyBtn     = $('save-key-btn');
const keyStatus      = $('key-status');
const providerSelect = $('provider-select');
const modelSelect    = $('model-select');
const taskInput      = $('task-input');
const runBtn         = $('run-btn');
const routeCard      = $('route-card');
const routeValue     = $('route-value');
const gateValue      = $('gate-value');
const confidenceEl   = $('confidence-value');
const sourceBadge    = $('source-badge');
const skillRow       = $('skill-row');
const skillValue     = $('skill-value');
const agentsRow      = $('agents-row');
const agentsValue    = $('agents-value');
const signalsRow     = $('signals-row');
const signalsValue   = $('signals-value');
const reasonValue    = $('reason-value');
const resultCard     = $('result-card');
const resultText     = $('result-text');
const historyList    = $('history-list');

// ── Helpers ───────────────────────────────────────────────────────────────────
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// ── Stats bar ─────────────────────────────────────────────────────────────────
fetch('/api/status')
  .then(r => r.json())
  .then(s => {
    $('stat-version').textContent = `yamtam v${s.version}`;
    $('stat-skills').textContent  = `${s.skills.toLocaleString()} skills`;
    $('stat-agents').textContent  = `${s.agents} agents`;
    $('stat-hooks').textContent   = `${s.hooks} hooks`;
  })
  .catch(() => {});

// ── Provider + model ──────────────────────────────────────────────────────────
function populateModels() {
  const models = PROVIDER_MODELS[providerSelect.value] || [];
  modelSelect.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    modelSelect.appendChild(opt);
  }
  syncKeyStatus();
}

providerSelect.addEventListener('change', populateModels);
populateModels();

// ── API key (per-provider) ────────────────────────────────────────────────────
function lsKey()  { return LS_KEY_PREFIX + providerSelect.value; }
function getKey() { return localStorage.getItem(lsKey()) || ''; }

function syncKeyStatus() {
  const saved = !!getKey();
  keyStatus.textContent = saved ? 'saved' : 'no key';
  keyStatus.classList.toggle('saved', saved);
  keyInput.placeholder = { groq: 'gsk_…', openai: 'sk-…' }[providerSelect.value] || 'sk-ant-…';
}

saveKeyBtn.addEventListener('click', () => {
  const val = keyInput.value.trim();
  if (val) { localStorage.setItem(lsKey(), val); keyInput.value = ''; }
  else     { localStorage.removeItem(lsKey()); }
  syncKeyStatus();
});

// ── Route card ────────────────────────────────────────────────────────────────
function renderRoute(d) {
  routeValue.textContent = d.route || '?';
  routeValue.setAttribute('data-route', d.route || '');
  gateValue.textContent = d.gate || '?';
  confidenceEl.textContent = d.confidence != null ? Math.round(d.confidence * 100) + '%' : '?';
  const src = d.source || 'fallback';
  sourceBadge.textContent = src;
  sourceBadge.setAttribute('data-source', src);
  reasonValue.textContent = d.reason || '';

  if (d.suggested_skill) {
    skillValue.textContent = d.suggested_skill;
    show(skillRow);
  } else {
    hide(skillRow);
  }

  const agents = Array.isArray(d.suggested_agents) ? d.suggested_agents : [];
  agentsValue.textContent = agents.join(', ');
  agents.length > 0 ? show(agentsRow) : hide(agentsRow);

  const signals = Array.isArray(d.matched_signals) ? d.matched_signals : [];
  signalsValue.textContent = signals.join(', ');
  signals.length > 0 ? show(signalsRow) : hide(signalsRow);

  show(routeCard);
}

// ── SSE streaming ─────────────────────────────────────────────────────────────
function streamChat(task, apiKey, suggestedAgents, skill) {
  resultText.innerHTML = '';
  show(resultCard);
  let fullText = '';

  fetch('/api/chat', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      task, apiKey, suggestedAgents,
      provider: providerSelect.value,
      model:    modelSelect.value,
      skill:    skill || null,
    }),
  }).then(res => {
    if (!res.ok || !res.body) { resultText.innerHTML = escHtml(`HTTP error ${res.status}`); return; }
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') return;
          try {
            const evt = JSON.parse(raw);
            if (evt.text)  { fullText += evt.text; resultText.innerHTML = renderMd(fullText); }
            if (evt.error) { resultText.innerHTML += `<span class="md-err">[Error: ${escHtml(evt.error)}]</span>`; }
          } catch (_) {}
        }
        pump();
      }).catch(err => {
        resultText.innerHTML += `<span class="md-err">[stream error: ${escHtml(err.message)}]</span>`;
      });
    }
    pump();
  }).catch(err => {
    resultText.innerHTML = escHtml(`Error: ${err.message}`);
  });
}

// ── Run ───────────────────────────────────────────────────────────────────────
runBtn.addEventListener('click', async () => {
  const task = taskInput.value.trim();
  if (!task) { taskInput.focus(); return; }

  hide(routeCard);
  hide(resultCard);
  runBtn.disabled   = true;
  runBtn.textContent = 'Routing…';

  try {
    const res      = await fetch('/api/route', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ task }),
    });
    const decision = await res.json();
    renderRoute(decision);

    if (decision.route === 'external') {
      resultText.innerHTML = '<p class="md-p">⚠ External action detected — manual confirmation required before proceeding.</p>';
      show(resultCard);
    } else if (!getKey()) {
      resultText.innerHTML = `<p class="md-p">Save your ${escHtml(providerSelect.value)} API key above to get an AI response.</p>`;
      show(resultCard);
    } else {
      streamChat(task, getKey(), decision.suggested_agents || [], decision.suggested_skill);
    }

    pushHistory(task, decision.route);
  } catch (err) {
    resultText.innerHTML = escHtml(`Error: ${err.message}`);
    show(resultCard);
  } finally {
    runBtn.disabled   = false;
    runBtn.textContent = 'Run';
  }
});

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runBtn.click(); }
});

// ── History ───────────────────────────────────────────────────────────────────
const history    = [];
const MAX_HISTORY = 20;

function pushHistory(task, route) {
  history.unshift({ task, route });
  if (history.length > MAX_HISTORY) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No tasks yet</li>';
    return;
  }
  historyList.innerHTML = '';
  for (const item of history) {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.tabIndex  = 0;

    const taskEl = document.createElement('div');
    taskEl.className = 'history-task';
    taskEl.textContent = item.task;

    const metaEl = document.createElement('div');
    metaEl.className = 'history-meta';
    metaEl.textContent = item.route;

    li.appendChild(taskEl);
    li.appendChild(metaEl);

    const restore = () => { taskInput.value = item.task; taskInput.focus(); };
    li.addEventListener('click', restore);
    li.addEventListener('keydown', e => { if (e.key === 'Enter') restore(); });
    historyList.appendChild(li);
  }
}

renderHistory();
