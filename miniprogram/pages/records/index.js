const {
  getCurrentPeriod,
  getExpenseRecords,
  loadSelectedViewPeriod,
} = require("../../services/budgetService");
const { addAmountYuan } = require("../../utils/money");
const { EXPENSE_TYPES } = require("../../services/expenseFormService");

const ALL_FILTER = {
  id: "all",
  name: "全部",
};

function buildTotalAmountDisplay(records) {
  return `${addAmountYuan(...records.map((item) => item.amount_yuan))} 元`;
}

Page({
  data: {
    status: "loading",
    period: getCurrentPeriod(),
    periodLabel: getCurrentPeriod(),
    periodEditPolicy: {},
    filters: [ALL_FILTER].concat(EXPENSE_TYPES.map((item) => ({ id: item.id, name: item.name }))),
    selectedTypeId: "all",
    records: [],
    totalAmountDisplay: "0.00 元",
    errorMessage: "",
  },

  onShow() {
    this.loadRecords();
  },

  onSelectType(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({
      selectedTypeId: id,
    });
    this.loadRecords(id);
  },

  loadRecords(typeId = this.data.selectedTypeId) {
    this.setData({
      status: "loading",
      errorMessage: "",
      records: [],
      totalAmountDisplay: "0.00 元",
    });

    return loadSelectedViewPeriod()
      .then((viewPeriod) => getExpenseRecords(viewPeriod.period, typeId).then((records) => ({ viewPeriod, records })))
      .then(({ viewPeriod, records }) => {
        this.setData({
          status: records.length ? "success" : "empty",
          period: viewPeriod.period,
          periodLabel: viewPeriod.period_label,
          periodEditPolicy: viewPeriod.edit_policy,
          records,
          totalAmountDisplay: buildTotalAmountDisplay(records),
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "消费加载失败",
        });
      });
  },
});
