// cloudfunctions/chooseMeal/index.js
// 记录用户今天选中的餐别（供明天避开使用）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const today = todayStr()
  const catId = event.catId
  if (!catId) return { ok: false, error: 'missing catId' }

  const res = await db.collection('user_daily')
    .where({ openid: OPENID, date: today })
    .limit(1)
    .get()

  if (res.data.length) {
    await db.collection('user_daily').doc(res.data[0]._id).update({
      data: { chosen: catId, updatedAt: db.serverDate() }
    })
  } else {
    await db.collection('user_daily').add({
      data: {
        openid: OPENID,
        date: today,
        picks: [catId],
        chosen: catId,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
  }
  return { ok: true }
}
