const STORAGE_KEY = "pennywise-v1";
const COLORS = ["#4c956c", "#e7a74f", "#8495ce", "#dc806b", "#9d83c7", "#6db3aa", "#d18ca5", "#9ca95e", "#d38d4c"];
const CATEGORIES = {
  expense: ["Food & Drink", "Rent", "Transport", "Bills", "Shopping", "Health", "Entertainment", "Groceries", "Travel", "Education", "Personal care", "Other"],
  income: ["Salary", "Freelance", "Investments", "Gift", "Other income"]
};
const CATEGORY_META = {
  "Food & Drink": ["◒", "food"], "Rent": ["⌂", "home"], "Transport": ["↗", "transport"], "Bills": ["▤", ""],
  "Shopping": ["◇", "shopping"], "Health": ["✚", "health"], "Entertainment": ["♫", ""], "Groceries": ["⌑", "food"],
  "Travel": ["✈", "transport"], "Education": ["▱", ""], "Personal care": ["✿", ""], "Salary": ["↙", "income"],
  "Freelance": ["⌘", "income"], "Investments": ["↗", "income"], "Gift": ["♡", "income"], "Other income": ["＋", "income"],
  "Other": ["◦", ""]
};
const DEFAULT_DATA = () => {
  const date = (day) => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  return {
    currency: "INR",
    accounts: [
      { id: "acc-bank", name: "Everyday account", type: "Bank account", openingBalance: 84200 },
      { id: "acc-wallet", name: "Cash wallet", type: "Cash", openingBalance: 4200 },
      { id: "acc-card", name: "Credit card", type: "Credit card", openingBalance: 0 }
    ],
    budgets: { overall: 50000, categories: { "Food & Drink": 10000, Rent: 18000, Transport: 5000, Shopping: 6000, Bills: 4000, Entertainment: 3000 } },
    transactions: [
      { id: "tx-1", amount: 1250, type: "expense", category: "Food & Drink", accountId: "acc-card", date: date(2), note: "Brunch at The Greenhouse" },
      { id: "tx-2", amount: 72000, type: "income", category: "Salary", accountId: "acc-bank", date: date(1), note: "Monthly salary" },
      { id: "tx-3", amount: 2200, type: "expense", category: "Transport", accountId: "acc-wallet", date: date(4), note: "Metro & cabs" },
      { id: "tx-4", amount: 3400, type: "expense", category: "Shopping", accountId: "acc-card", date: date(5), note: "A few little things" },
      { id: "tx-5", amount: 18000, type: "expense", category: "Rent", accountId: "acc-bank", date: date(3), note: "Monthly rent" },
      { id: "tx-6", amount: 890, type: "expense", category: "Bills", accountId: "acc-bank", date: date(6), note: "Electricity bill" },
      { id: "tx-7", amount: 2450, type: "expense", category: "Food & Drink", accountId: "acc-card", date: date(7), note: "Dinner with friends" }
    ]
  };
};
let state = loadState();
let selectedType = "expense";
let importRows = [];
let importHeaders = [];
let importPreviewRows = [];
let toastTimeout;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions) && parsed.budgets) return parsed;
    }
  } catch (error) {
    console.error("Could not load saved finance data.", error);
  }
  return DEFAULT_DATA();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save finance data.", error);
    showToast("Could not save data on this device.");
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: state.currency || "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthTransactions(month = currentMonth()) {
  return state.transactions.filter((transaction) => transaction.date.startsWith(month));
}

function accountName(id) {
  return state.accounts.find((account) => account.id === id)?.name || "Account removed";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function currentMonthLabel() {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${currentMonth()}-01T12:00:00`));
}

function setNav(view) {
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
  document.getElementById("breadcrumbTitle").textContent = view[0].toUpperCase() + view.slice(1);
  document.getElementById("sidebar").classList.remove("open");
  if (view === "transactions") renderTransactions();
  if (view === "budgets") renderBudgetPage();
  if (view === "accounts") renderAccounts();
}

function selectedMonth() {
  return document.getElementById("monthSelect").value || currentMonth();
}

function monthLabel(value) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));
}

function initMonthSelect() {
  const select = document.getElementById("monthSelect");
  const months = new Set([currentMonth()]);
  state.transactions.forEach((tx) => months.add(tx.date.slice(0, 7)));
  const now = new Date();
  for (let i = 1; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  select.innerHTML = [...months].sort().reverse().map((month) => `<option value="${month}">${escapeHtml(monthLabel(month))}</option>`).join("");
  select.value = currentMonth();
}

function transactionsForMonth() {
  return monthTransactions(selectedMonth());
}

function totals(transactions) {
  return transactions.reduce((result, tx) => {
    result[tx.type] += Number(tx.amount) || 0;
    return result;
  }, { income: 0, expense: 0 });
}

function balanceForAccount(account) {
  const activity = state.transactions.filter((tx) => tx.accountId === account.id).reduce((sum, tx) => sum + (tx.type === "income" ? Number(tx.amount) : -Number(tx.amount)), 0);
  return Number(account.openingBalance || 0) + activity;
}

function iconForCategory(category) {
  return CATEGORY_META[category] || ["◦", ""];
}

function progressClass(ratio) {
  if (ratio > 1) return "over";
  if (ratio >= .8) return "warning";
  return "";
}

function renderDashboard() {
  const transactions = transactionsForMonth();
  const totalsForMonth = totals(transactions);
  const totalBalance = state.accounts.reduce((sum, account) => sum + balanceForAccount(account), 0);
  const spent = totalsForMonth.expense;
  const overall = Number(state.budgets.overall || 0);
  const ratio = overall ? spent / overall : 0;
  document.getElementById("totalBalance").textContent = formatMoney(totalBalance);
  document.getElementById("accountCount").textContent = state.accounts.length;
  document.getElementById("monthlyIncome").textContent = formatMoney(totalsForMonth.income);
  document.getElementById("monthlyExpenses").textContent = formatMoney(spent);
  document.getElementById("netSavings").textContent = formatMoney(totalsForMonth.income - spent);
  document.getElementById("savingsCaption").textContent = totalsForMonth.income ? `${Math.round((totalsForMonth.income - spent) / totalsForMonth.income * 100)}% of income saved` : "Income minus expenses";
  document.getElementById("budgetSubtitle").textContent = monthLabel(selectedMonth());
  document.getElementById("overallBudgetAmount").innerHTML = `${formatMoney(spent)} <small>/ ${formatMoney(overall)}</small>`;
  const fill = document.getElementById("overallProgress");
  fill.style.width = `${Math.min(ratio * 100, 100)}%`;
  fill.className = `progress-fill ${progressClass(ratio)}`;
  document.getElementById("overallBudgetStatus").textContent = !overall ? "Set a budget to get started" : ratio > 1 ? "You’re over your budget" : ratio >= .8 ? "Getting close to your limit" : "You’re right on track";
  document.getElementById("overallBudgetPercent").textContent = overall ? `${Math.round(ratio * 100)}%` : "—";
  renderSpendingChart(transactions, spent);
  renderBudgetPreview(transactions);
  renderRecentTransactions(transactions);
}

function renderSpendingChart(transactions, spent) {
  const totalsByCategory = {};
  transactions.filter((tx) => tx.type === "expense").forEach((tx) => { totalsByCategory[tx.category] = (totalsByCategory[tx.category] || 0) + Number(tx.amount); });
  const categories = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
  document.getElementById("donutTotal").textContent = formatMoney(spent);
  let degrees = 0;
  const segments = categories.map(([, amount], index) => {
    const start = degrees;
    degrees += spent ? amount / spent * 360 : 0;
    return `${COLORS[index % COLORS.length]} ${start}deg ${degrees}deg`;
  });
  document.getElementById("donutChart").style.background = segments.length ? `conic-gradient(${segments.join(",")})` : "conic-gradient(#e9eee9 0deg 360deg)";
  const top = categories.slice(0, 5);
  document.getElementById("categoryLegend").innerHTML = top.length ? top.map(([category, amount], index) => `<div class="legend-item"><i class="legend-dot" style="background:${COLORS[index % COLORS.length]}"></i><span>${escapeHtml(category)}</span><strong class="legend-value">${formatMoney(amount)}</strong></div>`).join("") : `<div class="empty-state">No spending this month yet.</div>`;
}

function renderBudgetPreview(transactions) {
  const expenses = {};
  transactions.filter((tx) => tx.type === "expense").forEach((tx) => { expenses[tx.category] = (expenses[tx.category] || 0) + Number(tx.amount); });
  const categories = Object.entries(state.budgets.categories || {}).filter(([, limit]) => Number(limit) > 0).sort((a, b) => (expenses[b[0]] || 0) / b[1] - (expenses[a[0]] || 0) / a[1]).slice(0, 4);
  document.getElementById("budgetPreview").innerHTML = categories.length ? categories.map(([category, limit]) => {
    const amount = expenses[category] || 0;
    const percent = amount / Number(limit) * 100;
    const status = progressClass(amount / Number(limit));
    return `<div class="budget-mini"><span>${escapeHtml(category)}</span><strong>${formatMoney(amount)} / ${formatMoney(limit)}</strong><div class="mini-progress"><i class="${status}" style="width:${Math.min(percent, 100)}%"></i></div></div>`;
  }).join("") : `<span class="muted">Add category budgets to see progress here.</span>`;
}

function transactionRow(tx, includeActions = false) {
  const [icon, style] = iconForCategory(tx.category);
  return `<tr><td><div class="transaction-name"><span class="transaction-icon ${style}">${icon}</span><span>${escapeHtml(tx.note || tx.category)}<small>${escapeHtml(tx.note ? tx.category : tx.type === "income" ? "Income" : "Expense")}</small></span></div></td><td><span class="category-pill">${escapeHtml(tx.category)}</span></td><td>${escapeHtml(formatDate(tx.date))}</td><td>${escapeHtml(accountName(tx.accountId))}</td><td class="amount ${tx.type === "income" ? "income" : ""}">${tx.type === "income" ? "+" : "−"}${formatMoney(tx.amount)}</td>${includeActions ? `<td><div class="row-actions"><button class="row-action" data-edit="${escapeHtml(tx.id)}" aria-label="Edit transaction">✎</button><button class="row-action" data-delete="${escapeHtml(tx.id)}" aria-label="Delete transaction">×</button></div></td>` : ""}</tr>`;
}

function renderRecentTransactions(transactions) {
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  document.getElementById("recentTransactions").innerHTML = recent.map((tx) => transactionRow(tx)).join("");
  document.getElementById("recentEmpty").classList.toggle("hidden", recent.length > 0);
}

function renderTransactions() {
  const search = document.getElementById("transactionSearch").value.trim().toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const account = document.getElementById("accountFilter").value;
  const visible = [...state.transactions].filter((tx) => {
    const searchable = `${tx.note} ${tx.category} ${accountName(tx.accountId)}`.toLowerCase();
    return (!search || searchable.includes(search)) && (!type || tx.type === type) && (!category || tx.category === category) && (!account || tx.accountId === account);
  }).sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("allTransactions").innerHTML = visible.map((tx) => transactionRow(tx, true)).join("");
  document.getElementById("transactionsEmpty").classList.toggle("hidden", visible.length > 0);
  populateFilterOptions();
}

function populateFilterOptions() {
  const categories = [...new Set(state.transactions.map((tx) => tx.category))].sort();
  const categoryFilter = document.getElementById("categoryFilter");
  const currentCategory = categoryFilter.value;
  categoryFilter.innerHTML = `<option value="">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  categoryFilter.value = categories.includes(currentCategory) ? currentCategory : "";
  const accountFilter = document.getElementById("accountFilter");
  const currentAccount = accountFilter.value;
  accountFilter.innerHTML = `<option value="">All accounts</option>${state.accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join("")}`;
  accountFilter.value = state.accounts.some((account) => account.id === currentAccount) ? currentAccount : "";
}

function renderBudgetPage() {
  const transactions = transactionsForMonth().filter((tx) => tx.type === "expense");
  const spentByCategory = {};
  transactions.forEach((tx) => { spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + Number(tx.amount); });
  const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const categoryLimits = state.budgets.categories || {};
  const limit = Number(state.budgets.overall || 0);
  document.getElementById("budgetPageLimit").textContent = formatMoney(limit);
  document.getElementById("budgetPageSpent").textContent = formatMoney(spent);
  document.getElementById("budgetPageRemaining").textContent = formatMoney(limit - spent);
  document.getElementById("budgetPageCaption").textContent = limit && spent > limit ? "You’re over your monthly limit" : "Available to spend this month";
  const categories = [...new Set([...Object.keys(categoryLimits), ...Object.keys(spentByCategory)])].sort();
  document.getElementById("budgetList").innerHTML = categories.length ? categories.map((category) => {
    const amount = spentByCategory[category] || 0;
    const categoryLimit = Number(categoryLimits[category] || 0);
    const percent = categoryLimit ? amount / categoryLimit * 100 : 0;
    const status = categoryLimit ? progressClass(amount / categoryLimit) : "";
    return `<div class="budget-list-item"><div class="budget-line"><span>${escapeHtml(category)}</span><strong>${formatMoney(amount)} <span class="muted">/ ${categoryLimit ? formatMoney(categoryLimit) : "No limit"}</span></strong></div><div class="progress-track"><div class="progress-fill ${status}" style="width:${Math.min(percent, 100)}%"></div></div><div class="budget-line"><span>${categoryLimit ? percent > 100 ? `${Math.round(percent)}% of budget · over limit` : `${Math.round(percent)}% of budget` : "Tap edit budgets to set a limit"}</span><span>${categoryLimit ? `${formatMoney(categoryLimit - amount)} left` : ""}</span></div></div>`;
  }).join("") : `<div class="empty-state">No budgets yet. Add a limit to start tracking your spending.</div>`;
}

function renderAccounts() {
  const total = state.accounts.reduce((sum, account) => sum + balanceForAccount(account), 0);
  document.getElementById("accountTotal").textContent = formatMoney(total);
  const icons = { "Bank account": "▣", Cash: "◉", "Credit card": "▤", Wallet: "▱" };
  document.getElementById("accountsGrid").innerHTML = state.accounts.length ? state.accounts.map((account) => `<article class="panel account-card"><div class="account-card-head"><span class="account-icon">${icons[account.type] || "▣"}</span><span class="account-type">${escapeHtml(account.type)}</span></div><h3>${escapeHtml(account.name)}</h3><strong>${formatMoney(balanceForAccount(account))}</strong><p>Opening balance ${formatMoney(account.openingBalance || 0)}</p></article>`).join("") : `<div class="panel empty-state">No accounts yet. Add your first account to get started.</div>`;
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
  const firstInput = document.querySelector(`#${id} input:not([type="hidden"]):not([type="file"]), #${id} select`);
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.classList.add("hidden"));
}

function populateTransactionForm(transaction = null) {
  selectedType = transaction?.type || "expense";
  document.querySelectorAll(".type-option").forEach((button) => button.classList.toggle("selected", button.dataset.type === selectedType));
  const categorySelect = document.getElementById("transactionCategory");
  const categories = CATEGORIES[selectedType];
  categorySelect.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  if (transaction && !categories.includes(transaction.category)) categorySelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(transaction.category)}">${escapeHtml(transaction.category)}</option>`);
  categorySelect.value = transaction?.category || (selectedType === "expense" ? "Food & Drink" : "Salary");
  document.getElementById("transactionAccount").innerHTML = state.accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join("");
  if (transaction?.accountId && state.accounts.some((account) => account.id === transaction.accountId)) document.getElementById("transactionAccount").value = transaction.accountId;
  document.getElementById("transactionId").value = transaction?.id || "";
  document.getElementById("transactionAmount").value = transaction?.amount ?? "";
  document.getElementById("transactionDate").value = transaction?.date || new Date().toISOString().slice(0, 10);
  document.getElementById("transactionNote").value = transaction?.note || "";
  document.getElementById("transactionModalTitle").textContent = transaction ? "Edit transaction" : "Add transaction";
  document.getElementById("saveTransactionButton").innerHTML = transaction ? "Save changes <span>→</span>" : "Save transaction <span>→</span>";
}

function openTransactionForm(transaction = null) {
  if (!state.accounts.length) {
    showToast("Add an account before recording transactions.");
    setNav("accounts");
    openModal("accountModal");
    return;
  }
  populateTransactionForm(transaction);
  openModal("transactionModal");
}

function updateType(type) {
  const currentCategory = document.getElementById("transactionCategory").value;
  selectedType = type;
  document.querySelectorAll(".type-option").forEach((button) => button.classList.toggle("selected", button.dataset.type === type));
  const options = CATEGORIES[type];
  document.getElementById("transactionCategory").innerHTML = options.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  document.getElementById("transactionCategory").value = options.includes(currentCategory) ? currentCategory : type === "expense" ? "Food & Drink" : "Salary";
}

function openBudgetForm() {
  document.getElementById("overallBudgetInput").value = state.budgets.overall || "";
  const categories = [...new Set([...CATEGORIES.expense, ...Object.keys(state.budgets.categories || {})])];
  document.getElementById("budgetInputs").innerHTML = categories.map((category) => `<label class="field-label">${escapeHtml(category)}<div class="amount-input"><span>₹</span><input type="number" min="0" step="100" data-budget-category="${escapeHtml(category)}" value="${Number(state.budgets.categories?.[category] || 0) || ""}" placeholder="No limit"></div></label>`).join("");
  openModal("budgetModal");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field.trim()); if (row.some((cell) => cell !== "")) rows.push(row); }
  return rows;
}

function setImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      if (rows.length < 2) throw new Error("CSV needs a header row and at least one transaction.");
      importHeaders = rows[0].map((header, index) => header || `Column ${index + 1}`);
      importRows = rows.slice(1);
      const selects = ["mapDate", "mapAmount", "mapType", "mapCategory", "mapNote"];
      const defaults = { mapDate: /date/i, mapAmount: /amount|value|total/i, mapType: /type|kind/i, mapCategory: /category/i, mapNote: /note|description|memo|name/i };
      selects.forEach((id) => {
        const select = document.getElementById(id);
        const optional = id === "mapType" || id === "mapCategory" || id === "mapNote";
        select.innerHTML = `${optional ? `<option value="">Do not import</option>` : ""}${importHeaders.map((header, index) => `<option value="${index}">${escapeHtml(header)}</option>`).join("")}`;
        const match = importHeaders.findIndex((header) => defaults[id].test(header));
        if (match >= 0) select.value = String(match);
      });
      document.getElementById("importPreview").classList.add("hidden");
      document.getElementById("confirmImportButton").disabled = true;
    } catch (error) { showToast(error.message); }
  };
  reader.onerror = () => showToast("Could not read this CSV file.");
  reader.readAsText(file);
}

function previewImport() {
  if (!importRows.length) { showToast("Choose a CSV file first."); return; }
  const dateIndex = document.getElementById("mapDate").value;
  const amountIndex = document.getElementById("mapAmount").value;
  if (dateIndex === "" || amountIndex === "") { showToast("Select date and amount columns."); return; }
  const typeIndex = document.getElementById("mapType").value;
  const categoryIndex = document.getElementById("mapCategory").value;
  const noteIndex = document.getElementById("mapNote").value;
  importPreviewRows = importRows.map((row) => {
    const rawAmount = (row[Number(amountIndex)] || "").replace(/[₹,\s]/g, "");
    const rawDate = (row[Number(dateIndex)] || "").trim();
    const parsedDate = new Date(rawDate);
    const amount = Math.abs(Number(rawAmount));
    const typeText = typeIndex === "" ? "" : (row[Number(typeIndex)] || "").toLowerCase();
    const type = /income|credit|deposit/.test(typeText) || Number(rawAmount) < 0 ? "income" : "expense";
    const date = Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10);
    return { date, amount, type, category: categoryIndex === "" ? "" : row[Number(categoryIndex)] || "", note: noteIndex === "" ? "" : row[Number(noteIndex)] || "" };
  });
  const validCount = importPreviewRows.filter((row) => row.date && row.amount > 0).length;
  const preview = importPreviewRows.slice(0, 5);
  document.getElementById("importPreview").innerHTML = `<p class="muted">${validCount} valid rows found · showing ${preview.length} of ${importPreviewRows.length}</p><table><thead><tr><th>DATE</th><th>TYPE</th><th>CATEGORY</th><th>AMOUNT</th></tr></thead><tbody>${preview.map((row) => `<tr><td>${escapeHtml(row.date || "Invalid date")}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.category || "Other")}</td><td>${formatMoney(row.amount)}</td></tr>`).join("")}</tbody></table>`;
  document.getElementById("importPreview").classList.remove("hidden");
  document.getElementById("confirmImportButton").disabled = validCount === 0;
}

function parseImportedDate(value) {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]), 12);
  return direct;
}

document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => setNav(button.dataset.view)));
document.querySelectorAll("[data-navigate]").forEach((button) => button.addEventListener("click", () => setNav(button.dataset.navigate)));
document.querySelectorAll("[data-open-add]").forEach((button) => button.addEventListener("click", () => openTransactionForm()));
document.getElementById("addTransactionButton").addEventListener("click", () => openTransactionForm());
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("monthSelect").addEventListener("change", renderDashboard);
document.querySelectorAll(".type-option").forEach((button) => button.addEventListener("click", () => updateType(button.dataset.type)));
document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModals(); }));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openTransactionForm(); }
  if (!["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName) && event.key.toLowerCase() === "n") openTransactionForm();
});
document.getElementById("transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.getElementById("transactionId").value;
  const transaction = {
    id: id || `tx-${Date.now()}`,
    amount: Number(document.getElementById("transactionAmount").value),
    type: selectedType,
    category: document.getElementById("transactionCategory").value,
    accountId: document.getElementById("transactionAccount").value,
    date: document.getElementById("transactionDate").value,
    note: document.getElementById("transactionNote").value.trim()
  };
  if (!Number.isFinite(transaction.amount) || transaction.amount <= 0 || !transaction.date || !transaction.accountId) { showToast("Enter a valid amount, date, and account."); return; }
  if (id) state.transactions = state.transactions.map((item) => item.id === id ? transaction : item);
  else state.transactions.push(transaction);
  saveState(); closeModals(); renderAll(); showToast(id ? "Transaction updated." : "Transaction saved.");
});
document.getElementById("allTransactions").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const transaction = state.transactions.find((tx) => tx.id === editButton.dataset.edit);
    if (transaction) openTransactionForm(transaction);
  }
  if (deleteButton) {
    const transaction = state.transactions.find((tx) => tx.id === deleteButton.dataset.delete);
    if (transaction && confirm(`Delete ${transaction.note || transaction.category} for ${formatMoney(transaction.amount)}?`)) {
      state.transactions = state.transactions.filter((tx) => tx.id !== transaction.id);
      saveState(); renderAll(); showToast("Transaction deleted.");
    }
  }
});
["transactionSearch", "typeFilter", "categoryFilter", "accountFilter"].forEach((id) => document.getElementById(id).addEventListener(id === "transactionSearch" ? "input" : "change", renderTransactions));
document.getElementById("editBudgetButton").addEventListener("click", openBudgetForm);
document.getElementById("budgetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.budgets.overall = Math.max(0, Number(document.getElementById("overallBudgetInput").value) || 0);
  const categories = {};
  document.querySelectorAll("[data-budget-category]").forEach((input) => { if (Number(input.value) > 0) categories[input.dataset.budgetCategory] = Number(input.value); });
  state.budgets.categories = categories;
  saveState(); closeModals(); renderAll(); showToast("Your budgets are up to date.");
});
document.getElementById("addAccountButton").addEventListener("click", () => openModal("accountModal"));
document.getElementById("accountForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("accountName").value.trim();
  if (!name) return;
  state.accounts.push({ id: `acc-${Date.now()}`, name, type: document.getElementById("accountType").value, openingBalance: Number(document.getElementById("openingBalance").value) || 0 });
  saveState(); closeModals(); renderAll(); document.getElementById("accountForm").reset(); setNav("accounts"); showToast("Account added.");
});
document.getElementById("exportButton").addEventListener("click", () => {
  const headers = ["date", "amount", "type", "category", "account", "note"];
  const lines = state.transactions.map((tx) => [tx.date, tx.amount, tx.type, tx.category, accountName(tx.accountId), tx.note].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[headers.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = "pennywise-transactions.csv"; link.click(); URL.revokeObjectURL(link.href);
  showToast("Your CSV export is ready.");
});
document.getElementById("importButton").addEventListener("click", () => { document.getElementById("importFileInput").value = ""; importRows = []; importPreviewRows = []; document.getElementById("importPreview").classList.add("hidden"); document.getElementById("confirmImportButton").disabled = true; openModal("importModal"); });
document.getElementById("importFileInput").addEventListener("change", (event) => { if (event.target.files[0]) setImportFile(event.target.files[0]); });
document.getElementById("previewImportButton").addEventListener("click", previewImport);
document.getElementById("importForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const accountId = state.accounts[0]?.id;
  if (!accountId) { showToast("Add an account before importing transactions."); closeModals(); setNav("accounts"); openModal("accountModal"); return; }
  const dateIndex = document.getElementById("mapDate").value;
  const amountIndex = document.getElementById("mapAmount").value;
  let imported = 0;
  let skipped = 0;
  importRows.forEach((sourceRow, index) => {
    const preview = importPreviewRows[index];
    if (!preview || !preview.date || !(preview.amount > 0)) { skipped++; return; }
    const rawAmount = (sourceRow[Number(amountIndex)] || "").replace(/[₹,\s]/g, "");
    const dateValue = sourceRow[Number(dateIndex)] || "";
    const parsedDate = parseImportedDate(dateValue);
    const date = !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : preview.date;
    const tx = {
      id: `tx-${Date.now()}-${index}`,
      amount: preview.amount,
      type: preview.type,
      category: preview.category || (preview.type === "income" ? "Other income" : "Other"),
      accountId,
      date,
      note: preview.note
    };
    if (!CATEGORIES[tx.type].includes(tx.category)) CATEGORIES[tx.type].push(tx.category);
    if (state.transactions.some((existing) => existing.date === tx.date && Number(existing.amount) === tx.amount && existing.note.trim().toLowerCase() === tx.note.trim().toLowerCase())) { skipped++; return; }
    state.transactions.push(tx); imported++;
  });
  saveState(); closeModals(); renderAll(); showToast(`${imported} imported${skipped ? ` · ${skipped} skipped` : ""}.`);
});

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderBudgetPage();
  renderAccounts();
}

document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
initMonthSelect();
renderAll();
