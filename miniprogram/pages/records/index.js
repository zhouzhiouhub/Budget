const { hideNativeHomeButton } = require("../../utils/navigation");
const {
  getCurrentPeriod,
  getExpenseRecords,
  loadSelectedViewPeriod,
  removeExpenseRecord,
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
    deletingRecordId: "",
    errorMessage: "",
    showSideMenu: false,
  },

  onShow() {
    hideNativeHomeButton();
    this.loadRecords();
  },
  onOpenSideMenu() {
    this.setData({
      showSideMenu: true,
    });
  },

  onCloseSideMenu() {
    this.setData({
      showSideMenu: false,
    });
  },

  onSelectType(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({
      selectedTypeId: id,
    });
    this.loadRecords(id);
  },

  onLongPressRecord(event) {
    const recordId = event.currentTarget.dataset.id;
    const editPolicy = this.data.periodEditPolicy || {};
    const record = this.data.records.find((item) => item.id === recordId);

    if (!record) {
      return;
    }

    if (editPolicy.is_readonly) {
      wx.showToast({
        title: editPolicy.readonly_text || "当前月份只能查看",
        icon: "none",
      });
      return;
    }

    wx.showActionSheet({
      itemList: ["重新编辑", "移除订单"],
      success: (result) => {
        if (result.tapIndex === 0) {
          this.editRecord(recordId);
          return;
        }

        if (result.tapIndex === 1) {
          this.confirmRemoveRecord(recordId, record);
        }
      },
    });
  },

  editRecord(recordId) {
    wx.navigateTo({
      url: "/pages/expense/index?mode=edit&recordId=" + encodeURIComponent(recordId) + "&period=" + encodeURIComponent(this.data.period),
    });
  },

  confirmRemoveRecord(recordId, record) {
    wx.showModal({
      title: "移除订单",
      content: "移除后该笔花费不再记录，" + record.amount_yuan + " 元会返回预算。",
      confirmText: "移除",
      confirmColor: "#be123c",
      success: (result) => {
        if (result.confirm) {
          this.removeRecord(recordId);
        }
      },
    });
  },

  removeRecord(recordId) {
    this.setData({
      deletingRecordId: recordId,
      errorMessage: "",
    showSideMenu: false,
    });

    return Promise.resolve()
      .then(() => removeExpenseRecord(recordId, this.data.period))
      .then(() => {
        wx.showToast({
          title: "已移除",
          icon: "success",
        });
        return this.loadRecords();
      })
      .catch((error) => {
        const message = error.message || "订单移除失败";
        this.setData({
          errorMessage: message,
        });
        wx.showToast({
          title: message,
          icon: "none",
        });
      })
      .finally(() => {
        this.setData({
          deletingRecordId: "",
        });
      });
  },

  loadRecords(typeId = this.data.selectedTypeId) {
    this.setData({
      status: "loading",
      errorMessage: "",
    showSideMenu: false,
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