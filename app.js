(() => {
  "use strict";

  const STORE_KEY = "finance_dashboard_v1";

  /** @typedef {"income"|"expense"} TxType */
  /**
   * @typedef {Object} Transaction
   * @property {string} id
   * @property {string} date - YYYY-MM-DD
   * @property {TxType} type
   * @property {number} amount
   * @property {string} category
   * @property {string} note
   */

  const getEl = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

  const ui = {
    role: /** @type {HTMLSelectElement} */ (getEl("#roleSelect")),
    roleText: getEl("#roleHint"),
    darkBtn: getEl("#darkModeBtn"),
    darkBtnText: getEl("#darkModeBtnText"),
    exportCsv: getEl("#exportCsvBtn"),
    exportJson: getEl("#exportJsonBtn"),
    resetBtn: getEl("#resetBtn"),

    bal: getEl("#totalBalance"),
    inc: getEl("#totalIncome"),
    exp: getEl("#totalExpenses"),
    balMeta: getEl("#balanceMeta"),
    incMeta: getEl("#incomeMeta"),
    expMeta: getEl("#expenseMeta"),

    lineCanvas: /** @type {HTMLCanvasElement} */ (getEl("#trendChart")),
    pieCanvas: /** @type {HTMLCanvasElement} */ (getEl("#donutChart")),
    lineEmpty: getEl("#trendEmpty"),
    pieEmpty: getEl("#donutEmpty"),
    lineNote: getEl("#trendPill"),
    pieNote: getEl("#breakdownPill"),
    pieLegend: getEl("#donutLegend"),

    addBtn: /** @type {HTMLButtonElement} */ (getEl("#addTxBtn")),
    body: getEl("#txTbody"),
    empty: getEl("#txEmpty"),

    search: /** @type {HTMLInputElement} */ (getEl("#searchInput")),
    type: /** @type {HTMLSelectElement} */ (getEl("#typeFilter")),
    cat: /** @type {HTMLSelectElement} */ (getEl("#categoryFilter")),
    month: /** @type {HTMLInputElement} */ (getEl("#monthFilter")),
    min: /** @type {HTMLInputElement} */ (getEl("#minAmount")),
    max: /** @type {HTMLInputElement} */ (getEl("#maxAmount")),
    sort: /** @type {HTMLSelectElement} */ (getEl("#sortBy")),
    clear: getEl("#clearFiltersBtn"),

    modal: getEl("#txModal"),
    modalTitle: getEl("#txModalTitle"),
    modalSub: getEl("#txModalSubtitle"),
    form: /** @type {HTMLFormElement} */ (getEl("#txForm")),
    formErr: getEl("#txFormError"),
    fDate: /** @type {HTMLInputElement} */ (getEl("#txDate")),
    fType: /** @type {HTMLSelectElement} */ (getEl("#txType")),
    fCat: /** @type {HTMLInputElement} */ (getEl("#txCategory")),
    fAmt: /** @type {HTMLInputElement} */ (getEl("#txAmount")),
    fNote: /** @type {HTMLInputElement} */ (getEl("#txNote")),
    delBtn: /** @type {HTMLButtonElement} */ (getEl("#deleteTxBtn")),

    iTop: getEl("#insightTopCategory"),
    iMom: getEl("#insightMoM"),
    iBig: getEl("#insightLargest"),
    iObs: getEl("#insightObservation"),
  };

  /** @type {{ role: "viewer"|"admin", dark: boolean, list: Transaction[], filters: any, editId: string|null }} */
  const data = {
    role: "viewer",
    dark: true,
    list: [],
    filters: {
      search: "",
      type: "all",
      category: "all",
      month: "",
      minAmount: "",
      maxAmount: "",
      sort: "date_desc",
    },
    editId: null,
  };

  const colors = [
    "#8b5cf6",
    "#22c55e",
    "#38bdf8",
    "#f59e0b",
    "#fb7185",
    "#a3e635",
    "#60a5fa",
    "#c084fc",
    "#f97316",
    "#14b8a6",
  ];

  // ---------- Helper functions ----------
  const pad2 = (n) => String(n).padStart(2, "0");
  const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromDateStr = (s) => {
    const [y, m, d] = s.split("-").map((x) => Number(x));
    return new Date(y, m - 1, d);
  };
  const monthStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

  const fmtMoney = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  const low = (s) => String(s || "").toLowerCase();

  const makeId = () => `tx_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  const todayStr = () => toDateStr(new Date());

  const getLastDays = (n) => {
    const arr = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d);
      x.setDate(d.getDate() - i);
      arr.push(x);
    }
    return arr;
  };

  const sameMonth = (dateStr, yyyymm) => {
    if (!yyyymm) return true;
    return dateStr.slice(0, 7) === yyyymm;
  };

  // ---------- Persistence ----------
  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch {
      return null;
    }
  };

  const saveData = () => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        role: data.role,
        darkMode: data.dark,
        transactions: data.list,
        filters: data.filters,
      })
    );
  };

  const demoData = () => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    /** @type {Transaction[]} */
    const demo = [];

    const add = (daysAgo, type, amount, category, note) => {
      const d = new Date(base);
      d.setDate(base.getDate() - daysAgo);
      demo.push({
        id: makeId(),
        date: toDateStr(d),
        type,
        amount,
        category,
        note,
      });
    };

    add(28, "income", 2500, "Salary", "Monthly paycheck");
    add(25, "expense", 120.75, "Groceries", "Weekly groceries");
    add(23, "expense", 64.2, "Transport", "Fuel");
    add(21, "expense", 32.15, "Food", "Lunch with friends");
    add(19, "expense", 59.99, "Subscriptions", "Music + video");
    add(16, "expense", 210.0, "Bills", "Electricity + water");
    add(13, "income", 220.0, "Freelance", "Small project");
    add(11, "expense", 89.5, "Health", "Pharmacy");
    add(9, "expense", 145.0, "Shopping", "Clothes");
    add(7, "expense", 40.0, "Food", "Dinner");
    add(4, "expense", 24.99, "Subscriptions", "Cloud storage");
    add(2, "expense", 18.2, "Transport", "Metro card");
    add(1, "expense", 72.0, "Groceries", "Top up");
    add(0, "income", 60.0, "Cashback", "Card rewards");

    return demo;
  };

  const initData = () => {
    const saved = loadData();
    if (!saved) {
      data.role = "viewer";
      data.dark = true;
      data.list = demoData();
      data.filters.month = monthStr(new Date());
      saveData();
      return;
    }

    data.role = saved.role === "admin" ? "admin" : "viewer";
    data.dark = Boolean(saved.darkMode);
    data.list = Array.isArray(saved.transactions) ? saved.transactions : demoData();
    data.filters = { ...data.filters, ...(saved.filters || {}) };

    if (!data.filters.month) data.filters.month = monthStr(new Date());
  };

  // ---------- Derived data ----------
  const getList = () => {
    const f = data.filters;

    let txs = [...data.list];

    if (f.type !== "all") txs = txs.filter((t) => t.type === f.type);
    if (f.category !== "all") txs = txs.filter((t) => low(t.category) === low(f.category));
    if (f.month) txs = txs.filter((t) => sameMonth(t.date, f.month));

    const minA = f.minAmount === "" ? null : Number(f.minAmount);
    const maxA = f.maxAmount === "" ? null : Number(f.maxAmount);
    if (minA !== null && !Number.isNaN(minA)) txs = txs.filter((t) => t.amount >= minA);
    if (maxA !== null && !Number.isNaN(maxA)) txs = txs.filter((t) => t.amount <= maxA);

    const q = low(f.search).trim();
    if (q) {
      txs = txs.filter((t) => low(t.category).includes(q) || low(t.note).includes(q));
    }

    const [k, dir] = String(f.sort || "date_desc").split("_");
    const sign = dir === "asc" ? 1 : -1;
    txs.sort((a, b) => {
      if (k === "date") return sign * (a.date.localeCompare(b.date));
      if (k === "amount") return sign * (a.amount - b.amount);
      if (k === "category") return sign * (a.category.localeCompare(b.category));
      return -1 * a.date.localeCompare(b.date);
    });

    return txs;
  };

  const totalsAll = () => {
    let income = 0;
    let expenses = 0;
    for (const t of data.list) {
      if (t.type === "income") income += t.amount;
      else expenses += t.amount;
    }
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  };

  const totalsMonth = (yyyymm) => {
    let income = 0;
    let expenses = 0;
    for (const t of data.list) {
      if (!sameMonth(t.date, yyyymm)) continue;
      if (t.type === "income") income += t.amount;
      else expenses += t.amount;
    }
    return { income, expenses, balance: income - expenses };
  };

  const catTotalsMonth = (yyyymm) => {
    /** @type {Map<string, number>} */
    const map = new Map();
    for (const t of data.list) {
      if (!sameMonth(t.date, yyyymm)) continue;
      if (t.type !== "expense") continue;
      const key = t.category.trim() || "Uncategorized";
      map.set(key, (map.get(key) || 0) + t.amount);
    }
    return map;
  };

  // ---------- Charts ----------
  const getTheme = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  const themeColors = () => {
    const theme = getTheme();
    const dark = theme === "dark";
    return {
      bg: dark ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.65)",
      grid: dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)",
      text: dark ? "rgba(255,255,255,0.82)" : "rgba(15,23,42,0.80)",
      muted: dark ? "rgba(255,255,255,0.62)" : "rgba(15,23,42,0.55)",
      line: dark ? "rgba(139,92,246,0.95)" : "rgba(139,92,246,0.95)",
      line2: dark ? "rgba(34,197,94,0.85)" : "rgba(34,197,94,0.85)",
      fill: dark ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.18)",
    };
  };

  const clearCanvas = (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
  };

  const drawLine = () => {
    const canvas = ui.lineCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    clearCanvas(ctx, w, h);

    const days = getLastDays(30);
    const dayKeys = days.map(toDateStr);
    /** @type {Map<string, number>} */
    const dailyDelta = new Map();
    for (const t of data.list) {
      if (!dayKeys.includes(t.date)) continue;
      const sign = t.type === "income" ? 1 : -1;
      dailyDelta.set(t.date, (dailyDelta.get(t.date) || 0) + sign * t.amount);
    }

    // Build series as cumulative across last 30 days
    const series = [];
    let running = 0;
    for (const d of dayKeys) {
      running += dailyDelta.get(d) || 0;
      series.push(running);
    }

    const hasData = series.some((x) => Math.abs(x) > 0.0001);
    ui.lineEmpty.hidden = hasData;
    ui.lineNote.textContent = hasData ? `${fmtMoney(series[series.length - 1])} net (30d)` : "—";
    if (!hasData) return;

    const c = themeColors();
    const pad = { l: 46, r: 14, t: 18, b: 28 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = Math.max(1e-6, max - min);
    const yFor = (v) => pad.t + (1 - (v - min) / span) * ih;
    const xFor = (i) => pad.l + (i / (series.length - 1)) * iw;

    // Grid + axes labels
    ctx.save();
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = c.muted;
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;

    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const t = i / ticks;
      const y = pad.t + t * ih;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();

      const val = max - t * span;
      ctx.fillText(fmtMoney(val), 10, y + 4);
    }
    ctx.restore();

    // Line + fill
    ctx.save();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    series.forEach((v, i) => {
      const x = xFor(i);
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.lineTo(xFor(series.length - 1), pad.t + ih);
    ctx.lineTo(xFor(0), pad.t + ih);
    ctx.closePath();
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.restore();

    // End dot
    const endX = xFor(series.length - 1);
    const endY = yFor(series[series.length - 1]);
    ctx.save();
    ctx.fillStyle = c.line2;
    ctx.beginPath();
    ctx.arc(endX, endY, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // X labels (sparse)
    ctx.save();
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = c.muted;
    const labelIdx = [0, 10, 20, 29];
    for (const i of labelIdx) {
      const d = fromDateStr(dayKeys[i]);
      const txt = `${d.toLocaleString(undefined, { month: "short" })} ${d.getDate()}`;
      ctx.fillText(txt, xFor(i) - 14, h - 10);
    }
    ctx.restore();
  };

  const drawPie = () => {
    const canvas = ui.pieCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    clearCanvas(ctx, w, h);

    const yyyymm = data.filters.month || monthStr(new Date());
    const map = catTotalsMonth(yyyymm);
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    const hasData = total > 0;
    ui.pieEmpty.hidden = hasData;
    ui.pieNote.textContent = hasData ? `${fmtMoney(total)} total` : "—";

    // Legend
    ui.pieLegend.innerHTML = "";
    if (!hasData) return;

    const maxSlices = 6;
    const top = entries.slice(0, maxSlices);
    const rest = entries.slice(maxSlices);
    const restTotal = rest.reduce((s, [, v]) => s + v, 0);
    if (restTotal > 0) top.push(["Other", restTotal]);

    const c = themeColors();
    const cx = w * 0.43;
    const cy = h * 0.52;
    const rOuter = Math.min(w, h) * 0.34;
    const rInner = rOuter * 0.62;

    let start = -Math.PI / 2;
    top.forEach(([name, val], idx) => {
      const frac = val / total;
      const end = start + frac * Math.PI * 2;
      const col = colors[idx % colors.length];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rOuter, start, end);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();

      start = end;

      const row = document.createElement("div");
      row.className = "legend__row";
      row.innerHTML = `
        <div class="legend__left">
          <div class="legend__swatch" style="background:${col}"></div>
          <div class="legend__name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        </div>
        <div class="legend__value">${fmtMoney(val)}</div>
      `;
      ui.pieLegend.appendChild(row);
    });

    // Punch out center
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Center label
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = c.text;
    ctx.font = "700 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Expenses", cx, cy - 6);
    ctx.fillStyle = c.muted;
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(yyyymm, cx, cy + 14);
    ctx.restore();
  };

  // ---------- Rendering ----------
  const setTheme = () => {
    const theme = data.dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    ui.darkBtnText.textContent = data.dark ? "Light" : "Dark";
  };

  const setRole = () => {
    const isAdmin = data.role === "admin";
    ui.roleText.textContent = isAdmin
      ? "Admin mode: you can add, edit, delete transactions."
      : "Viewer mode: read-only. Switch to Admin to edit.";

    ui.addBtn.disabled = !isAdmin;
    ui.addBtn.title = isAdmin ? "Add a transaction" : "Viewer role cannot add transactions";

    // If currently editing, but role switched away from admin, close modal
    if (!isAdmin && !ui.modal.hidden) closeModal();
  };

  const setCats = () => {
    const cats = new Set();
    for (const t of data.list) {
      const c = (t.category || "").trim();
      if (c) cats.add(c);
    }
    const arr = ["all", ...[...cats].sort((a, b) => a.localeCompare(b))];

    const prev = ui.cat.value || "all";
    ui.cat.innerHTML = "";
    for (const c of arr) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c === "all" ? "All" : c;
      ui.cat.appendChild(opt);
    }

    ui.cat.value = arr.includes(prev) ? prev : "all";
  };

  const showSummary = () => {
    const all = totalsAll();
    const mKey = data.filters.month || monthStr(new Date());
    const m = totalsMonth(mKey);

    ui.bal.textContent = fmtMoney(all.balance);
    ui.inc.textContent = fmtMoney(all.income);
    ui.exp.textContent = fmtMoney(all.expenses);

    ui.balMeta.textContent = `This month: ${fmtMoney(m.balance)} net`;
    ui.incMeta.textContent = `This month: ${fmtMoney(m.income)}`;
    ui.expMeta.textContent = `This month: ${fmtMoney(m.expenses)}`;
  };

  const showTable = () => {
    const txs = getList();
    ui.body.innerHTML = "";
    ui.empty.hidden = txs.length !== 0;

    const isAdmin = data.role === "admin";

    for (const t of txs) {
      const tr = document.createElement("tr");

      const typeTag = `
        <span class="tag">
          <span class="dot ${t.type === "income" ? "dot--pos" : "dot--neg"}"></span>
          ${escapeHtml(cap(t.type))}
        </span>
      `;

      const actions = isAdmin
        ? `
          <div class="rowActions">
            <button class="miniBtn" data-action="edit" data-id="${t.id}" type="button">Edit</button>
            <button class="miniBtn miniBtn--danger" data-action="delete" data-id="${t.id}" type="button">Delete</button>
          </div>
        `
        : `<div class="rowActions"><span class="smallText">Read-only</span></div>`;

      tr.innerHTML = `
        <td data-label="Date">${escapeHtml(t.date)}</td>
        <td data-label="Category">${escapeHtml(t.category || "Uncategorized")}</td>
        <td data-label="Type">${typeTag}</td>
        <td data-label="Amount" class="table__right">${fmtMoney(t.type === "income" ? t.amount : -t.amount)}</td>
        <td data-label="Note">${escapeHtml(t.note || "—")}</td>
        <td data-label="Actions" class="table__right">${actions}</td>
      `;

      ui.body.appendChild(tr);
    }
  };

  const showInsights = () => {
    const now = new Date();
    const thisM = data.filters.month || monthStr(now);
    const d = parseMonth(thisM);
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevM = monthStr(prev);

    // Top spending category (this month)
    const catMap = catTotalsMonth(thisM);
    const entries = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      ui.iTop.textContent = "No expense data for the selected month.";
    } else {
      const [name, val] = entries[0];
      ui.iTop.innerHTML = `<strong>${escapeHtml(name)}</strong> at ${fmtMoney(val)}.`;
    }

    // Month over month
    const tThis = totalsMonth(thisM);
    const tPrev = totalsMonth(prevM);
    const delta = tThis.expenses - tPrev.expenses;
    const pct = tPrev.expenses > 0 ? (delta / tPrev.expenses) * 100 : null;
    const deltaTxt =
      tPrev.expenses === 0 && tThis.expenses === 0
        ? "No expenses in either month."
        : tPrev.expenses === 0
          ? `Expenses started this month at ${fmtMoney(tThis.expenses)}.`
          : `${fmtMoney(Math.abs(delta))} ${delta >= 0 ? "higher" : "lower"} than last month (${pct === null ? "—" : `${Math.abs(pct).toFixed(1)}%`}).`;
    ui.iMom.innerHTML = `
      <div><strong>${thisM}</strong>: ${fmtMoney(tThis.expenses)} expenses</div>
      <div><strong>${prevM}</strong>: ${fmtMoney(tPrev.expenses)} expenses</div>
      <div style="margin-top:6px;color:var(--muted)">${deltaTxt}</div>
    `;

    // Largest transaction (all time)
    if (data.list.length === 0) {
      ui.iBig.textContent = "No transactions yet.";
    } else {
      const largest = [...data.list].sort((a, b) => b.amount - a.amount)[0];
      ui.iBig.innerHTML = `<strong>${escapeHtml(largest.category)}</strong> (${escapeHtml(
        cap(largest.type)
      )}) of ${fmtMoney(largest.amount)} on ${escapeHtml(largest.date)}.`;
    }

    // Observation
    const obs = buildObservation(thisM);
    ui.iObs.textContent = obs;
  };

  const showCharts = () => {
    drawLine();
    drawPie();
  };

  const render = () => {
    setTheme();
    setRole();
    setCats();
    syncFilterControls();
    showSummary();
    showTable();
    showCharts();
    showInsights();
  };

  const syncFilterControls = () => {
    const f = data.filters;
    ui.search.value = f.search || "";
    ui.type.value = f.type || "all";
    ui.month.value = f.month || "";
    ui.min.value = f.minAmount ?? "";
    ui.max.value = f.maxAmount ?? "";
    ui.sort.value = f.sort || "date_desc";
  };

  // ---------- Actions ----------
  const openAdd = () => {
    data.editId = null;
    ui.modalTitle.textContent = "Add transaction";
    ui.modalSub.textContent = "Admin only";
    ui.delBtn.hidden = true;
    ui.formErr.hidden = true;
    ui.form.reset();

    ui.fDate.value = todayStr();
    ui.fType.value = "expense";
    ui.fCat.value = "";
    ui.fAmt.value = "";
    ui.fNote.value = "";

    showModal();
  };

  const openEdit = (id) => {
    const tx = data.list.find((t) => t.id === id);
    if (!tx) return;
    data.editId = id;

    ui.modalTitle.textContent = "Edit transaction";
    ui.modalSub.textContent = "Admin only";
    ui.delBtn.hidden = false;
    ui.formErr.hidden = true;

    ui.fDate.value = tx.date;
    ui.fType.value = tx.type;
    ui.fCat.value = tx.category;
    ui.fAmt.value = String(tx.amount);
    ui.fNote.value = tx.note || "";

    showModal();
  };

  const showModal = () => {
    ui.modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => ui.fCat.focus(), 0);
  };

  const closeModal = () => {
    ui.modal.hidden = true;
    document.body.style.overflow = "";
    data.editId = null;
  };

  const readForm = () => {
    const date = ui.fDate.value;
    const type = /** @type {TxType} */ (ui.fType.value);
    const category = (ui.fCat.value || "").trim();
    const amount = Number(ui.fAmt.value);
    const note = (ui.fNote.value || "").trim();

    if (!date) return { ok: false, message: "Please pick a date." };
    if (type !== "income" && type !== "expense") return { ok: false, message: "Invalid type." };
    if (!category) return { ok: false, message: "Please enter a category." };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Amount must be a number > 0." };

    /** @type {Transaction} */
    const tx = {
      id: data.editId || makeId(),
      date,
      type,
      category,
      amount: Math.round(amount * 100) / 100,
      note,
    };

    return { ok: true, tx };
  };

  const saveTx = (tx) => {
    const i = data.list.findIndex((t) => t.id === tx.id);
    if (i >= 0) data.list[i] = tx;
    else data.list.push(tx);
  };

  const removeTx = (id) => {
    data.list = data.list.filter((t) => t.id !== id);
  };

  const setFilter = (patch) => {
    data.filters = { ...data.filters, ...patch };
  };

  const clearFilters = () => {
    data.filters = {
      search: "",
      type: "all",
      category: "all",
      month: monthStr(new Date()),
      minAmount: "",
      maxAmount: "",
      sort: "date_desc",
    };
  };

  // ---------- Export ----------
  const toCSV = (txs) => {
    const header = ["id", "date", "type", "amount", "category", "note"];
    const rows = txs.map((t) => [
      t.id,
      t.date,
      t.type,
      String(t.amount),
      t.category,
      (t.note || "").replaceAll("\n", " "),
    ]);
    const esc = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };
    return [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  };

  const downloadText = (name, text, mime) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------- Insights helpers ----------
  const parseMonth = (yyyymm) => {
    const [y, m] = yyyymm.split("-").map((x) => Number(x));
    return new Date(y, m - 1, 1);
  };

  const buildObservation = (yyyymm) => {
    const txs = data.list.filter((t) => sameMonth(t.date, yyyymm));
    if (txs.length === 0) return "No data for the selected month. Add transactions to generate insights.";

    const exp = txs.filter((t) => t.type === "expense");
    const inc = txs.filter((t) => t.type === "income");
    const expTotal = exp.reduce((s, t) => s + t.amount, 0);
    const incTotal = inc.reduce((s, t) => s + t.amount, 0);

    if (expTotal === 0 && incTotal > 0) return "You have income recorded but no expenses this month.";
    if (expTotal > 0 && incTotal === 0) return "You have expenses recorded but no income this month.";

    const net = incTotal - expTotal;
    const ratio = incTotal > 0 ? (expTotal / incTotal) * 100 : null;
    const rTxt = ratio === null ? "" : ` Expenses are about ${ratio.toFixed(0)}% of income.`;
    return `Net for ${yyyymm} is ${fmtMoney(net)}.${rTxt}`;
  };

  // ---------- HTML safety ----------
  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const cap = (s) => {
    const x = String(s || "");
    return x ? x[0].toUpperCase() + x.slice(1) : x;
  };

  // ---------- Events ----------
  const bind = () => {
    ui.role.addEventListener("change", () => {
      data.role = ui.role.value === "admin" ? "admin" : "viewer";
      saveData();
      render();
    });

    ui.darkBtn.addEventListener("click", () => {
      data.dark = !data.dark;
      saveData();
      render();
    });

    ui.exportCsv.addEventListener("click", () => {
      const csv = toCSV(data.list);
      downloadText("transactions.csv", csv, "text/csv;charset=utf-8");
    });
    ui.exportJson.addEventListener("click", () => {
      downloadText("transactions.json", JSON.stringify(data.list, null, 2), "application/json");
    });

    ui.resetBtn.addEventListener("click", () => {
      localStorage.removeItem(STORE_KEY);
      initData();
      ui.role.value = data.role;
      render();
    });

    // Filters
    const onFilter = () => {
      saveData();
      showTable();
      showCharts();
      showInsights();
    };

    ui.search.addEventListener("input", () => {
      setFilter({ search: ui.search.value });
      onFilter();
    });
    ui.type.addEventListener("change", () => {
      setFilter({ type: ui.type.value, category: "all" });
      onFilter();
    });
    ui.cat.addEventListener("change", () => {
      setFilter({ category: ui.cat.value });
      onFilter();
    });
    ui.month.addEventListener("change", () => {
      setFilter({ month: ui.month.value });
      onFilter();
      showSummary();
    });
    ui.min.addEventListener("input", () => {
      setFilter({ minAmount: ui.min.value });
      onFilter();
    });
    ui.max.addEventListener("input", () => {
      setFilter({ maxAmount: ui.max.value });
      onFilter();
    });
    ui.sort.addEventListener("change", () => {
      setFilter({ sort: ui.sort.value });
      onFilter();
    });
    ui.clear.addEventListener("click", () => {
      clearFilters();
      saveData();
      render();
    });

    // Add button
    ui.addBtn.addEventListener("click", () => {
      if (data.role !== "admin") return;
      openAdd();
    });

    // Row actions (edit/delete)
    ui.body.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const btn = target.closest("button[data-action]");
      if (!btn) return;
      if (data.role !== "admin") return;

      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (!id || !action) return;

      if (action === "edit") openEdit(id);
      if (action === "delete") {
        if (!confirm("Delete this transaction?")) return;
        removeTx(id);
        saveData();
        render();
      }
    });

    // Modal close
    ui.modal.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.getAttribute("data-close") === "true") closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !ui.modal.hidden) closeModal();
    });

    // Modal delete button
    ui.delBtn.addEventListener("click", () => {
      if (data.role !== "admin") return;
      if (!data.editId) return;
      if (!confirm("Delete this transaction?")) return;
      removeTx(data.editId);
      saveData();
      closeModal();
      render();
    });

    // Modal submit
    ui.form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (data.role !== "admin") return;

      const res = readForm();
      if (!res.ok) {
        ui.formErr.textContent = res.message;
        ui.formErr.hidden = false;
        return;
      }
      ui.formErr.hidden = true;

      saveTx(res.tx);
      saveData();
      closeModal();
      render();
    });

    // Redraw charts when resizing (debounced)
    let rT = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(rT);
      rT = window.setTimeout(() => showCharts(), 120);
    });
  };

  // ---------- Init ----------
  initData();
  ui.role.value = data.role;
  ui.month.value = data.filters.month || monthStr(new Date());
  render();
  bind();
})();

