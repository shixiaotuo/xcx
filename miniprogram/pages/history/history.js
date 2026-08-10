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
