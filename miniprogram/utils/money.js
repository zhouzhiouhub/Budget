const AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
const SIGNED_AMOUNT_PATTERN = /^-?(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

function ensureSafeCents(cents) {
  if (!Number.isSafeInteger(cents)) {
    throw new Error("金额超出安全范围");
  }
}

function parseUnsignedYuanToCents(value, pattern, errorMessage) {
  if (value === null || value === undefined) {
    throw new Error("金额不能为空");
  }

  const raw = String(value).trim();
  if (!pattern.test(raw)) {
    throw new Error(errorMessage);
  }

  const sign = raw.startsWith("-") ? -1 : 1;
  const unsignedRaw = sign === -1 ? raw.slice(1) : raw;
  const parts = unsignedRaw.split(".");
  const yuan = Number(parts[0]);
  const fraction = (parts[1] || "").padEnd(2, "0");
  const cents = sign * (yuan * 100 + Number(fraction));
  ensureSafeCents(cents);
  return cents;
}

function parseYuanToCents(value) {
  return parseUnsignedYuanToCents(value, AMOUNT_PATTERN, "金额必须是最多两位小数的元金额");
}

function parseSignedYuanToCents(value) {
  return parseUnsignedYuanToCents(value, SIGNED_AMOUNT_PATTERN, "金额必须是最多两位小数的元金额");
}

function formatCentsToYuan(cents) {
  ensureSafeCents(cents);

  const sign = cents < 0 ? "-" : "";
  const absoluteCents = Math.abs(cents);
  const yuan = Math.floor(absoluteCents / 100);
  const fraction = String(absoluteCents % 100).padStart(2, "0");
  return `${sign}${yuan}.${fraction}`;
}

function normalizeAmountYuan(value) {
  return formatCentsToYuan(parseYuanToCents(value));
}

function addAmountYuan(...amounts) {
  const cents = amounts.reduce((total, amount) => total + parseYuanToCents(amount), 0);
  ensureSafeCents(cents);
  return formatCentsToYuan(cents);
}

function subtractAmountYuan(leftAmount, rightAmount) {
  const cents = parseYuanToCents(leftAmount) - parseYuanToCents(rightAmount);
  ensureSafeCents(cents);
  return formatCentsToYuan(cents);
}

function compareAmountYuan(leftAmount, rightAmount) {
  return parseSignedYuanToCents(leftAmount) - parseSignedYuanToCents(rightAmount);
}

function absoluteAmountYuan(amount) {
  return formatCentsToYuan(Math.abs(parseSignedYuanToCents(amount)));
}

function formatRate(percentBasisPoints) {
  const whole = Math.floor(percentBasisPoints / 100);
  const fraction = percentBasisPoints % 100;
  return fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, "0")}%`;
}

function calculateBudgetUsage(usedAmountYuan, totalAmountYuan) {
  const usedCents = parseYuanToCents(usedAmountYuan);
  const totalCents = parseYuanToCents(totalAmountYuan);

  if (totalCents === 0) {
    return {
      status: usedCents > 0 ? "over_budget" : "zero_budget",
      statusText: usedCents > 0 ? "超预算" : "未设置",
      usedRateText: "0%",
      progressPercent: "0",
    };
  }

  const percentBasisPoints = Math.round((usedCents * 10000) / totalCents);
  const cappedBasisPoints = Math.min(percentBasisPoints, 10000);
  const status = usedCents > totalCents
    ? "over_budget"
    : usedCents * 100 >= totalCents * 80
      ? "warning"
      : "normal";

  return {
    status,
    statusText: status === "over_budget" ? "超预算" : status === "warning" ? "预警" : "正常",
    usedRateText: formatRate(percentBasisPoints),
    progressPercent: (cappedBasisPoints / 100).toFixed(2),
  };
}

module.exports = {
  absoluteAmountYuan,
  addAmountYuan,
  calculateBudgetUsage,
  compareAmountYuan,
  formatCentsToYuan,
  normalizeAmountYuan,
  parseYuanToCents,
  subtractAmountYuan,
};
