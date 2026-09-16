/* ===========================================================
   Controle Financeiro - app local (dados no navegador)
   Moeda: Real (R$) | Idioma: PT-BR
   =========================================================== */

'use strict';

/* ---------- Chaves de armazenamento ---------- */
const STORAGE = {
  pin: 'cf_pin',
  txs: 'cf_transactions',
};

/* ---------- Categorias padrão ---------- */
const CATEGORIES = {
  expense: [
    { id: 'alimentacao', nome: 'Alimentação', icon: '🍽️' },
    { id: 'transporte', nome: 'Transporte', icon: '🚗' },
    { id: 'moradia', nome: 'Moradia', icon: '🏠' },
    { id: 'saude', nome: 'Saúde', icon: '💊' },
    { id: 'educacao', nome: 'Educação', icon: '📚' },
    { id: 'lazer', nome: 'Lazer', icon: '🎮' },
    { id: 'compras', nome: 'Compras', icon: '🛍️' },
    { id: 'contas', nome: 'Contas/Assinaturas', icon: '📄' },
    { id: 'outros_desp', nome: 'Outros', icon: '📦' },
  ],
  income: [
    { id: 'salario', nome: 'Salário', icon: '💼' },
    { id: 'freelance', nome: 'Freelance/Extra', icon: '💻' },
    { id: 'investimentos', nome: 'Investimentos', icon: '📈' },
    { id: 'presente', nome: 'Presente', icon: '🎁' },
    { id: 'outros_rec', nome: 'Outros', icon: '💰' },
  ],
};

/* ---------- Estado ---------- */
let state = {
  transactions: [],
  viewDate: new Date(), // mês em exibição
  formType: 'expense',
  filterType: 'all',
};

/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const brl = (n) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function txMonthKey(tx) {
  // tx.date = 'YYYY-MM-DD'
  return tx.date.slice(0, 7);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function saveTxs() {
  localStorage.setItem(STORAGE.txs, JSON.stringify(state.transactions));
}

function loadTxs() {
  try {
    state.transactions = JSON.parse(localStorage.getItem(STORAGE.txs)) || [];
  } catch {
    state.transactions = [];
  }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2200);
}

/* Converte "1.234,56" ou "1234.56" ou "1234,56" para número */
function parseAmount(str) {
  if (typeof str !== 'string') return NaN;
  let s = str.trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (s.includes(',')) {
    // formato pt-BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(s);
}

/* ===========================================================
   PIN
   =========================================================== */
let pinBuffer = '';
let pinMode = 'unlock'; // 'setup' | 'confirm' | 'unlock'
let pinFirstEntry = '';

function initPin() {
  const hasPin = !!localStorage.getItem(STORAGE.pin);
  pinMode = hasPin ? 'unlock' : 'setup';
  updatePinScreen();
  bindKeypad();
}

function updatePinScreen() {
  const title = $('#pin-title');
  const sub = $('#pin-subtitle');
  if (pinMode === 'setup') {
    title.textContent = 'Crie um PIN';
    sub.textContent = 'Escolha 4 dígitos para proteger seus dados';
  } else if (pinMode === 'confirm') {
    title.textContent = 'Confirme o PIN';
    sub.textContent = 'Digite novamente os 4 dígitos';
  } else {
    title.textContent = 'Digite seu PIN';
    sub.textContent = 'Acesse seu controle financeiro';
  }
}

function renderPinDots() {
  $$('#pin-dots span').forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinBuffer.length);
  });
}

function bindKeypad() {
  $('#keypad').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === 'del') {
      pinBuffer = pinBuffer.slice(0, -1);
    } else if (pinBuffer.length < 4) {
      pinBuffer += key;
    }
    $('#pin-error').textContent = '';
    renderPinDots();
    if (pinBuffer.length === 4) setTimeout(handlePinComplete, 120);
  });
}

/* Hash simples (não é criptografia forte, apenas evita PIN em texto puro).
   Segurança real virá em versão futura com criptografia dos dados. */
async function hashPin(pin) {
  const data = new TextEncoder().encode('cf_salt_v1:' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handlePinComplete() {
  const entered = pinBuffer;
  pinBuffer = '';
  renderPinDots();

  if (pinMode === 'setup') {
    pinFirstEntry = entered;
    pinMode = 'confirm';
    updatePinScreen();
    return;
  }

  if (pinMode === 'confirm') {
    if (entered === pinFirstEntry) {
      const hash = await hashPin(entered);
      localStorage.setItem(STORAGE.pin, hash);
      unlockApp();
    } else {
      pinFirstEntry = '';
      pinMode = 'setup';
      updatePinScreen();
      $('#pin-error').textContent = 'Os PINs não coincidem. Tente de novo.';
    }
    return;
  }

  // unlock
  const hash = await hashPin(entered);
  if (hash === localStorage.getItem(STORAGE.pin)) {
    unlockApp();
  } else {
    $('#pin-error').textContent = 'PIN incorreto.';
    navigator.vibrate && navigator.vibrate(200);
  }
}

function unlockApp() {
  $('#pin-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  render();
}

function lockApp() {
  pinBuffer = '';
  pinMode = 'unlock';
  updatePinScreen();
  renderPinDots();
  $('#pin-error').textContent = '';
  $('#app').classList.add('hidden');
  $('#pin-screen').classList.remove('hidden');
}

/* ===========================================================
   Render principal
   =========================================================== */
function render() {
  renderMonthLabel();
  renderDashboard();
  renderCategories();
  renderList();
}

function renderMonthLabel() {
  const d = state.viewDate;
  const label = `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  $('#current-month').textContent = label;
  $('#month-label').textContent = label;
}

function monthTxs() {
  const key = monthKey(state.viewDate);
  return state.transactions.filter((t) => txMonthKey(t) === key);
}

function renderDashboard() {
  const txs = monthTxs();
  let income = 0, expense = 0;
  txs.forEach((t) => {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  $('#income').textContent = brl(income);
  $('#expense').textContent = brl(expense);
  const balance = income - expense;
  $('#balance').textContent = brl(balance);
  $('#balance').style.color = balance < 0 ? 'var(--red)' : 'var(--text)';
}

function renderCategories() {
  const txs = monthTxs().filter((t) => t.type === 'expense');
  const wrap = $('#by-category');
  wrap.innerHTML = '';

  if (txs.length === 0) {
    wrap.innerHTML = '<p class="cat-empty">Sem despesas neste mês.</p>';
    return;
  }

  const totals = {};
  txs.forEach((t) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const grand = Object.values(totals).reduce((a, b) => a + b, 0);

  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([catId, val]) => {
      const cat = CATEGORIES.expense.find((c) => c.id === catId) || { nome: catId, icon: '📦' };
      const pct = grand ? (val / grand) * 100 : 0;
      const row = document.createElement('div');
      row.className = 'cat-row';
      row.innerHTML = `
        <div class="cat-row-top">
          <span class="cat-name">${cat.icon} ${cat.nome}</span>
          <span class="cat-value">${brl(val)} · ${pct.toFixed(0)}%</span>
        </div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
      `;
      wrap.appendChild(row);
    });
}

function renderList() {
  const listEl = $('#tx-list');
  listEl.innerHTML = '';
  let txs = monthTxs();
  if (state.filterType !== 'all') txs = txs.filter((t) => t.type === state.filterType);
  txs.sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));

  $('#empty-state').classList.toggle('hidden', txs.length !== 0);

  txs.forEach((t) => {
    const catList = CATEGORIES[t.type];
    const cat = catList.find((c) => c.id === t.category) || { nome: t.category, icon: '📦' };
    const [y, m, d] = t.date.split('-');
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-icon">${cat.icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(t.desc)}</div>
        <div class="tx-meta">${cat.nome} · ${d}/${m}/${y}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${brl(t.amount)}</div>
    `;
    item.addEventListener('click', () => openModal(t));
    listEl.appendChild(item);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ===========================================================
   Modal de lançamento
   =========================================================== */
function fillCategorySelect() {
  const sel = $('#tx-category');
  sel.innerHTML = '';
  CATEGORIES[state.formType].forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.nome}`;
    sel.appendChild(opt);
  });
}

function setFormType(type) {
  state.formType = type;
  $('#btn-expense').classList.toggle('active', type === 'expense');
  $('#btn-income').classList.toggle('active', type === 'income');
  fillCategorySelect();
}

function openModal(tx = null) {
  $('#modal').classList.remove('hidden');
  if (tx) {
    $('#modal-title').textContent = 'Editar lançamento';
    $('#tx-id').value = tx.id;
    setFormType(tx.type);
    $('#tx-amount').value = tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    $('#tx-desc').value = tx.desc;
    $('#tx-category').value = tx.category;
    $('#tx-date').value = tx.date;
    $('#btn-delete').classList.remove('hidden');
  } else {
    $('#modal-title').textContent = 'Novo lançamento';
    $('#tx-id').value = '';
    setFormType('expense');
    $('#tx-amount').value = '';
    $('#tx-desc').value = '';
    // data padrão: hoje, ou dia 1 do mês em exibição se for outro mês
    const today = new Date();
    const useDate = monthKey(today) === monthKey(state.viewDate)
      ? today
      : new Date(state.viewDate.getFullYear(), state.viewDate.getMonth(), 1);
    $('#tx-date').value = useDate.toISOString().slice(0, 10);
    $('#btn-delete').classList.add('hidden');
  }
}

function closeModal() {
  $('#modal').classList.add('hidden');
}

function handleSubmit(e) {
  e.preventDefault();
  const amount = parseAmount($('#tx-amount').value);
  if (isNaN(amount) || amount <= 0) {
    toast('Informe um valor válido.');
    return;
  }
  const desc = $('#tx-desc').value.trim();
  if (!desc) { toast('Informe uma descrição.'); return; }

  const id = $('#tx-id').value;
  const data = {
    type: state.formType,
    amount: Math.round(amount * 100) / 100,
    desc,
    category: $('#tx-category').value,
    date: $('#tx-date').value,
  };

  if (id) {
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx >= 0) state.transactions[idx] = { ...state.transactions[idx], ...data };
    toast('Lançamento atualizado.');
  } else {
    state.transactions.push({ id: uid(), createdAt: Date.now(), ...data });
    toast('Lançamento adicionado.');
  }

  saveTxs();
  closeModal();
  // pula pro mês do lançamento pra ele aparecer
  const [yy, mm] = data.date.split('-');
  state.viewDate = new Date(Number(yy), Number(mm) - 1, 1);
  render();
}

function handleDelete() {
  const id = $('#tx-id').value;
  if (!id) return;
  if (!confirm('Excluir este lançamento?')) return;
  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveTxs();
  closeModal();
  render();
  toast('Lançamento excluído.');
}

/* ===========================================================
   Backup export / import
   =========================================================== */
function exportBackup() {
  const payload = {
    app: 'controle-financeiro',
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-financeiro-${monthKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup exportado.');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const incoming = Array.isArray(data) ? data : data.transactions;
      if (!Array.isArray(incoming)) throw new Error('Formato inválido');

      // merge por id, evitando duplicar
      const byId = {};
      [...state.transactions, ...incoming].forEach((t) => {
        if (t && t.id) byId[t.id] = t;
      });
      state.transactions = Object.values(byId);
      saveTxs();
      render();
      toast(`Backup importado (${incoming.length} lançamentos).`);
    } catch (err) {
      toast('Arquivo inválido.');
    }
  };
  reader.readAsText(file);
}

/* ===========================================================
   Bindings
   =========================================================== */
function bindApp() {
  $('#btn-lock').addEventListener('click', lockApp);

  $('#prev-month').addEventListener('click', () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
    render();
  });
  $('#next-month').addEventListener('click', () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
    render();
  });

  $('#filter-type').addEventListener('change', (e) => {
    state.filterType = e.target.value;
    renderList();
  });

  $('#fab').addEventListener('click', () => openModal());
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  $('#btn-expense').addEventListener('click', () => setFormType('expense'));
  $('#btn-income').addEventListener('click', () => setFormType('income'));

  $('#tx-form').addEventListener('submit', handleSubmit);
  $('#btn-delete').addEventListener('click', handleDelete);

  $('#btn-export').addEventListener('click', exportBackup);
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });
}

/* ===========================================================
   Boot
   =========================================================== */
function init() {
  loadTxs();
  fillCategorySelect();
  bindApp();
  initPin();

  // Registrar service worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
