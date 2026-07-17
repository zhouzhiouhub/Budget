const {
  createEmptyDashboardState,
  getCurrentPeriod,
  loadDashboard,
  loadSelectedViewPeriod,
  normalizeBudgetAmountUpdate,
  saveBudgetAmount,
  saveSelectedViewPeriod,
} = require("../../services/budgetService");
const {
  createDefaultUserProfile,
  loadUserProfile,
  normalizeNickname,
  saveUserProfile,
} = require("../../services/userProfileService");

Page({
  data: {
    status: "loading",
    summary: createEmptyDashboardState().summary,
    userProfile: createDefaultUserProfile(),
    errorMessage: "",
    selectedBudgetPeriod: getCurrentPeriod(),
    budgetAmountInput: "",
    budgetEditorError: "",
    budgetEditorStatus: "idle",
    avatarEditorStatus: "idle",
    showNicknameEditor: false,
    nicknameEditorInput: "",
    nicknameEditorError: "",
    nicknameEditorStatus: "idle",
    showSideMenu: false,
  },

  onShow() {
    this.refreshProfile();
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
    this.refreshProfile().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  refreshProfile() {
    this.setData({
      status: "loading",
      errorMessage: "",
    });

    return Promise.all([loadSelectedViewPeriod(), loadUserProfile()])
      .then(([viewPeriod, userProfile]) => loadDashboard(viewPeriod.period).then((dashboard) => ({ dashboard, userProfile })))
      .then(({ dashboard, userProfile }) => {
        this.setData({
          status: "success",
          summary: dashboard.summary,
          selectedBudgetPeriod: dashboard.summary.period,
          userProfile,
          budgetAmountInput: dashboard.summary.has_budget ? dashboard.summary.total_amount_yuan : "",
          budgetEditorError: "",
          budgetEditorStatus: "idle",
          avatarEditorStatus: "idle",
          showNicknameEditor: false,
          nicknameEditorInput: userProfile.nickname,
          nicknameEditorError: "",
          nicknameEditorStatus: "idle",
    showSideMenu: false,
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "我的页面加载失败",
        });
      });
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;

    if (!avatarUrl) {
      return;
    }

    const previousProfile = this.data.userProfile;

    this.setData({
      avatarEditorStatus: "saving",
      userProfile: {
        ...previousProfile,
        avatar_url: avatarUrl,
      },
    });

    saveUserProfile({
      nickname: previousProfile.nickname,
      avatar_url: avatarUrl,
    })
      .then((userProfile) => {
        this.setData({
          userProfile,
          avatarEditorStatus: "idle",
        });

        wx.showToast({
          title: "头像已更新",
          icon: "success",
        });
      })
      .catch((error) => {
        this.setData({
          userProfile: previousProfile,
          avatarEditorStatus: "error",
        });

        wx.showToast({
          title: error.message || "头像保存失败",
          icon: "none",
        });
      });
  },

  onOpenNicknameEditor() {
    this.setData({
      showNicknameEditor: true,
      nicknameEditorInput: this.data.userProfile.nickname,
      nicknameEditorError: "",
      nicknameEditorStatus: "idle",
    showSideMenu: false,
    });
  },

  onCancelNicknameEdit() {
    this.setData({
      showNicknameEditor: false,
      nicknameEditorError: "",
      nicknameEditorStatus: "idle",
    showSideMenu: false,
    });
  },

  onNicknameInput(event) {
    this.setData({
      nicknameEditorInput: event.detail.value,
      nicknameEditorError: "",
    });
  },

  onSaveNickname() {
    this.setData({
      nicknameEditorStatus: "saving",
      nicknameEditorError: "",
    });

    try {
      normalizeNickname(this.data.nicknameEditorInput);
    } catch (error) {
      this.setData({
        nicknameEditorStatus: "error",
        nicknameEditorError: error.message || "请输入有效昵称",
      });
      return;
    }

    saveUserProfile({
      nickname: this.data.nicknameEditorInput,
      avatar_url: this.data.userProfile.avatar_url,
    })
      .then((userProfile) => {
        this.setData({
          userProfile,
          showNicknameEditor: false,
          nicknameEditorInput: userProfile.nickname,
          nicknameEditorStatus: "idle",
    showSideMenu: false,
          nicknameEditorError: "",
        });

        wx.showToast({
          title: "昵称已更新",
          icon: "success",
        });
      })
      .catch((error) => {
        this.setData({
          nicknameEditorStatus: "error",
          nicknameEditorError: error.message || "昵称保存失败",
        });
      });
  },

  onBudgetPeriodChange(event) {
    const selectedBudgetPeriod = event.detail.value || getCurrentPeriod();

    this.setData({
      selectedBudgetPeriod,
      budgetEditorError: "",
      budgetEditorStatus: "loading",
    });

    saveSelectedViewPeriod(selectedBudgetPeriod)
      .then((viewPeriod) => loadDashboard(viewPeriod.period))
      .then((dashboard) => {
        this.setData({
          summary: dashboard.summary,
          selectedBudgetPeriod: dashboard.summary.period,
          budgetAmountInput: dashboard.summary.has_budget ? dashboard.summary.total_amount_yuan : "",
          budgetEditorError: "",
          budgetEditorStatus: "idle",
        });
      })
      .catch((error) => {
        this.setData({
          budgetEditorStatus: "error",
          budgetEditorError: error.message || "预算月份加载失败",
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
    const editPolicy = (this.data.summary && this.data.summary.period_edit_policy) || {};
    if (editPolicy.is_readonly) {
      this.setData({
        budgetEditorStatus: "error",
        budgetEditorError: editPolicy.readonly_text || "当前月份只能查看",
      });
      return;
    }

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

    saveBudgetAmount(this.data.budgetAmountInput, this.data.selectedBudgetPeriod || this.data.summary.period)
      .then((dashboard) => {
        this.setData({
          status: "success",
          summary: dashboard.summary,
          selectedBudgetPeriod: dashboard.summary.period,
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
