// 主题配置与切换工具：6 套风格，本地存储记忆
const THEMES = [
  { key: 'ins', name: 'INS风', navBg: '#F5F2EE', navText: 'black', swatch: '#C99BA0' },
  { key: 'fogblue', name: '雾蓝', navBg: '#F2F5F6', navText: 'black', swatch: '#8FB3C0' },
  { key: 'apricot', name: '裸杏色', navBg: '#FAF3EC', navText: 'black', swatch: '#D9A979' },
  { key: 'comic', name: '儿童漫画风', navBg: '#FFE9A8', navText: 'black', swatch: '#FF7A9C' },
  { key: 'minimal', name: '简约风', navBg: '#FAFAFA', navText: 'black', swatch: '#333333' },
  { key: 'dark', name: '暗黑风', navBg: '#1A1A1C', navText: 'white', swatch: '#1A1A1C' }
]

const STORAGE_KEY = 'ycsz_theme'

function getTheme() {
  const key = wx.getStorageSync(STORAGE_KEY) || 'ins'
  return THEMES.find((t) => t.key === key) || THEMES[0]
}

// 应用主题到导航栏 + 窗口背景，返回 theme key
function applyTheme() {
  const t = getTheme()
  try {
    wx.setNavigationBarColor({
      frontColor: t.navText === 'white' ? '#ffffff' : '#000000',
      backgroundColor: t.navBg,
      animation: { duration: 200, timingFunc: 'ease' }
    })
    wx.setBackgroundColor({ backgroundColor: t.navBg })
  } catch (e) {}
  return t.key
}

function saveTheme(key) {
  wx.setStorageSync(STORAGE_KEY, key)
}

module.exports = { THEMES, getTheme, applyTheme, saveTheme, STORAGE_KEY }
