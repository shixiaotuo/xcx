// cloudbase_auth —— 环境共享鉴权云函数（资源方必须拥有）
// 被共享方（HowToCook）通过 new wx.cloud.Cloud 调用共享环境时，会先执行此函数。
// 返回 errCode: 0 表示放行；非 0 拒绝。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  // 跨账号/跨小程序调用时，可拿到来源方信息
  console.log('cloudbase_auth from appid:', wxContext.FROM_APPID);
  console.log('cloudbase_auth from openid:', wxContext.FROM_OPENID);

  // 此处放行所有共享调用方（同主体）。如需细粒度，可在此校验 FROM_APPID 白名单。
  return {
    errCode: 0,
    errMsg: '',
    // 自定义安全规则（可选），资源方可借此在数据库/存储安全规则中做校验
    auth: JSON.stringify({ shared: true }),
  };
};
