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
    transactions: [],
    errorMessage: "",
    showBudgetEditor: false,
    budgetAmountInput: "",
    budgetEditorError: "",
    budgetEditorStatus: "idle",
    showSideMenu: false,
  },

  onShow() {
    this.refreshDashboard();
  },

  onPullDownRefresh() {
    this.refreshDashboard().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshDashboard() {
    this.setData({
      status: "loading",
      errorMessage: "",
    });

    return loadDashboard()
      .then((dashboard) => {
        this.setData({
          status: dashboard.summary.has_budget ? "success" : "empty",
          summary: dashboard.summary,
          transactions: dashboard.transactions,
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "预算数据加载失败",
        });
      });
  },

  onCreateBudget() {
    this.setData({
      showBudgetEditor: true,
      budgetAmountInput: this.data.summary.has_budget ? this.data.summary.total_amount_yuan : "",
      budgetEditorError: "",
      budgetEditorStatus: "idle",
    });
  },

  onBudgetAmountInput(event) {
    this.setData({
      budgetAmountInput: event.detail.value,
      budgetEditorError: "",
    });
  },

  onCancelBudgetEdit() {
    this.setData({
      showBudgetEditor: false,
      budgetEditorError: "",
      budgetEditorStatus: "idle",
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
          transactions: dashboard.transactions,
          showBudgetEditor: false,
          budgetAmountInput: "",
          budgetEditorStatus: "idle",
        });

        wx.showToast({
          title: "已更新总预算",
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

  onViewRecords() {
    this.setData({
      showSideMenu: false,
    });
    wx.navigateTo({
      url: "/pages/records/index",
    });
  },

  onAddExpense() {
    this.setData({
      showSideMenu: false,
    });
    wx.navigateTo({
      url: "/pages/expense/index",
    });
  },

  onViewAnalytics() {
    this.setData({
      showSideMenu: false,
    });
    wx.navigateTo({
      url: "/pages/analysis/index",
    });
  },

  onTodoMenuItem(event) {
    const title = event.currentTarget.dataset.title || "该功能";
    wx.showToast({
      title: `${title}开发中`,
      icon: "none",
    });
  },
});