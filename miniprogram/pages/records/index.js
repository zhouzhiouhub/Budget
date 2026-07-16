const { getCurrentPeriod, getExpenseRecords } = require("../../services/budgetService");
const { EXPENSE_TYPES } = require("../../services/expenseFormService");

const ALL_FILTER = {
  id: "all",
  name: "全部",
};

Page({
  data: {
    status: "loading",
    period: getCurrentPeriod(),
    filters: [ALL_FILTER].concat(EXPENSE_TYPES.map((item) => ({ id: item.id, name: item.name }))),
    selectedTypeId: "all",
    records: [],
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
    });

    return getExpenseRecords(this.data.period, typeId)
      .then((records) => {
        this.setData({
          status: records.length ? "success" : "empty",
          records,
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "消费记录加载失败",
        });
      });
  },
});