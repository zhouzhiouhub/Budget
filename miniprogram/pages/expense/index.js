const {
  createExpenseFormState,
  createExpenseRecordDraft,
  selectExpenseType,
} = require("../../services/expenseFormService");
const {
  loadSelectedViewPeriod,
  saveExpenseRecord,
} = require("../../services/budgetService");

function createPageState() {
  return {
    ...createExpenseFormState(),
    period: "",
    periodLabel: "新增流水",
    periodEditPolicy: {
      is_readonly: false,
      readonly_text: "",
    },
  };
}

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
  data: createPageState(),

  onLoad() {
    this.setData(createPageState());
  },

  onShow() {
    this.refreshViewPeriod();
  },

  refreshViewPeriod() {
    return loadSelectedViewPeriod()
      .then((viewPeriod) => {
        this.setData({
          period: viewPeriod.period,
          periodLabel: viewPeriod.period_label,
          periodEditPolicy: viewPeriod.edit_policy,
          errorMessage: viewPeriod.edit_policy.is_readonly ? "" : this.data.errorMessage,
        });
      })
      .catch((error) => {
        this.setData({
          errorMessage: error.message || "月份状态加载失败",
        });
      });
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
    const editPolicy = this.data.periodEditPolicy || {};
    if (editPolicy.is_readonly) {
      this.setData({
        status: "error",
        errorMessage: editPolicy.readonly_text || "当前月份只能查看",
      });
      return;
    }

    this.setData({
      status: "submitting",
      errorMessage: "",
      successMessage: "",
    });

    createExpenseRecordDraft(this.data, this.data.expenseTypes, this.data.period)
      .then((result) => saveExpenseRecord(result.data, this.data.period))
      .then(() => {
        this.setData({
          status: "success",
          successMessage: "消费已保存",
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
          errorMessage: error.message || "消费保存失败",
        });
      });
  },
});
