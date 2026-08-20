// pages/index/index.js
const themeUtil = require('../../utils/theme.js')

// 距离格式化：1234m -> 1.2km，超大显示 >2km
function formatDistance(m) {
  if (m == null || isNaN(m)) return '未知'
  if (m >= 2000) return '>2km'
  if (m >= 1000) return (m / 1000).toFixed(1) + 'km'
  return m + 'm'
}

// canvas 圆角矩形辅助
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
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
    sort: 'distance', // 'distance' 距离最近（默认）
    loading: false,
    rerolling: false,
    location: null,
    theme: 'ins',
    themes: [],
    sheetShow: false,
    // ===== 新功能 =====
    fortune: null,          // 今日运势对象
    shakeEnabled: true,     // 摇一摇开关
    lastShake: 0,
    coinShow: false,        // 抛硬币弹层
    coinFlipping: false,
    coinResult: null,       // {_id,name,emoji}
    coinHitId: '',          // 命中的卡片高亮
    blindboxShow: false,    // 盲盒弹层
    blindboxRevealing: false,
    blindboxResult: null,   // {_id,name,emoji,mapKeyword}
    allCats: [],            // 全部餐别（盲盒从全量随机）
    customShow: false,      // 自选弹层
    shareShow: false,       // 分享卡弹层
    shareImg: ''
  },

  onLoad() {
    this.setDate()
    this.applyTheme()
    this.genFortune()
    // 摇一摇监听句柄（只创建一次，避免重复注册）
    this._onAcc = (res) => {
      if (!this.data.shakeEnabled) return
      const now = Date.now()
      if (now - this.data.lastShake < 1500) return // 1.5s 防抖
      const { x, y, z } = res
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 2.3) { // 晃动阈值
        this.setData({ lastShake: now })
        try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}
        this.onReroll()
      }
    }
    this.loadPicks() // 先加载餐别（无需定位）；定位改由用户点选卡片触发，正式版才允许
  },

  onShow() {
    this.applyTheme()
    if (this.data.shakeEnabled) this.startShake()
  },

  onHide() {
    this.stopShake()
  },

  onUnload() {
    this.stopShake()
  },

  // 显示右上角「…」菜单的 转发 / 分享到朋友圈 入口
  onReady() {
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
  },

  // 组装分享文案（取运势宜吃 / 当日首个推荐）
  buildShareTitle() {
    const f = this.data.fortune
    const pick = (this.data.picks && this.data.picks[0]) || null
    const tail = '｜吃前摇一摇，今天吃啥帮你定'
    if (f && f.yi) return `今日宜吃${f.yi}${tail}`
    if (pick) return `今天推荐吃${pick.name}${tail}`
    return `要吃啥子${tail}`
  },

  // 转发给好友（右上角菜单「转发」或 open-type="share" 按钮触发）
  onShareAppMessage() {
    return {
      title: this.buildShareTitle(),
      path: 'pages/index/index'
    }
  },

  // 分享到朋友圈（仅右上角菜单「分享到朋友圈」触发）
  onShareTimeline() {
    return {
      title: this.buildShareTitle(),
      query: 'from=timeline'
    }
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

  // ===== 今日运势：按日期确定性随机（同天同结果）=====
  genFortune() {
    const d = new Date()
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
    const rnd = (n) => {
      const x = Math.sin(seed + n * 97.13) * 10000
      return x - Math.floor(x)
    }
    const pick = (arr, n) => arr[Math.floor(rnd(n) * arr.length)]
    const levels = [
      { label: '大吉', emoji: '🌟' },
      { label: '中吉', emoji: '✨' },
      { label: '小吉', emoji: '🌤️' },
      { label: '平', emoji: '🍃' }
    ]
    const yi = ['火锅', '麻辣烫', '烧烤', '一碗热面', '家常菜', '轻食沙拉', '煲仔饭', '螺蛳粉', '饺子', '烤肉', '奶茶', '盖浇饭', '冒菜', '小笼包', '生煎']
    const ji = ['加班', '熬夜', '外卖凑合', '纠结', '节食', '亏待自己', 'emo', '一个人吃泡面']
    const colors = ['橙色', '天蓝', '薄荷绿', '樱花粉', '奶白', '焦糖棕', '雾霾蓝', '柠檬黄']
    const tips = ['今天值得好好吃一顿', '缘分到了，跟着直觉走', '吃饱了才有力气搬砖', '别想了，就是它', '今日份的快乐由胃决定', '对自己好一点不过分', '一顿饭的快乐，是生活给的糖', '胃开心了，运气就来了']
    const level = levels[Math.floor(rnd(4) * levels.length)]
    this.setData({
      fortune: {
        level: level.label,
        levelEmoji: level.emoji,
        yi: pick(yi, 1),
        ji: pick(ji, 2),
        luckyNum: 1 + Math.floor(rnd(5) * 9),
        luckyColor: pick(colors, 6),
        tip: pick(tips, 3)
      }
    })
  },

  // ===== 摇一摇 =====
  startShake() {
    if (!wx.startAccelerometer) return
    wx.startAccelerometer({ interval: 'normal' })
    wx.offAccelerometerChange(this._onAcc)
    wx.onAccelerometerChange(this._onAcc)
  },
  stopShake() {
    if (wx.stopAccelerometer) wx.stopAccelerometer()
    if (wx.offAccelerometerChange) wx.offAccelerometerChange(this._onAcc)
  },
  toggleShake() {
    const enabled = !this.data.shakeEnabled
    this.setData({ shakeEnabled: enabled })
    if (enabled) this.startShake()
    else this.stopShake()
  },

  // 获取定位（须由用户点击手势触发，正式版才允许）。已定位则直接执行回调。
  // 正式版要求：getLocation 前必须先完成隐私授权，且用户已授予位置权限。
  // 流程：requirePrivacyAuthorize 触发隐私弹窗（用户同意 -> 隐私组件 resolve） ->
  //        success 后真正取定位 -> 若位置权限被拒则引导去设置开启。
  ensureLocation(cb) {
    if (this.data.location) {
      if (cb) cb()
      return
    }
    const proceed = () => this.doGetLocation(cb)
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: proceed,
        fail: () => {
          wx.showToast({ title: '需同意隐私授权才能定位', icon: 'none' })
        }
      })
    } else {
      proceed()
    }
  },

  // 真正取定位；处理位置权限被拒时的引导
  doGetLocation(cb) {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ location: { lat: res.latitude, lng: res.longitude } })
        if (cb) cb()
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        // 位置权限未授权 -> 引导去设置开启
        if (/auth\s*deny|authorize|permission|scope\.userLocation/i.test(msg)) {
          wx.showModal({
            title: '需要位置权限',
            content: '「要吃啥子」需要获取你的位置来推荐附近店铺，请在设置中允许位置信息。',
            confirmText: '去设置',
            cancelText: '仅推荐餐别',
            success: (r) => {
              if (r.confirm) {
                wx.openSetting({
                  success: (s) => {
                    if (s.authSetting && s.authSetting['scope.userLocation']) {
                      this.doGetLocation(cb)
                    } else {
                      wx.showToast({ title: '未授权位置，仅推荐餐别', icon: 'none' })
                    }
                  },
                  fail: () => wx.showToast({ title: '未授权位置，仅推荐餐别', icon: 'none' })
                })
              } else {
                wx.showToast({ title: '未授权位置，仅推荐餐别', icon: 'none' })
              }
            }
          })
        } else {
          // 其他（如定位信号弱）：不阻断主流程，仅推荐餐别
          wx.showToast({ title: '定位失败，仅推荐餐别', icon: 'none' })
        }
      }
    })
  },

  loadPicks(regenerate = false) {
    this.setData({
      rerolling: regenerate,
      loading: !regenerate,
      coinHitId: '',
      blindboxResult: null
    })
    wx.cloud.callFunction({
      name: 'dailyPick',
      data: { regenerate },
      success: (res) => {
        const r = res.result || {}
        this.setData({
          picks: r.picks || [],
          excludedYesterday: r.excludedYesterday || '',
          allCats: r.allFoods || [],
          activeId: '',
          activeName: '',
          activeKeyword: '',
          isHome: false,
          isTakeout: false,
          shops: [],
          sort: 'distance'
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
    const item = this.data.picks.find((p) => p._id === id) || this.data.allCats.find((p) => p._id === id)
    this.setData({ activeId: id, activeName: item ? item.name : '', activeKeyword: keyword, sort: 'distance' })
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
    // 拉取周边店铺（默认按距离最近排序）。定位须由用户点击触发，故在 onPick 内获取
    this.ensureLocation(() => this.loadShops(keyword, 'distance'))
  },

  // 排序：距离最近（默认）
  onSortChange(e) {
    const sort = e.currentTarget.dataset.sort
    if (sort === this.data.sort) return
    if (!this.data.activeKeyword) return
    this.loadShops(this.data.activeKeyword, sort)
  },

  loadShops(keyword, sort = 'distance') {
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
          this.setData({ shops }, () => {
            // 选完餐别后自动滚动到附近店铺列表
            wx.pageScrollTo({ selector: '#shopSection', duration: 300 })
          })
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
  },

  // ===== 抛硬币定胜负 =====
  openCoin() {
    if (!this.data.picks.length) {
      wx.showToast({ title: '先摇出选项再抛', icon: 'none' })
      return
    }
    this.setData({ coinShow: true, coinResult: null, coinHitId: '' })
  },
  flipCoin() {
    if (this.data.coinFlipping) return
    this.setData({ coinFlipping: true, coinResult: null, coinHitId: '' })
    const picks = this.data.picks
    const idx = Math.floor(Math.random() * picks.length)
    setTimeout(() => {
      const hit = picks[idx]
      this.setData({ coinFlipping: false, coinResult: hit, coinHitId: hit._id })
    }, 1100)
  },
  closeCoin() {
    this.setData({ coinShow: false, coinHitId: '' })
  },

  // ===== 盲盒模式（从全部餐别中随机）=====
  openBlindbox() {
    const pool = this.data.allCats.length ? this.data.allCats : this.data.picks
    if (!pool.length) {
      wx.showToast({ title: '先摇出选项再盲', icon: 'none' })
      return
    }
    this.setData({ blindboxShow: true, blindboxRevealing: true, blindboxResult: null })
    const idx = Math.floor(Math.random() * pool.length)
    setTimeout(() => {
      this.setData({ blindboxRevealing: false, blindboxResult: pool[idx] })
    }, 1200)
  },
  chooseBlindbox() {
    const item = this.data.blindboxResult
    if (!item) return
    this.setData({ blindboxShow: false })
    this.onPick({ currentTarget: { dataset: { id: item._id, keyword: item.mapKeyword } } })
  },
  closeBlindbox() {
    this.setData({ blindboxShow: false })
  },

  // ===== 自选模式（从全部品类中手动选）=====
  openCustom() {
    if (!this.data.allCats.length) {
      wx.showToast({ title: '品类加载中，稍后再试', icon: 'none' })
      return
    }
    this.setData({ customShow: true })
  },
  onCustomPick(e) {
    const { id, keyword } = e.currentTarget.dataset
    this.setData({ customShow: false })
    this.onPick({ currentTarget: { dataset: { id, keyword } } })
  },
  closeCustom() {
    this.setData({ customShow: false })
  },

  // ===== 分享卡片 =====
  openShare() {
    const cands = this.data.picks.filter((p) => !p.home && !p.takeout)
    const pick =
      (this.data.activeName && this.data.picks.find((p) => p.name === this.data.activeName && !p.home && !p.takeout)) ||
      cands[Math.floor(Math.random() * cands.length)] ||
      this.data.picks[0]
    if (!pick) {
      wx.showToast({ title: '先摇出选项再分享', icon: 'none' })
      return
    }
    this.setData({ shareShow: true, shareImg: '' })
    this.drawShareCard(pick)
  },
  drawShareCard(pick) {
    const query = wx.createSelectorQuery()
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const dpr = info.pixelRatio || 2
      const W = 600
      const H = 900
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)
      const p = themeUtil.getPalette(this.data.theme)
      const f = this.data.fortune || {}

      // 背景
      ctx.fillStyle = p.bg
      ctx.fillRect(0, 0, W, H)

      // 主卡片
      roundRect(ctx, 40, 70, W - 80, 770, 36)
      ctx.fillStyle = p.card
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = p.border
      ctx.stroke()

      // 顶部品牌 + 日期（左）
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = p.text
      ctx.font = 'bold 34px sans-serif'
      ctx.fillText('要吃啥子', 80, 132)
      ctx.fillStyle = p.sub
      ctx.font = '22px sans-serif'
      ctx.fillText(this.data.date, 80, 162)
      // 右上角运势等级
      ctx.textAlign = 'right'
      ctx.fillStyle = p.primary
      ctx.font = 'bold 26px sans-serif'
      ctx.fillText((f.levelEmoji || '🔮') + ' ' + (f.level || '今日运势'), 520, 132)
      ctx.fillStyle = p.sub
      ctx.font = '20px sans-serif'
      ctx.fillText('今日干饭运势', 520, 162)

      // 头部分隔线
      ctx.strokeStyle = p.border
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(80, 188)
      ctx.lineTo(520, 188)
      ctx.stroke()

      // emoji 背后的圆
      ctx.fillStyle = p.primary
      ctx.globalAlpha = 0.13
      ctx.beginPath()
      ctx.arc(W / 2, 300, 96, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // emoji（居中）
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '110px sans-serif'
      ctx.fillText(pick.emoji, W / 2, 300)

      // 餐别名（居中）
      ctx.fillStyle = p.text
      ctx.font = 'bold 54px sans-serif'
      ctx.fillText(pick.name, W / 2, 442)

      // 宜 / 忌
      ctx.fillStyle = p.text
      ctx.font = '26px sans-serif'
      ctx.fillText(`宜 ${f.yi || '吃好'}　忌 ${f.ji || '纠结'}`, W / 2, 500)

      // 分隔线
      ctx.strokeStyle = p.border
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(120, 538)
      ctx.lineTo(480, 538)
      ctx.stroke()

      // 幸运数字 / 颜色
      ctx.textAlign = 'center'
      ctx.fillStyle = p.text
      ctx.font = '24px sans-serif'
      ctx.fillText(`幸运数字 ${f.luckyNum || '7'}　·　幸运色 ${f.luckyColor || '暖色'}`, W / 2, 600)

      // 箴言
      ctx.fillStyle = p.sub
      ctx.font = 'italic 22px sans-serif'
      ctx.fillText(f.tip || '', W / 2, 656)

      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width: W,
        height: H,
        destWidth: W * dpr,
        destHeight: H * dpr,
        success: (r) => this.setData({ shareImg: r.tempFilePath }),
        fail: (e) => console.error('share card fail', e)
      })
    })
  },
  saveShare() {
    if (!this.data.shareImg) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.shareImg,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (e) => {
        if (e && e.errMsg && e.errMsg.indexOf('auth') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启「保存到相册」',
            confirmText: '去设置',
            success: (m) => { if (m.confirm) wx.openSetting() }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },
  closeShare() {
    this.setData({ shareShow: false })
  }
})
