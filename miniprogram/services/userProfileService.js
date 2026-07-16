const STORAGE_KEY = "budget_flow_user_profile_v1";
const DEFAULT_NICKNAME = "预算用户";
let memoryUserProfile = null;

function hasWxStorage() {
  return typeof wx !== "undefined" && wx.getStorageSync && wx.setStorageSync;
}

function getAvatarText(nickname) {
  const normalizedNickname = String(nickname || "").trim();
  return normalizedNickname ? normalizedNickname.slice(0, 1) : "我";
}

function createDefaultUserProfile() {
  return {
    nickname: DEFAULT_NICKNAME,
    avatar_url: "",
    avatar_text: getAvatarText(DEFAULT_NICKNAME),
    updated_at: "",
  };
}

function normalizeUserProfile(rawProfile) {
  const profile = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const nickname = String(profile.nickname || DEFAULT_NICKNAME).trim() || DEFAULT_NICKNAME;
  const avatarUrl = String(profile.avatar_url || "").trim();

  return {
    nickname,
    avatar_url: avatarUrl,
    avatar_text: getAvatarText(nickname),
    updated_at: profile.updated_at || "",
  };
}

function normalizeNickname(nickname) {
  const normalizedNickname = String(nickname || "").trim();

  if (!normalizedNickname) {
    throw new Error("请输入昵称");
  }

  if (normalizedNickname.length > 20) {
    throw new Error("昵称最多填写 20 个字");
  }

  return normalizedNickname;
}

function readUserProfileSync() {
  if (hasWxStorage()) {
    return normalizeUserProfile(wx.getStorageSync(STORAGE_KEY));
  }

  if (!memoryUserProfile) {
    memoryUserProfile = createDefaultUserProfile();
  }

  return normalizeUserProfile(memoryUserProfile);
}

function writeUserProfileSync(profile) {
  const normalizedProfile = normalizeUserProfile(profile);

  if (hasWxStorage()) {
    wx.setStorageSync(STORAGE_KEY, normalizedProfile);
  } else {
    memoryUserProfile = normalizedProfile;
  }

  return normalizedProfile;
}

function shouldPersistAvatarFile(avatarUrl) {
  return Boolean(
    avatarUrl
    && typeof wx !== "undefined"
    && wx.saveFile
    && !avatarUrl.startsWith("http://")
    && !avatarUrl.startsWith("https://")
  );
}

function persistAvatarUrl(avatarUrl) {
  const normalizedAvatarUrl = String(avatarUrl || "").trim();

  if (!shouldPersistAvatarFile(normalizedAvatarUrl)) {
    return Promise.resolve(normalizedAvatarUrl);
  }

  return new Promise((resolve) => {
    wx.saveFile({
      tempFilePath: normalizedAvatarUrl,
      success(result) {
        resolve(result.savedFilePath || normalizedAvatarUrl);
      },
      fail() {
        resolve(normalizedAvatarUrl);
      },
    });
  });
}

function loadUserProfile() {
  return Promise.resolve(readUserProfileSync());
}

function saveUserProfile(profileDraft) {
  const nickname = normalizeNickname(profileDraft && profileDraft.nickname);
  const avatarUrl = profileDraft && profileDraft.avatar_url;

  return persistAvatarUrl(avatarUrl).then((savedAvatarUrl) => {
    const nextProfile = {
      nickname,
      avatar_url: savedAvatarUrl,
      updated_at: new Date().toISOString(),
    };

    return writeUserProfileSync(nextProfile);
  });
}

module.exports = {
  createDefaultUserProfile,
  loadUserProfile,
  normalizeNickname,
  saveUserProfile,
};
