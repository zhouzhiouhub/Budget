const {
  createEmptyDashboardState,
  loadDashboard,
} = require("../../services/budgetService");

Page({
  data: {
    status: "loading",
    summary: createEmptyDashboardState().summary,
    categories: [],
    transactions: [],
    errorMessage: "",
  },

  onLoad() {
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
          status: dashboard.categories.length ? "success" : "empty",
          summary: dashboard.summary,
          categories: dashboard.categories,
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
    wx.showToast({
      title: "预算创建待接入",
      icon: "none",
    });
  },

  onAddExpense() {
    wx.navigateTo({
      url: "/pages/expense/index",
    });
  },
});
