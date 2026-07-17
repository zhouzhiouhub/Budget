const {
  createExpenseFormState,
  createExpenseRecordDraft,
  createExpenseRecordUpdateDraft,
  selectExpenseType,
} = require("../../services/expenseFormService");
const {
  getExpenseRecord,
  getPeriodEditPolicy,
  getPeriodLabel,
  loadSelectedViewPeriod,
  saveExpenseRecord,
  updateExpenseRecord,
} = require("../../services/budgetService");

function createPageState() {
  return {
    ...createExpenseFormState(),
    mode: "create",
    isEditMode: false,
    recordId: "",
    pageTitle: "选择消费类型",
    submitButtonText: "保存消费",
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

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(value || "");
  } catch (error) {
    return value || "";
  }
}

Page({
  data: createPageState(),

  onLoad(options = {}) {
    const nextState = createPageState();
    const isEditMode = options.mode === "edit" && options.recordId;

    if (isEditMode) {
      nextState.mode = "edit";
      nextState.isEditMode = true;
      nextState.recordId = decodeQueryValue(options.recordId);
      nextState.period = decodeQueryValue(options.period);
      nextState.pageTitle = "编辑订单";
      nextState.periodLabel = "编辑订单";
      nextState.submitButtonText = "保存修改";
    }

    this.setData(nextState);

    if (isEditMode) {
      wx.setNavigationBarTitle({
        title: "编辑订单",
      });
      this.loadExpenseRecord();
      return;
    }

    wx.setNavigationBarTitle({
      title: "添加消费",
    });
  },

  onShow() {
    this.refreshViewPeriod();
  },

  refreshViewPeriod() {
    if (this.data.isEditMode && this.data.period) {
      const editPolicy = getPeriodEditPolicy(this.data.period);
      this.setData({
        periodLabel: getPeriodLabel(this.data.period),
        periodEditPolicy: editPolicy,
        errorMessage: editPolicy.is_readonly ? "" : this.data.errorMessage,
      });
      return Promise.resolve(editPolicy);
    }

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

  loadExpenseRecord() {
    const { recordId } = this.data;
    if (!recordId) {
      this.setData({
        status: "error",
        errorMessage: "未找到要编辑的订单",
      });
      return Promise.resolve();
    }

    const periodLoader = this.data.period
      ? Promise.resolve({
        period: this.data.period,
        period_label: getPeriodLabel(this.data.period),
        edit_policy: getPeriodEditPolicy(this.data.period),
      })
      : loadSelectedViewPeriod();

    this.setData({
      status: "loading",
      errorMessage: "",
      successMessage: "",
    });

    return periodLoader
      .then((viewPeriod) => getExpenseRecord(recordId, viewPeriod.period)
        .then((record) => ({ viewPeriod, record })))
      .then(({ viewPeriod, record }) => {
        this.setData({
          status: "idle",
          period: viewPeriod.period,
          periodLabel: viewPeriod.period_label,
          periodEditPolicy: viewPeriod.edit_policy,
          selectedTypeId: record.expense_type_id,
          selectedTypeName: record.expense_type_name,
          amount_yuan: record.amount_yuan,
          remark: record.remark || "",
          canWriteRemark: true,
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "订单加载失败",
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

    const saveAction = this.data.isEditMode
      ? createExpenseRecordUpdateDraft(this.data, this.data.expenseTypes)
        .then((result) => updateExpenseRecord(this.data.recordId, result.data, this.data.period))
      : createExpenseRecordDraft(this.data, this.data.expenseTypes, this.data.period)
        .then((result) => saveExpenseRecord(result.data, this.data.period));

    saveAction
      .then(() => {
        this.setData({
          status: "success",
          successMessage: this.data.isEditMode ? "订单已更新" : "消费已保存",
        });
        wx.showToast({
          title: this.data.isEditMode ? "已更新" : "已保存",
          icon: "success",
          duration: 600,
        });
        setTimeout(returnToHome, 650);
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || (this.data.isEditMode ? "订单更新失败" : "消费保存失败"),
        });
      });
  },
});
