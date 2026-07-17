const {
  createEmptyDashboardState,
  loadDashboard,
  loadSelectedViewPeriod,
  removeExpenseRecord,
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
    deletingRecordId: "",
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

  onLongPressTransaction(event) {
    const recordId = event.currentTarget.dataset.id;
    const editPolicy = this.data.periodEditPolicy || {};
    const record = this.data.transactions.find((item) => item.id === recordId);

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
          this.editTransaction(recordId);
          return;
        }

        if (result.tapIndex === 1) {
          this.confirmRemoveTransaction(recordId, record);
        }
      },
    });
  },

  editTransaction(recordId) {
    wx.navigateTo({
      url: "/pages/expense/index?mode=edit&recordId=" + encodeURIComponent(recordId) + "&period=" + encodeURIComponent(this.data.viewPeriod),
    });
  },

  confirmRemoveTransaction(recordId, record) {
    wx.showModal({
      title: "移除订单",
      content: "移除后该笔花费不再记录，" + record.amount_yuan + " 元会返回预算。",
      confirmText: "移除",
      confirmColor: "#be123c",
      success: (result) => {
        if (result.confirm) {
          this.removeTransaction(recordId);
        }
      },
    });
  },

  removeTransaction(recordId) {
    this.setData({
      deletingRecordId: recordId,
      errorMessage: "",
    });

    return Promise.resolve()
      .then(() => removeExpenseRecord(recordId, this.data.viewPeriod))
      .then(() => {
        wx.showToast({
          title: "已移除",
          icon: "success",
        });
        return this.refreshDashboard();
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || "订单移除失败",
          icon: "none",
        });
      })
      .finally(() => {
        this.setData({
          deletingRecordId: "",
        });
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