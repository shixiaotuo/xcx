// components/privacy-popup/privacy-popup.js
// 微信隐私授权弹窗：全局拦截在 app.js 注册（页面加载前即生效），
// 本组件仅负责展示弹窗，并把「同意/拒绝」回传给 app.globalData 中的 resolve/reject。
Component({
  data: {
    show: false,
    name: '隐私保护指引'
  },

  lifetimes: {
    attached() {
      const app = getApp()
      if (!wx.onNeedPrivacyAuthorize) return // 低版本基础库不支持，直接跳过

      // 让全局监听能唤醒本页弹窗。
      // 重要：隐私弹窗【只在用户触发隐私接口时】才弹（如 getLocation ->
      // onNeedPrivacyAuthorize 回调里调用 showPrivacyPopup）。此时 wx 生成的
      // resolve 已就绪，用户点「同意」会真正通知微信授权，微信才会重试接口。
      // 不要在进入页面时用 getPrivacySetting 主动提前弹窗——那时 resolve 还没
      // 生成，点「同意」无法通知微信，等于"假同意"，会导致正式版后续定位仍失败。
      app.showPrivacyPopup = () => { this.setData({ show: true }) }
    }
  },

  methods: {
    // 查看《隐私保护指引》全文
    openContract() {
      wx.openPrivacyContract({
        fail() {
          wx.showToast({ title: '打开失败', icon: 'none' })
        }
      })
    },

    // 用户同意 → 让被拦截的隐私接口继续
    handleAgree() {
      const app = getApp()
      if (app.globalData.privacyResolve) app.globalData.privacyResolve({ event: 'agree' })
      app.globalData.privacyResolve = null
      app.globalData.privacyReject = null
      app.globalData.privacyPending = false
      wx.setStorageSync('privacyAuthorized', true)
      this.setData({ show: false })
    },

    // 用户拒绝 → 原接口走 fail，页面已有兜底（仅推荐餐别）
    handleDisagree() {
      const app = getApp()
      if (app.globalData.privacyReject) app.globalData.privacyReject({ event: 'disagree' })
      app.globalData.privacyResolve = null
      app.globalData.privacyReject = null
      app.globalData.privacyPending = false
      this.setData({ show: false })
    }
  }
})
