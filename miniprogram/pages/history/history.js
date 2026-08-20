// pages/history/history.js
const themeUtil = require('../../utils/theme.js')
Page({
  data: {
    list: [],
    loading: true,
    theme: 'ins',
    themes: [],
    sheetShow: false
  },

  onLoad() {
    this.load()
  },

  onShow() {
    const key = themeUtil.applyTheme()
    this.setData({ theme: key, themes: themeUtil.THEMES })
  },

  // 显示右上角「…」菜单的 转发 / 分享到朋友圈 入口
  onReady() {
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '看看我最近都吃了啥｜要吃啥子',
      path: 'pages/history/history'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '看看我最近都吃了啥｜要吃啥子',
      query: 'from=timeline'
    }
  },

  openThemeSheet() {
    this.setData({ sheetShow: true })
  },

  closeThemeSheet() {
    this.setData({ sheetShow: false })
  },

  onThemeChange(e) {
    const key = e.currentTarget.dataset.key
    themeUtil.saveTheme(key)
    const k = themeUtil.applyTheme()
    this.setData({ theme: k, themes: themeUtil.THEMES })
    this.closeThemeSheet()
  },

  noop() {},

  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },

  load(done) {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'mealHistory',
      data: {},
      success: (res) => {
        const r = res.result || {}
        this.setData({ list: r.list || [], loading: false })
      },
      fail: (err) => {
        console.error('mealHistory failed', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      },
      complete: () => {
        if (typeof done === 'function') done()
      }
    })
  }
})
