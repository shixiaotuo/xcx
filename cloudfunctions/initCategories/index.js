// cloudfunctions/initCategories/index.js
// 一次性种子函数：如果 meal_categories 为空，则写入默认餐别池。可重复调用（幂等）。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const DEFAULTS = [
  { name: '快餐', emoji: '🍔', mapKeyword: '快餐' },
  { name: '捞面', emoji: '🍜', mapKeyword: '面馆' },
  { name: '烤肉拌饭', emoji: '🍱', mapKeyword: '烤肉拌饭' },
  { name: '麻辣烫', emoji: '🌶️', mapKeyword: '麻辣烫' },
  { name: '黄焖鸡米饭', emoji: '🍗', mapKeyword: '黄焖鸡' },
  { name: '盖浇饭', emoji: '🍚', mapKeyword: '盖浇饭' },
  { name: '螺蛳粉', emoji: '🍜', mapKeyword: '螺蛳粉' },
  { name: '火锅', emoji: '🍲', mapKeyword: '火锅' },
  { name: '寿司', emoji: '🍣', mapKeyword: '寿司' },
  { name: '汉堡', emoji: '🍔', mapKeyword: '汉堡' },
  { name: '砂锅', emoji: '🥘', mapKeyword: '砂锅' },
  { name: '饺子', emoji: '🥟', mapKeyword: '饺子' },
  { name: '日式简餐', emoji: '🍱', mapKeyword: '日料' },
  { name: '轻食沙拉', emoji: '🥗', mapKeyword: '轻食' },
  { name: '炒面', emoji: '🍜', mapKeyword: '炒面' },
  { name: '米线', emoji: '🍜', mapKeyword: '米线' },
  { name: '米皮', emoji: '🥢', mapKeyword: '米皮' },
  { name: '馄饨', emoji: '🥟', mapKeyword: '馄饨' },
  { name: '炒饭', emoji: '🍚', mapKeyword: '炒饭' },
  { name: '自助餐', emoji: '🍽️', mapKeyword: '自助餐' },
  { name: '肉夹馍', emoji: '🥙', mapKeyword: '肉夹馍' },
  { name: '煲仔饭', emoji: '🍲', mapKeyword: '煲仔饭' },
  { name: '生煎包', emoji: '🥟', mapKeyword: '生煎包' },
  { name: '麻辣香锅', emoji: '🌶️', mapKeyword: '麻辣香锅' },
  { name: '炸鸡', emoji: '🍗', mapKeyword: '炸鸡' },
  { name: '凉皮', emoji: '🥗', mapKeyword: '凉皮' },
  { name: '牛肉汤', emoji: '🍲', mapKeyword: '牛肉汤' },
  { name: '羊肉汤', emoji: '🍲', mapKeyword: '羊肉汤' },
  { name: '豆腐汤', emoji: '🍲', mapKeyword: '豆腐汤' },
  { name: '包子', emoji: '🥟', mapKeyword: '包子' },
  { name: '夹馍', emoji: '🥙', mapKeyword: '夹馍' },
  { name: '炸串', emoji: '🍢', mapKeyword: '炸串' },
  { name: '擀面皮', emoji: '🍜', mapKeyword: '擀面皮' },
  { name: '咖喱饭', emoji: '🍛', mapKeyword: '咖喱饭' },
  { name: '回家吃', emoji: '🏠', mapKeyword: '', home: true },
  { name: '点外卖', emoji: '🥡', mapKeyword: '', takeout: true }
]

exports.main = async () => {
  // 按 name 幂等：已存在的不动，只补新增的（如「回家吃」）。
  let added = 0
  for (const c of DEFAULTS) {
    const exist = await db.collection('meal_categories').where({ name: c.name }).count()
    if (exist.total === 0) {
      await db.collection('meal_categories').add({ data: c })
      added++
    }
  }
  if (added === 0) {
    return { ok: true, added: 0, message: '餐别池已是最新' }
  }
  return { ok: true, added, message: `已新增 ${added} 个餐别` }
}
