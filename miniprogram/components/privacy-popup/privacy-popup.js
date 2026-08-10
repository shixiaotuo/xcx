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

      // 让全局监听能唤醒本页弹窗
      app.showPrivacyPopup = () => { this.setData({ show: true }) }

      // 处理竞态：首页 onLoad 已触发定位、弹窗待显示
      if (app.globalData.privacyPending) {
        this.setData({ show: true })
      }

      // 首次进入且需要授权时，主动弹窗（即便用户还没触发定位）
      wx.getPrivacySetting({
        success: (res) => {
          if (res.needAuthorization) {
            app.globalData.privacyPending = true
            this.setData({ show: true, name: res.privacyContractName || '隐私保护指引' })
          }
        }
      })
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
