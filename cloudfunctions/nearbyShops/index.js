// cloudfunctions/nearbyShops/index.js
// 服务端调用腾讯位置服务 WebService「地点搜索(周边)」。Key 通过云函数环境变量 MAP_KEY 提供
// （生产推荐，避免硬编码泄露）；未配置则报错提示。Key 仅在服务端使用，不会进入前端包/代码仓库。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const https = require('https')

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

// 同一地点+同一餐别+同一排序的查询结果缓存 10 分钟，避免反复点卡片/重开重复消耗地图配额。
const CACHE_TTL = 10 * 60 * 1000
const cache = new Map()
function cacheKey(keyword, lat, lng, radius, sort) {
  return `${keyword}|${lat},${lng}|${radius}|${sort}`
}

exports.main = async (event) => {
  const { keyword, latitude, longitude, radius = 2000, sort = 'default' } = event
  if (!keyword || latitude == null || longitude == null) {
    return { ok: false, error: '缺少必要参数' }
  }

  // 从云函数环境变量读取腾讯地图 Key（请到云函数配置 MAP_KEY，勿硬编码到代码避免泄露）。
  const key = process.env.MAP_KEY || ''
  if (!key) {
    return { ok: false, error: 'MAP_KEY 未配置（请在云函数环境变量中设置腾讯地图 Key）' }
  }

  const url =
    'https://apis.map.qq.com/ws/place/v1/search' +
    `?keyword=${encodeURIComponent(keyword)}` +
    `&boundary=nearby(${latitude},${longitude},${radius})` +
    '&page_size=20' +
    `&key=${key}`

  // 命中缓存直接返回
  const ck = cacheKey(keyword, latitude, longitude, radius, sort)
  const hit = cache.get(ck)
  if (hit && Date.now() - hit.t < CACHE_TTL) {
    return { ok: true, list: hit.list, cached: true }
  }

  try {
    const r = await httpsGet(url)
    if (r.status !== 0) {
      return { ok: false, error: r.message || '地图服务返回错误' }
    }
    const list = (r.data || []).map((p) => ({
      id: p.id,
      name: p.title,
      address: p.address || '',
      distance: p._distance,
      category: p.category || '',
      lat: p.location ? p.location.lat : null,
      lng: p.location ? p.location.lng : null
    }))
    // 距离最近：按腾讯返回的 _distance 升序；综合：保持腾讯原顺序
    if (sort === 'distance') {
      list.sort((a, b) => (a.distance == null ? 1e9 : a.distance) - (b.distance == null ? 1e9 : b.distance))
    }
    cache.set(ck, { t: Date.now(), list })
    return { ok: true, list }
  } catch (e) {
    console.error('nearbyShops error', e)
    return { ok: false, error: '请求地图服务失败' }
  }
}
