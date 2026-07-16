const {
  createEmptyDashboardState,
  loadDashboard,
} = require("../../services/budgetService");

Page({
  data: {
    status: "loading",
    summary: createEmptyDashboardState().summary,
    transactions: [],
    errorMessage: "",
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

  onViewProfile() {
    this.setData({
      showSideMenu: false,
    });
    wx.navigateTo({
      url: "/pages/profile/index",
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
