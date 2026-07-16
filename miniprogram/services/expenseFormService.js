const { normalizeAmountYuan } = require("../utils/money");

const EXPENSE_TYPES = [
  {
    id: "food",
    name: "餐饮",
    description: "正餐、饮品、外卖",
  },
  {
    id: "transport",
    name: "交通",
    description: "公交、地铁、打车",
  },
  {
    id: "office",
    name: "办公",
    description: "资料、软件、办公用品",
  },
  {
    id: "entertainment",
    name: "娱乐",
    description: "电影、游戏、聚会",
  },
];

function createExpenseFormState() {
  return {
    expenseTypes: EXPENSE_TYPES,
    selectedTypeId: "",
    selectedTypeName: "",
    amount_yuan: "",
    remark: "",
    canWriteRemark: false,
    status: "idle",
    errorMessage: "",
    successMessage: "",
  };
}

function findExpenseType(typeId, expenseTypes = EXPENSE_TYPES) {
  return expenseTypes.find((item) => item.id === typeId) || null;
}

function selectExpenseType(typeId, expenseTypes = EXPENSE_TYPES) {
  const selectedType = findExpenseType(typeId, expenseTypes);
  if (!selectedType) {
    throw new Error("请选择有效的消费类型");
  }

  return {
    selectedTypeId: selectedType.id,
    selectedTypeName: selectedType.name,
    canWriteRemark: true,
    errorMessage: "",
  };
}

function normalizeRemark(remark) {
  const normalizedRemark = String(remark || "").trim();
  if (normalizedRemark.length > 80) {
    throw new Error("备注最多填写 80 个字");
  }
  return normalizedRemark;
}

function buildExpenseDraft(formData, expenseTypes = EXPENSE_TYPES) {
  const selectedType = findExpenseType(formData.selectedTypeId, expenseTypes);
  if (!selectedType) {
    throw new Error("请先选择消费类型");
  }

  const amountYuan = normalizeAmountYuan(formData.amount_yuan);
  const remark = normalizeRemark(formData.remark);

  return {
    type: "expense",
    category_id: selectedType.id,
    category_name: selectedType.name,
    amount_yuan: amountYuan,
    remark,
  };
}

function createExpenseRecordDraft(formData, expenseTypes = EXPENSE_TYPES) {
  const draft = buildExpenseDraft(formData, expenseTypes);
  return Promise.resolve({
    success: true,
    data: {
      ...draft,
      occurred_at: new Date().toISOString(),
    },
  });
}

module.exports = {
  EXPENSE_TYPES,
  buildExpenseDraft,
  createExpenseFormState,
  createExpenseRecordDraft,
  normalizeRemark,
  selectExpenseType,
};