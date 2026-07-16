const {
  createEmptyDashboardState,
  loadDashboard,
  normalizeBudgetAmountUpdate,
  saveBudgetAmount,
} = require("../../services/budgetService");

Page({
  data: {
    status: "loading",
    summary: createEmptyDashboardState().summary,
    errorMessage: "",
    budgetAmountInput: "",
    budgetEditorError: "",
    budgetEditorStatus: "idle",
  },

  onShow() {
    this.refreshProfile();
  },

  onPullDownRefresh() {
    this.refreshProfile().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshProfile() {
    this.setData({
      status: "loading",
      errorMessage: "",
    });

    return loadDashboard()
      .then((dashboard) => {
        this.setData({
          status: "success",
          summary: dashboard.summary,
          budgetAmountInput: dashboard.summary.has_budget ? dashboard.summary.total_amount_yuan : "",
          budgetEditorError: "",
          budgetEditorStatus: "idle",
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "我的页面加载失败",
        });
      });
  },

  onBudgetAmountInput(event) {
    this.setData({
      budgetAmountInput: event.detail.value,
      budgetEditorError: "",
    });
  },

  onSaveBudgetAmount() {
    this.setData({
      budgetEditorStatus: "saving",
      budgetEditorError: "",
    });

    try {
      normalizeBudgetAmountUpdate(this.data.budgetAmountInput);
    } catch (error) {
      this.setData({
        budgetEditorStatus: "error",
        budgetEditorError: error.message || "请输入有效金额",
      });
      return;
    }

    saveBudgetAmount(this.data.budgetAmountInput, this.data.summary.period)
      .then((dashboard) => {
        this.setData({
          status: "success",
          summary: dashboard.summary,
          budgetAmountInput: dashboard.summary.total_amount_yuan,
          budgetEditorStatus: "idle",
          budgetEditorError: "",
        });

        wx.showToast({
          title: "预算已更新",
          icon: "success",
        });
      })
      .catch((error) => {
        this.setData({
          budgetEditorStatus: "error",
          budgetEditorError: error.message || "预算保存失败",
        });
      });
  },
});
