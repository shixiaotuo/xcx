// 主题配置与切换工具：6 套风格，本地存储记忆
const THEMES = [
  { key: 'ins', name: 'INS风', navBg: '#F5F2EE', navText: 'black', swatch: '#C99BA0' },
  { key: 'fogblue', name: '雾蓝', navBg: '#F2F5F6', navText: 'black', swatch: '#8FB3C0' },
  { key: 'apricot', name: '裸杏色', navBg: '#FAF3EC', navText: 'black', swatch: '#D9A979' },
  { key: 'comic', name: '儿童漫画风', navBg: '#FFE9A8', navText: 'black', swatch: '#FF7A9C' },
  { key: 'minimal', name: '简约风', navBg: '#FAFAFA', navText: 'black', swatch: '#333333' },
  { key: 'dark', name: '暗黑风', navBg: '#1A1A1C', navText: 'white', swatch: '#1A1A1C' }
]

// 每套主题的真实色值（供 canvas 绘制分享卡使用，CSS 变量无法直接用于 canvas）
const PALETTES = {
  ins:      { bg: '#F7F4F0', card: '#FFFFFF', primary: '#C99BA0', text: '#3D3A37', sub: '#A89E94', border: '#EFEAE3', dark: false },
  fogblue:  { bg: '#F2F5F6', card: '#FFFFFF', primary: '#8FB3C0', text: '#353C3F', sub: '#98A2A6', border: '#E6EBEC', dark: false },
  apricot:  { bg: '#FAF3EC', card: '#FFFFFF', primary: '#D9A979', text: '#4A3F37', sub: '#B0A294', border: '#F0E6DC', dark: false },
  comic:    { bg: '#FFF6E9', card: '#FFFDF7', primary: '#FF7A9C', text: '#2B2B2B', sub: '#7A6A5E', border: '#2B2B2B', dark: false },
  minimal:  { bg: '#FAFAFA', card: '#FFFFFF', primary: '#333333', text: '#222222', sub: '#999999', border: '#ECECEC', dark: false },
  dark:     { bg: '#1A1A1C', card: '#26262A', primary: '#E8A0B0', text: '#EDEDED', sub: '#9A9AA0', border: '#38383D', dark: true }
}

const STORAGE_KEY = 'ycsz_theme'

function getTheme() {
  const key = wx.getStorageSync(STORAGE_KEY) || 'ins'
  return THEMES.find((t) => t.key === key) || THEMES[0]
}

function getPalette(key) {
  return PALETTES[key] || PALETTES.ins
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

module.exports = { THEMES, getTheme, getPalette, applyTheme, saveTheme, STORAGE_KEY }
