const {
  absoluteAmountYuan,
  addAmountYuan,
  calculateBudgetUsage,
  compareAmountYuan,
  normalizeAmountYuan,
  subtractAmountYuan,
} = require("../utils/money");

function getCurrentPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getPeriodLabel(period) {
  const parts = period.split("-");
  return `${parts[0]}年${Number(parts[1])}月`;
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
    type: transaction.type,
    title: transaction.title,
    expense_type_id: transaction.expense_type_id || "",
    expense_type_name: expenseTypeName,
    amount_yuan: amountYuan,
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
  const transactions = (snapshot.transactions || []).map(normalizeTransaction);

  if (!snapshot.total_amount_yuan) {
    return createEmptyDashboardState(period);
  }

  const totalAmountYuan = normalizeAmountYuan(snapshot.total_amount_yuan);
  const usedAmountYuan = snapshot.used_amount_yuan
    ? normalizeAmountYuan(snapshot.used_amount_yuan)
    : sumExpenseAmountYuan(transactions);
  const remainingAmountYuan = subtractAmountYuan(totalAmountYuan, usedAmountYuan);
  const usage = calculateBudgetUsage(usedAmountYuan, totalAmountYuan);
  const remaining = getRemainingDisplay(remainingAmountYuan);

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
    transactions,
  };
}

function createDemoBudgetSnapshot(period = getCurrentPeriod()) {
  return {
    id: `budget-${period}`,
    scope: "personal",
    period,
    total_amount_yuan: "3800.00",
    used_amount_yuan: "2901.60",
    transactions: [
      {
        id: "txn-001",
        type: "expense",
        title: "午餐",
        expense_type_id: "food",
        expense_type_name: "餐饮",
        amount_yuan: "42.00",
        occurred_at: `${period}-16`,
      },
      {
        id: "txn-002",
        type: "expense",
        title: "地铁通勤",
        expense_type_id: "transport",
        expense_type_name: "交通",
        amount_yuan: "8.00",
        occurred_at: `${period}-15`,
      },
      {
        id: "txn-003",
        type: "expense",
        title: "资料订阅",
        expense_type_id: "office",
        expense_type_name: "办公",
        amount_yuan: "68.00",
        occurred_at: `${period}-14`,
      },
    ],
  };
}

function loadDashboard() {
  return Promise.resolve(buildDashboardState(createDemoBudgetSnapshot()));
}

module.exports = {
  buildDashboardState,
  createDemoBudgetSnapshot,
  createEmptyDashboardState,
  getCurrentPeriod,
  loadDashboard,
  normalizeBudgetAmountUpdate,
};