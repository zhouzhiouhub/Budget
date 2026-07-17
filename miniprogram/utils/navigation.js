function hideNativeHomeButton() {
  if (typeof wx === "undefined" || typeof wx.hideHomeButton !== "function") {
    return;
  }

  wx.hideHomeButton({
    fail() {},
  });
}

module.exports = {
  hideNativeHomeButton,
};