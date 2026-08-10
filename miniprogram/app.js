// app.js
App({
  globalData: {
    privacyResolve: null,
    privacyReject: null,
    privacyPending: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库版本过低，请使用 2.2.3 或以上的基础库以使用云开发能力')
      return
    }
    // CloudBase 环境 ID（微信开发者工具「云开发」控制台左上角获取）
    wx.cloud.init({
      env: 'cloud1-d1g9cdbaf154ee432',
      traceUser: true
    })

    // 在页面渲染前注册隐私授权全局拦截，避免首页 onLoad 调 wx.getLocation 时的竞态
    if (wx.onNeedPrivacyAuthorize) {
      wx.onNeedPrivacyAuthorize((resolve, reject) => {
        this.globalData.privacyResolve = resolve
        this.globalData.privacyReject = reject
        this.globalData.privacyPending = true
        // 唤醒当前页面已挂载的隐私弹窗（由 privacy-popup 组件赋值）
        this.showPrivacyPopup()
      })
    }
  },

  // 占位：各页 privacy-popup 组件挂载时会替换为指向自身的弹窗方法
  showPrivacyPopup() {}
})
