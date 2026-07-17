const { hideNativeHomeButton } = require("../../utils/navigation");
const {
  getCurrentPeriod,
  loadAnalytics,
  loadSelectedViewPeriod,
} = require("../../services/budgetService");

Page({
  data: {
    status: "loading",
    period: getCurrentPeriod(),
    periodLabel: getCurrentPeriod(),
    periodEditPolicy: {},
    analytics: null,
    errorMessage: "",
    showSideMenu: false,
  },

  onShow() {
    hideNativeHomeButton();
    this.refreshAnalytics();
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

  onPullDownRefresh() {
    this.refreshAnalytics().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshAnalytics() {
    this.setData({
      status: "loading",
      errorMessage: "",
    showSideMenu: false,
    });

    return loadSelectedViewPeriod()
      .then((viewPeriod) => loadAnalytics(viewPeriod.period).then((analytics) => ({ viewPeriod, analytics })))
      .then(({ viewPeriod, analytics }) => {
        this.setData({
          status: analytics.has_budget || analytics.has_records ? "success" : "empty",
          period: viewPeriod.period,
          periodLabel: analytics.period_label,
          periodEditPolicy: viewPeriod.edit_policy,
          analytics,
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
