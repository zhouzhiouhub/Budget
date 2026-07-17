const MENU_ROUTES = {
  home: "/pages/index/index",
  records: "/pages/records/index",
  analysis: "/pages/analysis/index",
  profile: "/pages/profile/index",
};

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    active: {
      type: String,
      value: "home",
    },
  },

  methods: {
    onClose() {
      this.triggerEvent("close");
    },

    onNavigate(event) {
      const target = event.currentTarget.dataset.target;
      const url = MENU_ROUTES[target];

      this.triggerEvent("close");

      if (!url || target === this.data.active) {
        return;
      }

      wx.redirectTo({
        url,
      });
    },
  },
});