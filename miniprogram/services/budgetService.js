const {
  absoluteAmountYuan,
  addAmountYuan,
  calculateBudgetUsage,
  compareAmountYuan,
  normalizeAmountYuan,
  subtractAmountYuan,
} = require("../utils/money");

const CATEGORY_COLORS = {
  food: "#13795b",
  transport: "#2563eb",
  office: "#d97706",
  entertainment: "#be123c",
};

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

function normalizeCategory(category) {
  const amountYuan = normalizeAmountYuan(category.amount_yuan);
  const usedAmountYuan = normalizeAmountYuan(category.used_amount_yuan || "0.00");
  const remainingAmountYuan = subtractAmountYuan(amountYuan, usedAmountYuan);
  const usage = calculateBudgetUsage(usedAmountYuan, amountYuan);
  const remaining = getRemainingDisplay(remainingAmountYuan);

  return {
    id: category.id,
    name: category.name,
    amount_yuan: amountYuan,
    used_amount_yuan: usedAmountYuan,
    remaining_amount_yuan: remainingAmountYuan,
    remainingDisplay: remaining.remainingDisplay,
    color: category.color || CATEGORY_COLORS[category.id] || "#617064",
    status: usage.status,
    statusClass: getStatusClass(usage.status),
    statusText: usage.statusText,
    usedRateText: usage.usedRateText,
    progressPercent: usage.progressPercent,
  };
}

function normalizeTransaction(transaction) {
  const amountYuan = normalizeAmountYuan(transaction.amount_yuan);

  return {
    id: transaction.id,
    type: transaction.type,
    title: transaction.title,
    category_id: transaction.category_id,
    category_name: transaction.category_name,
    amount_yuan: amountYuan,
    amountLabel: transaction.type === "expense" ? `-${amountYuan} 元` : `${amountYuan} 元`,
    occurred_at: transaction.occurred_at,
  };
}

function createEmptyDashboardState(period = getCurrentPeriod()) {
  return {
    summary: {
      period,
      period_label: getPeriodLabel(period),
      scope: "personal",
      scope_label: "个人",
      total_amount_yuan: "0.00",
      used_amount_yuan: "0.00",
      remaining_amount_yuan: "0.00",
      remainingTitle: "剩余额度",
      remainingDisplay: "0.00 元",
      status: "zero_budget",
      statusClass: "zero-budget",
      statusText: "未设置",
      usedRateText: "0%",
      progressPercent: "0",
    },
    categories: [],
    transactions: [],
  };
}

function buildDashboardState(snapshot) {
  const period = snapshot.period || getCurrentPeriod();
  const categories = (snapshot.categories || []).map(normalizeCategory);
  const transactions = (snapshot.transactions || []).map(normalizeTransaction);

  if (!categories.length) {
    return createEmptyDashboardState(period);
  }

  const totalAmountYuan = addAmountYuan(...categories.map((item) => item.amount_yuan));
  const usedAmountYuan = addAmountYuan(...categories.map((item) => item.used_amount_yuan));
  const remainingAmountYuan = subtractAmountYuan(totalAmountYuan, usedAmountYuan);
  const usage = calculateBudgetUsage(usedAmountYuan, totalAmountYuan);
  const remaining = getRemainingDisplay(remainingAmountYuan);

  return {
    summary: {
      period,
      period_label: getPeriodLabel(period),
      scope: snapshot.scope || "personal",
      scope_label: snapshot.scope === "organization" ? "组织" : "个人",
      total_amount_yuan: totalAmountYuan,
      used_amount_yuan: usedAmountYuan,
      remaining_amount_yuan: remainingAmountYuan,
      remainingTitle: remaining.remainingTitle,
      remainingDisplay: remaining.remainingDisplay,
      status: usage.status,
      statusClass: getStatusClass(usage.status),
      statusText: usage.statusText,
      usedRateText: usage.usedRateText,
      progressPercent: usage.progressPercent,
    },
    categories,
    transactions,
  };
}

function createDemoBudgetSnapshot(period = getCurrentPeriod()) {
  return {
    id: `budget-${period}`,
    scope: "personal",
    period,
    categories: [
      {
        id: "food",
        name: "餐饮",
        amount_yuan: "1800.00",
        used_amount_yuan: "1268.40",
      },
      {
        id: "transport",
        name: "交通",
        amount_yuan: "600.00",
        used_amount_yuan: "328.00",
      },
      {
        id: "office",
        name: "办公",
        amount_yuan: "900.00",
        used_amount_yuan: "765.20",
      },
      {
        id: "entertainment",
        name: "娱乐",
        amount_yuan: "500.00",
        used_amount_yuan: "540.00",
      },
    ],
    transactions: [
      {
        id: "txn-001",
        type: "expense",
        title: "午餐",
        category_id: "food",
        category_name: "餐饮",
        amount_yuan: "42.00",
        occurred_at: `${period}-16`,
      },
      {
        id: "txn-002",
        type: "expense",
        title: "地铁通勤",
        category_id: "transport",
        category_name: "交通",
        amount_yuan: "8.00",
        occurred_at: `${period}-15`,
      },
      {
        id: "txn-003",
        type: "expense",
        title: "资料订阅",
        category_id: "office",
        category_name: "办公",
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
};
