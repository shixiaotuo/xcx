// pages/index/index.js
const themeUtil = require('../../utils/theme.js')
// 距离格式化：1234m -> 1.2km，超大显示 >2km
function formatDistance(m) {
  if (m == null || isNaN(m)) return '未知'
  if (m >= 2000) return '>2km'
  if (m >= 1000) return (m / 1000).toFixed(1) + 'km'
  return m + 'm'
}

Page({
  data: {
    date: '',
    picks: [],
    excludedYesterday: '',
    activeId: '',
    activeName: '',
    activeKeyword: '',
    isHome: false,
    isTakeout: false,
    shops: [],
    sort: 'default', // 'default' 综合 | 'distance' 距离最近
    loading: false,
    rerolling: false,
    location: null,
    theme: 'ins',
    themes: [],
    sheetShow: false
  },

  onLoad() {
    this.setDate()
    this.applyTheme()
    this.getLocationThenPick()
  },

  onShow() {
    this.applyTheme()
  },

  // 应用已保存主题（导航栏 + 窗口背景 + 数据）
  applyTheme() {
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
    this.applyTheme()
    this.closeThemeSheet()
  },

  noop() {},

  setDate() {
    const d = new Date()
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    const str = `${d.getMonth() + 1}月${d.getDate()}日 ${week}`
    this.setData({ date: str })
  },

  getLocationThenPick() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ location: { lat: res.latitude, lng: res.longitude } })
        this.loadPicks()
      },
      fail: () => {
        wx.showToast({ title: '定位失败，仅推荐餐别', icon: 'none' })
        this.loadPicks()
      }
    })
  },

  loadPicks(regenerate = false) {
    this.setData({ rerolling: regenerate, loading: !regenerate })
    wx.cloud.callFunction({
      name: 'dailyPick',
      data: { regenerate },
      success: (res) => {
        const r = res.result || {}
        this.setData({
          picks: r.picks || [],
          excludedYesterday: r.excludedYesterday || '',
          activeId: '',
          activeName: '',
          activeKeyword: '',
          isHome: false,
          isTakeout: false,
          shops: [],
          sort: 'default'
        })
      },
      fail: (err) => {
        console.error('dailyPick failed', err)
        wx.showToast({ title: '获取推荐失败', icon: 'none' })
      },
      complete: () => {
        this.setData({ rerolling: false, loading: false })
      }
    })
  },

  onReroll() {
    this.loadPicks(true)
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  onPick(e) {
    const { id, keyword } = e.currentTarget.dataset
    const item = this.data.picks.find((p) => p._id === id)
    this.setData({ activeId: id, activeName: item ? item.name : '', activeKeyword: keyword, sort: 'default' })
    // 记录今天的选择（用于明天避开）
    wx.cloud.callFunction({ name: 'chooseMeal', data: { catId: id } })
    // 「回家吃」不搜周边店，显示回家提示
    if (item && item.home) {
      this.setData({ isHome: true, isTakeout: false, shops: [] })
      return
    }
    // 「点外卖」不搜周边店，显示外卖提示
    if (item && item.takeout) {
      this.setData({ isTakeout: true, isHome: false, shops: [] })
      return
    }
    // 拉取周边店铺（默认综合排序）
    if (this.data.location) {
      this.loadShops(keyword, 'default')
    } else {
      wx.showToast({ title: '未获取到定位，无法查周边店', icon: 'none' })
    }
  },

  // 切换排序：综合 / 距离最近
  onSortChange(e) {
    const sort = e.currentTarget.dataset.sort
    if (sort === this.data.sort) return
    if (!this.data.activeKeyword) return
    this.loadShops(this.data.activeKeyword, sort)
  },

  loadShops(keyword, sort = 'default') {
    this.setData({ loading: true, shops: [], sort })
    wx.cloud.callFunction({
      name: 'nearbyShops',
      data: {
        keyword,
        latitude: this.data.location.lat,
        longitude: this.data.location.lng,
        radius: 2000,
        sort
      },
      success: (res) => {
        const r = res.result || {}
        if (r.ok) {
          // 预处理距离文本
          const shops = (r.list || []).map((s) => ({ ...s, distText: formatDistance(s.distance) }))
          this.setData({ shops })
        } else {
          wx.showToast({ title: r.error || '附近暂无该品类店铺', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('nearbyShops failed', err)
        wx.showToast({ title: '查店铺失败', icon: 'none' })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  onOpenMap(e) {
    const { lat, lng, name } = e.currentTarget.dataset
    if (lat == null || lng == null) return
    wx.openLocation({ latitude: Number(lat), longitude: Number(lng), name, scale: 16 })
  }
})
