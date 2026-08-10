// cloudfunctions/mealHistory/index.js
// 返回当前用户最近 14 天的午餐选择记录（含当天），用于历史记录页展示。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const res = await db
    .collection('user_daily')
    .where({ openid: OPENID })
    .orderBy('date', 'desc')
    .limit(14)
    .get()

  // 取餐别名称映射
  const catsRes = await db.collection('meal_categories').limit(100).get()
  const byId = {}
  catsRes.data.forEach((c) => { byId[c._id] = c })

  const list = res.data.map((d) => {
    const chosen = d.chosen && byId[d.chosen] ? byId[d.chosen] : null
    const chosenId = d.chosen || null
    // 备选列表：除「当天已选」外的其余卡片
    const picks = (d.picks || [])
      .filter((id) => id !== chosenId)
      .map((id) => byId[id])
      .filter(Boolean)
      .map((c) => ({ name: c.name, emoji: c.emoji }))
    return {
      date: d.date,
      chosenName: chosen ? chosen.name : null,
      chosenEmoji: chosen ? chosen.emoji : null,
      isSpecial: chosen ? !!(chosen.home || chosen.takeout) : false,
      picks
    }
  })

  return { ok: true, list }
}
