// cloudfunctions/dailyPick/index.js
// 取 / 生成当天的 3 个餐别推荐；支持「换一批」；排除昨天选中的餐别。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function dateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function todayStr() {
  return dateStr(new Date())
}
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateStr(d)
}
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const today = todayStr()
  const yesterday = yesterdayStr()
  const regenerate = !!event.regenerate

  // 1) 查昨天选了啥，作为排除项（仅对"随机餐别"生效，常驻项不参与排除）
  let excludeId = null
  try {
    const yRes = await db.collection('user_daily')
      .where({ openid: OPENID, date: yesterday })
      .limit(1)
      .get()
    if (yRes.data.length) excludeId = yRes.data[0].chosen || null
  } catch (e) {
    console.error('query yesterday failed', e)
  }

  // 2) 餐别池：常驻项(回家吃/点外卖) + 随机餐别
  const catsRes = await db.collection('meal_categories').limit(100).get()
  const cats = catsRes.data || []
  const specials = cats.filter((c) => c.home || c.takeout) // 常驻，永远显示
  const foods = cats.filter((c) => !c.home && !c.takeout)  // 随机池
  let pool = excludeId ? foods.filter((c) => c._id !== excludeId) : foods
  if (pool.length < 3) pool = foods // 兜底

  const random3 = () => shuffle(pool).slice(0, 3).map((c) => c._id)
  const buildPicks = () => [...random3(), ...specials.map((c) => c._id)]
  const specialIds = specials.map((c) => c._id)

  // 3) 取/生成今天的记录（当天锁定；换一批仅重摇随机部分）
  const tRes = await db.collection('user_daily')
    .where({ openid: OPENID, date: today })
    .limit(1)
    .get()

  let picks = []
  if (tRes.data.length && !regenerate) {
    const existing = tRes.data[0].picks || []
    // 兼容旧数据：若已存记录不含常驻项，重新生成
    const hasAllSpecials = specialIds.every((id) => existing.includes(id))
    if (hasAllSpecials) {
      // 保留今日随机 3 项顺序，仅把常驻项挪到末尾（兼容历史记录布局）
      const foodsPart = existing.filter((id) => !specialIds.includes(id))
      const specialsPart = specialIds.filter((id) => existing.includes(id))
      picks = [...foodsPart, ...specialsPart]
    } else {
      picks = buildPicks()
      await db.collection('user_daily').doc(tRes.data[0]._id).update({
        data: { picks, chosen: null, updatedAt: db.serverDate() }
      })
    }
  } else if (tRes.data.length && regenerate) {
    picks = buildPicks()
    await db.collection('user_daily').doc(tRes.data[0]._id).update({
      data: { picks, chosen: null, updatedAt: db.serverDate() }
    })
  } else {
    picks = buildPicks()
    await db.collection('user_daily').add({
      data: {
        openid: OPENID,
        date: today,
        picks,
        chosen: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
  }

  // 4) 拼装完整餐别对象返回
  const byId = {}
  cats.forEach((c) => { byId[c._id] = c })
  const pickDetails = picks.map((id) => byId[id]).filter(Boolean)
  // 仅当昨天选的是"随机餐别"时才提示避开
  const excludedName =
    excludeId && foods.some((f) => f._id === excludeId) && byId[excludeId]
      ? byId[excludeId].name
      : null

  return { date: today, picks: pickDetails, excludedYesterday: excludedName }
}
