const {
  absoluteAmountYuan,
  addAmountYuan,
  calculateBudgetUsage,
  compareAmountYuan,
  normalizeAmountYuan,
  parseYuanToCents,
  subtractAmountYuan,
} = require("../utils/money");

const STORAGE_KEY = "budget_flow_state_v1";
let memoryBudgetState = null;

function getCurrentPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizePeriod(period, fallback = getCurrentPeriod()) {
  const normalizedPeriod = String(period || "").trim();
  return /^\d{4}-\d{2}$/.test(normalizedPeriod) ? normalizedPeriod : fallback;
}
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousPeriod(date = new Date()) {
  return getCurrentPeriod(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

function getLastDateOfPeriod(period) {
  const normalizedPeriod = normalizePeriod(period);
  const [year, month] = normalizedPeriod.split("-").map((item) => Number(item));
  return getLocalDateString(new Date(year, month, 0));
}

function getDefaultOccurredDateForPeriod(period) {
  const normalizedPeriod = normalizePeriod(period);
  return normalizedPeriod === getCurrentPeriod() ? getLocalDateString() : getLastDateOfPeriod(normalizedPeriod);
}

function getPeriodEditPolicy(period = getCurrentPeriod(), date = new Date()) {
  const normalizedPeriod = normalizePeriod(period);
  const currentPeriod = getCurrentPeriod(date);
  const previousPeriod = getPreviousPeriod(date);
  const isCurrentPeriod = normalizedPeriod === currentPeriod;
  const isPreviousGracePeriod = normalizedPeriod === previousPeriod && date.getDate() <= 2;
  const isFuturePeriod = normalizedPeriod > currentPeriod;
  const canEditRecords = isCurrentPeriod || isPreviousGracePeriod;
  const periodLabel = getPeriodLabel(normalizedPeriod);
  const readonlyText = isFuturePeriod
    ? `${periodLabel}还未到，当前还没有记录`
    : `${periodLabel}仅可查看，当前只能编辑本月记录；每月前两天可编辑上月记录`;

  return {
    period: normalizedPeriod,
    period_label: periodLabel,
    is_current_period: isCurrentPeriod,
    is_previous_grace_period: isPreviousGracePeriod,
    is_future_period: isFuturePeriod,
    can_edit_records: canEditRecords,
    can_edit_budget: canEditRecords,
    is_readonly: !canEditRecords,
    readonly_text: canEditRecords ? "" : readonlyText,
  };
}

function assertPeriodEditable(period) {
  const policy = getPeriodEditPolicy(period);
  if (!policy.can_edit_records) {
    throw new Error(policy.readonly_text);
  }
  return policy;
}
function getPeriodLabel(period) {
  const parts = normalizePeriod(period).split("-");
  return `${parts[0]}年${Number(parts[1])}月`;
}

function getLocalTimeString(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTransactionDateTime(occurredAt, createdAt) {
  const dateText = String(occurredAt || "").trim();
  const createdDate = parseDate(createdAt);

  if (!createdDate) {
    return dateText;
  }

  const displayDate = dateText || getLocalDateString(createdDate);
  return `${displayDate} ${getLocalTimeString(createdDate)}`;
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
    selected_view_period: getCurrentPeriod(),
  };
}

function normalizeBudgetState(rawState) {
  const state = rawState && typeof rawState === "object" ? rawState : createInitialBudgetState();
  return {
    budgets: state.budgets && typeof state.budgets === "object" ? state.budgets : {},
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    mutations: Array.isArray(state.mutations) ? state.mutations : [],
    selected_view_period: normalizePeriod(state.selected_view_period),
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

function buildViewPeriodState(period = getCurrentPeriod()) {
  const normalizedPeriod = normalizePeriod(period);
  return {
    period: normalizedPeriod,
    period_label: getPeriodLabel(normalizedPeriod),
    edit_policy: getPeriodEditPolicy(normalizedPeriod),
  };
}

function getSelectedViewPeriod() {
  return readBudgetState().selected_view_period || getCurrentPeriod();
}

function loadSelectedViewPeriod() {
  return Promise.resolve(buildViewPeriodState(getSelectedViewPeriod()));
}

function saveSelectedViewPeriod(period) {
  const state = readBudgetState();
  state.selected_view_period = normalizePeriod(period);
  const nextState = writeBudgetState(state);
  return Promise.resolve(buildViewPeriodState(nextState.selected_view_period));
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
  const occurredAtDisplay = formatTransactionDateTime(transaction.occurred_at, transaction.created_at);

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
    occurred_at_display: occurredAtDisplay,
    created_at: transaction.created_at || "",
    updated_at: transaction.updated_at || "",
    metaText: `${expenseTypeName} · ${occurredAtDisplay || transaction.occurred_at}`,
  };
}

function compareTransactionByRecent(left, right) {
  const occurredCompare = String(right.occurred_at || "").localeCompare(String(left.occurred_at || ""));
  if (occurredCompare !== 0) {
    return occurredCompare;
  }

  const createdCompare = String(right.created_at || "").localeCompare(String(left.created_at || ""));
  if (createdCompare !== 0) {
    return createdCompare;
  }

  return String(right.id || "").localeCompare(String(left.id || ""));
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
    .sort(compareTransactionByRecent)
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
      period_edit_policy: getPeriodEditPolicy(period),
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
      period_edit_policy: getPeriodEditPolicy(period),
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
  const normalizedPeriod = normalizePeriod(period);
  const state = readBudgetState();
  const records = getPeriodTransactions(state, normalizedPeriod)
    .map(normalizeTransaction)
    .filter((item) => item.type === "expense")
    .filter((item) => expenseTypeId === "all" || item.expense_type_id === expenseTypeId)
    .sort(compareTransactionByRecent);

  return Promise.resolve(records);
}

function getExpenseRecord(recordId, period = getCurrentPeriod()) {
  const normalizedPeriod = normalizePeriod(period);
  const state = readBudgetState();
  const record = getPeriodTransactions(state, normalizedPeriod)
    .find((item) => item.id === recordId && item.type === "expense");

  if (!record) {
    return Promise.reject(new Error("未找到要编辑的消费记录"));
  }

  return Promise.resolve(normalizeTransaction(record));
}

function formatPercentText(amountCents, totalCents) {
  if (totalCents <= 0) {
    return "0%";
  }

  const percentBasisPoints = Math.round((amountCents * 10000) / totalCents);
  const whole = Math.floor(percentBasisPoints / 100);
  const fraction = percentBasisPoints % 100;
  return fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, "0")}%`;
}

function formatProgressPercent(amountCents, totalCents) {
  if (totalCents <= 0) {
    return "0";
  }

  const percentBasisPoints = Math.min(Math.round((amountCents * 10000) / totalCents), 10000);
  return (percentBasisPoints / 100).toFixed(2);
}

function getTrendAnchorDate(period) {
  if (period === getCurrentPeriod()) {
    return new Date();
  }

  const parts = period.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) {
    return new Date();
  }

  return new Date(year, month, 0);
}

function addDays(date, offset) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + offset);
  return nextDate;
}

function buildCategoryRanking(records) {
  const grouped = {};

  records.forEach((record) => {
    const id = record.expense_type_id || "uncategorized";
    if (!grouped[id]) {
      grouped[id] = {
        id,
        name: record.expense_type_name || "未分类",
        amount_yuan: "0.00",
        count: 0,
      };
    }

    grouped[id].amount_yuan = addAmountYuan(grouped[id].amount_yuan, record.amount_yuan);
    grouped[id].count += 1;
  });

  const totalAmountYuan = sumExpenseAmountYuan(records);
  const totalCents = parseYuanToCents(totalAmountYuan);
  const ranking = Object.keys(grouped).map((id) => {
    const item = grouped[id];
    const amountCents = parseYuanToCents(item.amount_yuan);
    return {
      id: item.id,
      name: item.name,
      count: item.count,
      countText: `${item.count} 笔`,
      amount_yuan: item.amount_yuan,
      amountDisplay: `${item.amount_yuan} 元`,
      percentText: formatPercentText(amountCents, totalCents),
      progressPercent: formatProgressPercent(amountCents, totalCents),
      amount_cents: amountCents,
    };
  });

  ranking.sort((left, right) => right.amount_cents - left.amount_cents);
  return ranking.map((item) => ({
    id: item.id,
    name: item.name,
    count: item.count,
    countText: item.countText,
    amount_yuan: item.amount_yuan,
    amountDisplay: item.amountDisplay,
    percentText: item.percentText,
    progressPercent: item.progressPercent,
  }));
}

function buildDailyTrend(records, period) {
  const grouped = {};

  records.forEach((record) => {
    const date = record.occurred_at;
    if (!grouped[date]) {
      grouped[date] = {
        amount_yuan: "0.00",
        count: 0,
      };
    }

    grouped[date].amount_yuan = addAmountYuan(grouped[date].amount_yuan, record.amount_yuan);
    grouped[date].count += 1;
  });

  const anchorDate = getTrendAnchorDate(period);
  const trend = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = getLocalDateString(addDays(anchorDate, -offset));
    const bucket = grouped[date] || {
      amount_yuan: "0.00",
      count: 0,
    };
    const amountCents = parseYuanToCents(bucket.amount_yuan);

    trend.push({
      date,
      label: date.slice(5).replace("-", "/"),
      amount_yuan: bucket.amount_yuan,
      amountDisplay: `${bucket.amount_yuan} 元`,
      count: bucket.count,
      countText: `${bucket.count} 笔`,
      amount_cents: amountCents,
    });
  }

  const maxCents = trend.reduce((max, item) => Math.max(max, item.amount_cents), 0);
  return trend.map((item) => ({
    date: item.date,
    label: item.label,
    amount_yuan: item.amount_yuan,
    amountDisplay: item.amountDisplay,
    count: item.count,
    countText: item.countText,
    barPercent: formatProgressPercent(item.amount_cents, maxCents),
  }));
}

function buildAnalyticsInsight(summary, categoryRanking, hasRecords) {
  if (!summary.has_budget) {
    return {
      title: "先建立预算基线",
      text: "设置本月总预算后，分析页会展示预算使用率、剩余额度和分类趋势。",
    };
  }

  if (!hasRecords) {
    return {
      title: "等待第一笔消费",
      text: "记一笔支出后，这里会自动生成分类排行和最近 7 日趋势。",
    };
  }

  if (summary.status === "over_budget") {
    return {
      title: "已超过预算",
      text: "本月支出已经超过总预算，建议先复盘高占比分类，再调整后续支出计划。",
    };
  }

  if (summary.status === "warning") {
    return {
      title: "接近预算上限",
      text: "本月预算使用率已进入预警区间，建议优先控制非必要支出。",
    };
  }

  const highestCategory = categoryRanking[0];
  if (highestCategory) {
    return {
      title: "关注最高支出分类",
      text: `${highestCategory.name} 是本月支出最高分类，占 ${highestCategory.percentText}，可作为后续优化重点。`,
    };
  }

  return {
    title: "预算状态良好",
    text: "当前预算使用率处于正常范围，可以继续保持当前消费节奏。",
  };
}

function buildAnalyticsState(snapshot = {}) {
  const period = snapshot.period || getCurrentPeriod();
  const dashboard = buildDashboardState(snapshot);
  const records = (snapshot.transactions || [])
    .map(normalizeTransaction)
    .filter((item) => item.type === "expense")
    .sort(compareTransactionByRecent);
  const hasRecords = records.length > 0;
  const categoryRanking = buildCategoryRanking(records);
  const dailyTrend = buildDailyTrend(records, period);

  return {
    period,
    period_label: getPeriodLabel(period),
    has_budget: dashboard.summary.has_budget,
    has_records: hasRecords,
    summary: dashboard.summary,
    metrics: [
      {
        id: "total",
        label: "总预算",
        value: dashboard.summary.totalDisplay,
      },
      {
        id: "used",
        label: "本月支出",
        value: dashboard.summary.usedDisplay,
      },
      {
        id: "remaining",
        label: dashboard.summary.remainingTitle,
        value: dashboard.summary.remainingDisplay,
      },
      {
        id: "count",
        label: "消费笔数",
        value: `${records.length} 笔`,
      },
    ],
    categoryRanking,
    dailyTrend,
    insight: buildAnalyticsInsight(dashboard.summary, categoryRanking, hasRecords),
  };
}

function loadAnalytics(period = getCurrentPeriod()) {
  const state = readBudgetState();
  return Promise.resolve(buildAnalyticsState(getBudgetSnapshot(state, normalizePeriod(period))));
}

function loadDashboard(period = getCurrentPeriod()) {
  const state = readBudgetState();
  return Promise.resolve(buildDashboardState(getBudgetSnapshot(state, normalizePeriod(period))));
}

function saveBudgetAmount(amountYuan, period = getCurrentPeriod()) {
  const normalizedPeriod = normalizePeriod(period);
  assertPeriodEditable(normalizedPeriod);
  const budgetAmount = normalizeBudgetAmountUpdate(amountYuan);
  const state = readBudgetState();
  const existingBudget = state.budgets[normalizedPeriod] || {};
  const now = new Date().toISOString();

  state.budgets[normalizedPeriod] = {
    id: existingBudget.id || createId("budget"),
    scope: "personal",
    period: normalizedPeriod,
    total_amount_yuan: budgetAmount.total_amount_yuan,
    created_at: existingBudget.created_at || now,
    updated_at: now,
  };

  const nextState = writeBudgetState(state);
  return Promise.resolve(buildDashboardState(getBudgetSnapshot(nextState, normalizedPeriod)));
}

function saveExpenseRecord(expenseDraft, period = getCurrentPeriod()) {
  const normalizedPeriod = normalizePeriod(period);
  assertPeriodEditable(normalizedPeriod);
  const state = readBudgetState();
  const budget = state.budgets[normalizedPeriod];

  if (!budget || !budget.total_amount_yuan) {
    throw new Error("请到我的页面设置本月总预算");
  }

  const amountYuan = normalizeAmountYuan(expenseDraft.amount_yuan);
  const dashboardBefore = buildDashboardState(getBudgetSnapshot(state, normalizedPeriod));
  const overBudgetAmountYuan = calculateOverBudgetAmount(dashboardBefore.summary.remaining_amount_yuan, amountYuan);

  if (compareAmountYuan(overBudgetAmountYuan, "0.00") > 0) {
    throw new Error(`本次消费将超出预算 ${overBudgetAmountYuan} 元，请到我的页面调整总预算`);
  }

  const now = new Date().toISOString();
  const record = {
    id: createId("expense"),
    period: normalizedPeriod,
    type: "expense",
    title: expenseDraft.remark || expenseDraft.expense_type_name || "消费",
    expense_type_id: expenseDraft.expense_type_id,
    expense_type_name: expenseDraft.expense_type_name,
    amount_yuan: amountYuan,
    remark: expenseDraft.remark || "",
    occurred_at: expenseDraft.occurred_at || getDefaultOccurredDateForPeriod(normalizedPeriod),
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
    dashboard: buildDashboardState(getBudgetSnapshot(nextState, normalizedPeriod)),
  });
}

function removeExpenseRecord(recordId, period = getCurrentPeriod()) {
  const normalizedPeriod = normalizePeriod(period);
  assertPeriodEditable(normalizedPeriod);

  const state = readBudgetState();
  const recordIndex = state.transactions.findIndex((item) => (
    item.id === recordId
    && item.period === normalizedPeriod
    && item.type === "expense"
  ));

  if (recordIndex < 0) {
    throw new Error("未找到要移除的消费记录");
  }

  const budget = state.budgets[normalizedPeriod];
  const record = state.transactions[recordIndex];
  const amountYuan = normalizeAmountYuan(record.amount_yuan);
  const dashboardBefore = buildDashboardState(getBudgetSnapshot(state, normalizedPeriod));
  const afterUsedAmountYuan = subtractAmountYuan(dashboardBefore.summary.used_amount_yuan, amountYuan);
  const now = new Date().toISOString();

  state.transactions.splice(recordIndex, 1);
  state.mutations.push({
    id: createId("mutation"),
    budget_period_id: budget ? budget.id : "",
    expense_record_id: record.id,
    mutation_type: "expense_removed",
    amount_yuan: amountYuan,
    returned_amount_yuan: amountYuan,
    before_used_amount_yuan: dashboardBefore.summary.used_amount_yuan,
    after_used_amount_yuan: afterUsedAmountYuan,
    created_at: now,
  });

  const nextState = writeBudgetState(state);

  return Promise.resolve({
    success: true,
    data: normalizeTransaction(record),
    dashboard: buildDashboardState(getBudgetSnapshot(nextState, normalizedPeriod)),
  });
}

function updateExpenseRecord(recordId, expenseDraft, period = getCurrentPeriod()) {
  const normalizedPeriod = normalizePeriod(period);
  assertPeriodEditable(normalizedPeriod);

  const state = readBudgetState();
  const recordIndex = state.transactions.findIndex((item) => (
    item.id === recordId
    && item.period === normalizedPeriod
    && item.type === "expense"
  ));

  if (recordIndex < 0) {
    throw new Error("未找到要编辑的消费记录");
  }

  const budget = state.budgets[normalizedPeriod];
  if (!budget || !budget.total_amount_yuan) {
    throw new Error("请到我的页面设置本月总预算");
  }

  const record = state.transactions[recordIndex];
  const beforeAmountYuan = normalizeAmountYuan(record.amount_yuan);
  const nextAmountYuan = normalizeAmountYuan(expenseDraft.amount_yuan);
  const nextExpenseTypeId = String(expenseDraft.expense_type_id || "").trim();
  const nextExpenseTypeName = String(expenseDraft.expense_type_name || "").trim();
  const nextRemark = String(expenseDraft.remark || "").trim();

  if (!nextExpenseTypeId || !nextExpenseTypeName) {
    throw new Error("请选择有效的消费类型");
  }

  if (nextRemark.length > 80) {
    throw new Error("备注最多填写 80 个字");
  }

  const dashboardBefore = buildDashboardState(getBudgetSnapshot(state, normalizedPeriod));
  const usedWithoutRecordAmountYuan = subtractAmountYuan(dashboardBefore.summary.used_amount_yuan, beforeAmountYuan);
  const afterUsedAmountYuan = addAmountYuan(usedWithoutRecordAmountYuan, nextAmountYuan);
  const totalAmountYuan = normalizeAmountYuan(budget.total_amount_yuan);
  const overBudgetAmountYuan = compareAmountYuan(afterUsedAmountYuan, totalAmountYuan) > 0
    ? subtractAmountYuan(afterUsedAmountYuan, totalAmountYuan)
    : "0.00";

  if (compareAmountYuan(overBudgetAmountYuan, "0.00") > 0) {
    throw new Error("调整后将超出预算 " + overBudgetAmountYuan + " 元，请到我的页面调整总预算");
  }

  const now = new Date().toISOString();
  const updatedRecord = {
    ...record,
    title: nextRemark || nextExpenseTypeName || "消费",
    expense_type_id: nextExpenseTypeId,
    expense_type_name: nextExpenseTypeName,
    amount_yuan: nextAmountYuan,
    remark: nextRemark,
    updated_at: now,
  };

  state.transactions[recordIndex] = updatedRecord;
  state.mutations.push({
    id: createId("mutation"),
    budget_period_id: budget.id,
    expense_record_id: updatedRecord.id,
    mutation_type: "expense_updated",
    before_amount_yuan: beforeAmountYuan,
    after_amount_yuan: nextAmountYuan,
    before_expense_type_id: record.expense_type_id || "",
    after_expense_type_id: nextExpenseTypeId,
    before_remark: record.remark || "",
    after_remark: nextRemark,
    before_used_amount_yuan: dashboardBefore.summary.used_amount_yuan,
    after_used_amount_yuan: afterUsedAmountYuan,
    over_budget_amount_yuan: "0.00",
    created_at: now,
  });

  const nextState = writeBudgetState(state);

  return Promise.resolve({
    success: true,
    data: normalizeTransaction(updatedRecord),
    dashboard: buildDashboardState(getBudgetSnapshot(nextState, normalizedPeriod)),
  });
}

module.exports = {
  buildDashboardState,
  createEmptyDashboardState,
  getCurrentPeriod,
  getExpenseRecord,
  getExpenseRecords,
  getLastDateOfPeriod,
  getPeriodEditPolicy,
  getPeriodLabel,
  getSelectedViewPeriod,
  loadAnalytics,
  loadDashboard,
  loadSelectedViewPeriod,
  normalizeBudgetAmountUpdate,
  readBudgetState,
  removeExpenseRecord,
  saveBudgetAmount,
  updateExpenseRecord,
  saveExpenseRecord,
  saveSelectedViewPeriod,
};
