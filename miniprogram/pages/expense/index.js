const {
  createExpenseFormState,
  createExpenseRecordDraft,
  selectExpenseType,
} = require("../../services/expenseFormService");

Page({
  data: createExpenseFormState(),

  onLoad() {
    this.setData(createExpenseFormState());
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
    this.setData({
      status: "submitting",
      errorMessage: "",
      successMessage: "",
    });

    createExpenseRecordDraft(this.data, this.data.expenseTypes)
      .then(() => {
        this.setData({
          status: "success",
          successMessage: "消费记录已准备好，后续将接入预算扣减",
        });
        wx.showToast({
          title: "已记录",
          icon: "success",
        });
      })
      .catch((error) => {
        this.setData({
          status: "error",
          errorMessage: error.message || "消费记录校验失败",
        });
      });
  },
});