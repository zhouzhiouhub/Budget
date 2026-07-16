const {
  createExpenseFormState,
  createExpenseRecordDraft,
  selectExpenseType,
} = require("../../services/expenseFormService");
const { saveExpenseRecord } = require("../../services/budgetService");

function returnToHome() {
  const pages = getCurrentPages();

  if (pages.length > 1) {
    wx.navigateBack({
      delta: 1,
    });
    return;
  }

  wx.redirectTo({
    url: "/pages/index/index",
  });
}

Page({
  data: createExpenseFormState(),

  onLoad() {
    this.setData(createExpenseFormState());
  },

  onSelectType(event) {
    const { id } = event.currentTarget.dataset;

    try {
      this.setData(selectExpenseType(id, this.data.expenseTypes));
    } catch (error) {
      this.setData({
        errorMessage: error.message || "请选择有效的消费类型",
      });
    }
  },

  onAmountInput(event) {
    this.setData({
      amount_yuan: event.detail.value,
      errorMessage: "",
      successMessage: "",
    });
  },

  onRemarkInput(event) {
    this.setData({
      remark: event.detail.value,
      errorMessage: "",
      successMessage: "",
    });
  },

  onSubmit() {
    this.setData({
      status: "submitting",
      errorMessage: "",
      successMessage: "",
    });

    createExpenseRecordDraft(this.data, this.data.expenseTypes)
      .then((result) => saveExpenseRecord(result.data))
      .then(() => {
        this.setData({
          status: "success",
          successMessage: "消费记录已保存",
        });
        wx.showToast({
          title: "已保存",
          icon: "success",
          duration: 600,
        });
        setTimeout(returnToHome, 650);
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "消费记录保存失败",
        });
      });
  },
});