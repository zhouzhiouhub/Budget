const { getCurrentPeriod, loadAnalytics } = require("../../services/budgetService");

Page({
  data: {
    status: "loading",
    period: getCurrentPeriod(),
    periodLabel: getCurrentPeriod(),
    analytics: null,
    errorMessage: "",
  },

  onShow() {
    this.refreshAnalytics();
  },

  onPullDownRefresh() {
    this.refreshAnalytics().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshAnalytics() {
    this.setData({
      status: "loading",
      errorMessage: "",
    });

    return loadAnalytics(this.data.period)
      .then((analytics) => {
        this.setData({
          status: analytics.has_budget || analytics.has_records ? "success" : "empty",
          analytics,
          periodLabel: analytics.period_label,
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "分析数据加载失败",
        });
      });
  },
});