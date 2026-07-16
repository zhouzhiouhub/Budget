const {
  absoluteAmountYuan,
  addAmountYuan,
  calculateBudgetUsage,
  compareAmountYuan,
  normalizeAmountYuan,
  subtractAmountYuan,
} = require("../utils/money");

const STORAGE_KEY = "budget_flow_state_v1";
let memoryBudgetState = null;

function getCurrentPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodLabel(period) {
  const parts = period.split("-");
  return `${parts[0]}年${Number(parts[1])}月`;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function hasWxStorage() {
  return typeof wx !== "undefined" && wx.getStorageSync && wx.setStorageSync;
}

function createInitialBudgetState() {
  return {
    budgets: {},
    transactions: [],
    mutations: [],
  };
}

function normalizeBudgetState(rawState) {
  const state = rawState && typeof rawState === "object" ? rawState : createInitialBudgetState();
  return {
    budgets: state.budgets && typeof state.budgets === "object" ? state.budgets : {},
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    mutations: Array.isArray(state.mutations) ? state.mutations : [],
  };
}

function readBudgetState() {
  if (hasWxStorage()) {
    return normalizeBudgetState(wx.getStorageSync(STORAGE_KEY));
  }

  if (!memoryBudgetState) {
    memoryBudgetState = createInitialBudgetState();
  }
  return normalizeBudgetState(memoryBudgetState);
}

function writeBudgetState(state) {
  const normalizedState = normalizeBudgetState(state);
  if (hasWxStorage()) {
    wx.setStorageSync(STORAGE_KEY, normalizedState);
  } else {
    memoryBudgetState = normalizedState;
  }
  return normalizedState;
}

function getStatusClass(status) {
  if (status === "over_budget") {
    return "over-budget";
  }
  return status;
}

function getRemainingDisplay(amountYuan) {
  if (compareAmountYuan(amountYuan, "0.00") < 0) {
    return {
      remainingTitle: "超支金额",
      remainingDisplay: `${absoluteAmountYuan(amountYuan)} 元`,
    };
  }

  return {
    remainingTitle: "剩余额度",
    remainingDisplay: `${amountYuan} 元`,
  };
}

function normalizeTransaction(transaction) {
  const amountYuan = normalizeAmountYuan(transaction.amount_yuan);
  const expenseTypeName = transaction.expense_type_name || "未分类";

  return {
    id: transaction.id,
    period: transaction.period,
    type: transaction.type,
    title: transaction.title,
    expense_type_id: transaction.expense_type_id || "",
    expense_type_name: expenseTypeName,
    amount_yuan: amountYuan,
    remark: transaction.remark || "",
    amountLabel: transaction.type === "expense" ? `-${amountYuan} 元` : `${amountYuan} 元`,
    occurred_at: transaction.occurred_at,
    metaText: `${expenseTypeName} · ${transaction.occurred_at}`,
  };
}

function sumExpenseAmountYuan(transactions) {
  const expenseAmounts = transactions
    .filter((item) => item.type === "expense")
    .map((item) => item.amount_yuan);

  return addAmountYuan(...expenseAmounts);
}

function getRecentExpenseTransactions(transactions, limit = 5) {
  return transactions
    .filter((item) => item.type === "expense")
    .slice()
    .sort((left, right) => String(right.occurred_at).localeCompare(String(left.occurred_at)))
    .slice(0, limit);
}

function normalizeBudgetAmountUpdate(amountYuan) {
  const totalAmountYuan = normalizeAmountYuan(amountYuan);
  if (compareAmountYuan(totalAmountYuan, "0.00") <= 0) {
    throw new Error("总预算金额必须大于 0 元");
  }

  return {
    total_amount_yuan: totalAmountYuan,
    totalDisplay: `${totalAmountYuan} 元`,
  };
}

function createEmptyDashboardState(period = getCurrentPeriod()) {
  return {
    summary: {
      has_budget: false,
      period,
      period_label: getPeriodLabel(period),
      scope: "personal",
      scope_label: "个人",
      total_amount_yuan: "0.00",
      used_amount_yuan: "0.00",
      remaining_amount_yuan: "0.00",
      totalDisplay: "0.00 元",
      usedDisplay: "0.00 元",
      remainingTitle: "剩余额度",
      remainingDisplay: "0.00 元",
      status: "zero_budget",
      statusClass: "zero-budget",
      statusText: "未设置",
      usedRateText: "0%",
      progressPercent: "0",
    },
    transactions: [],
  };
}

function buildDashboardState(snapshot = {}) {
  const period = snapshot.period || getCurrentPeriod();
  const allTransactions = (snapshot.transactions || []).map(normalizeTransaction);

  if (!snapshot.total_amount_yuan) {
    return createEmptyDashboardState(period);
  }

  const totalAmountYuan = normalizeAmountYuan(snapshot.total_amount_yuan);
  const usedAmountYuan = snapshot.used_amount_yuan
    ? normalizeAmountYuan(snapshot.used_amount_yuan)
    : sumExpenseAmountYuan(allTransactions);
  const remainingAmountYuan = subtractAmountYuan(totalAmountYuan, usedAmountYuan);
  const usage = calculateBudgetUsage(usedAmountYuan, totalAmountYuan);
  const remaining = getRemainingDisplay(remainingAmountYuan);
  const recentExpenseTransactions = getRecentExpenseTransactions(allTransactions);

  return {
    summary: {
      has_budget: compareAmountYuan(totalAmountYuan, "0.00") > 0,
      period,
      period_label: getPeriodLabel(period),
      scope: snapshot.scope || "personal",
      scope_label: snapshot.scope === "organization" ? "组织" : "个人",
      total_amount_yuan: totalAmountYuan,
      used_amount_yuan: usedAmountYuan,
      remaining_amount_yuan: remainingAmountYuan,
      totalDisplay: `${totalAmountYuan} 元`,
      usedDisplay: `${usedAmountYuan} 元`,
      remainingTitle: remaining.remainingTitle,
      remainingDisplay: remaining.remainingDisplay,
      status: usage.status,
      statusClass: getStatusClass(usage.status),
      statusText: usage.statusText,
      usedRateText: usage.usedRateText,
      progressPercent: usage.progressPercent,
    },
    transactions: recentExpenseTransactions,
  };
}

function getPeriodTransactions(state, period) {
  return state.transactions.filter((item) => item.period === period);
}

function getBudgetSnapshot(state, period = getCurrentPeriod()) {
  const budget = state.budgets[period];
  return {
    period,
    scope: "personal",
    total_amount_yuan: budget ? budget.total_amount_yuan : "",
    transactions: getPeriodTransactions(state, period),
  };
}

function calculateOverBudgetAmount(remainingAmountYuan, expenseAmountYuan) {
  if (compareAmountYuan(remainingAmountYuan, "0.00") < 0) {
    return addAmountYuan(expenseAmountYuan, absoluteAmountYuan(remainingAmountYuan));
  }

  if (compareAmountYuan(remainingAmountYuan, expenseAmountYuan) < 0) {
    return subtractAmountYuan(expenseAmountYuan, remainingAmountYuan);
  }

  return "0.00";
}

function getExpenseRecords(period = getCurrentPeriod(), expenseTypeId = "all") {
  const state = readBudgetState();
  const records = getPeriodTransactions(state, period)
    .map(normalizeTransaction)
    .filter((item) => item.type === "expense")
    .filter((item) => expenseTypeId === "all" || item.expense_type_id === expenseTypeId)
    .sort((left, right) => String(right.occurred_at).localeCompare(String(left.occurred_at)));

  return Promise.resolve(records);
}

function loadDashboard(period = getCurrentPeriod()) {
  const state = readBudgetState();
  return Promise.resolve(buildDashboardState(getBudgetSnapshot(state, period)));
}

function saveBudgetAmount(amountYuan, period = getCurrentPeriod()) {
  const budgetAmount = normalizeBudgetAmountUpdate(amountYuan);
  const state = readBudgetState();
  const existingBudget = state.budgets[period] || {};
  const now = new Date().toISOString();

  state.budgets[period] = {
    id: existingBudget.id || createId("budget"),
    scope: "personal",
    period,
    total_amount_yuan: budgetAmount.total_amount_yuan,
    created_at: existingBudget.created_at || now,
    updated_at: now,
  };

  const nextState = writeBudgetState(state);
  return Promise.resolve(buildDashboardState(getBudgetSnapshot(nextState, period)));
}

function saveExpenseRecord(expenseDraft, period = getCurrentPeriod()) {
  const state = readBudgetState();
  const budget = state.budgets[period];

  if (!budget || !budget.total_amount_yuan) {
    throw new Error("请先设置本月总预算");
  }

  const amountYuan = normalizeAmountYuan(expenseDraft.amount_yuan);
  const dashboardBefore = buildDashboardState(getBudgetSnapshot(state, period));
  const overBudgetAmountYuan = calculateOverBudgetAmount(dashboardBefore.summary.remaining_amount_yuan, amountYuan);

  if (compareAmountYuan(overBudgetAmountYuan, "0.00") > 0) {
    throw new Error(`本次消费将超出预算 ${overBudgetAmountYuan} 元，请先调整总预算`);
  }

  const now = new Date().toISOString();
  const record = {
    id: createId("expense"),
    period,
    type: "expense",
    title: expenseDraft.remark || expenseDraft.expense_type_name || "消费",
    expense_type_id: expenseDraft.expense_type_id,
    expense_type_name: expenseDraft.expense_type_name,
    amount_yuan: amountYuan,
    remark: expenseDraft.remark || "",
    occurred_at: expenseDraft.occurred_at || getLocalDateString(),
    created_at: now,
    updated_at: now,
  };
  const afterUsedAmountYuan = addAmountYuan(dashboardBefore.summary.used_amount_yuan, amountYuan);

  state.transactions.push(record);
  state.mutations.push({
    id: createId("mutation"),
    budget_period_id: budget.id,
    expense_record_id: record.id,
    mutation_type: "expense",
    amount_yuan: amountYuan,
    before_used_amount_yuan: dashboardBefore.summary.used_amount_yuan,
    after_used_amount_yuan: afterUsedAmountYuan,
    over_budget_amount_yuan: "0.00",
    created_at: now,
  });

  const nextState = writeBudgetState(state);

  return Promise.resolve({
    success: true,
    data: record,
    dashboard: buildDashboardState(getBudgetSnapshot(nextState, period)),
  });
}

module.exports = {
  buildDashboardState,
  createEmptyDashboardState,
  getCurrentPeriod,
  getExpenseRecords,
  loadDashboard,
  normalizeBudgetAmountUpdate,
  readBudgetState,
  saveBudgetAmount,
  saveExpenseRecord,
};