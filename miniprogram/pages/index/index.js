const {
  createEmptyDashboardState,
  loadDashboard,
  loadSelectedViewPeriod,
} = require("../../services/budgetService");

const initialSummary = createEmptyDashboardState().summary;

Page({
  data: {
    status: "loading",
    summary: initialSummary,
    transactions: [],
    errorMessage: "",
    showSideMenu: false,
    viewPeriod: initialSummary.period,
    periodEditPolicy: initialSummary.period_edit_policy,
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

    return loadSelectedViewPeriod()
      .then((viewPeriod) => loadDashboard(viewPeriod.period).then((dashboard) => ({ viewPeriod, dashboard })))
      .then(({ viewPeriod, dashboard }) => {
        this.setData({
          status: dashboard.summary.has_budget ? "success" : "empty",
          summary: dashboard.summary,
          transactions: dashboard.transactions,
          viewPeriod: viewPeriod.period,
          periodEditPolicy: dashboard.summary.period_edit_policy || viewPeriod.edit_policy,
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
    const editPolicy = this.data.periodEditPolicy || {};
    this.setData({
      showSideMenu: false,
    });

    if (editPolicy.is_readonly) {
      wx.showToast({
        title: editPolicy.readonly_text || "当前月份只能查看",
        icon: "none",
      });
      return;
    }

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
