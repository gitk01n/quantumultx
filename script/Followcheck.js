const axios = require('axios');
const notify = require('./sendNotify'); // 引入青龙通知模块

const envVars = process.env;
let accounts = [];
let index = 0;

while (envVars[`FOLLOW_ACCOUNT_${index}`]) {
  const cookie = envVars[`FOLLOW_ACCOUNT_${index}`].trim();

  // 从 cookie 中解析 csrfToken
  const csrfTokenMatch = cookie.match(/authjs\.csrf-token=([^;]+)/);
  const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : null;

  if (!csrfToken) {
    console.log(`FOLLOW_ACCOUNT_${index} 中未找到 csrfToken，请检查 cookie 配置`);
    process.exit(1);
  }

  accounts.push({
    csrfToken,
    cookie
  });

  index++;
}

// 检查是否有配置账户
if (accounts.length === 0) {
  console.log('未配置任何账户，请检查 FOLLOW_ACCOUNT 环境变量');
  process.exit(1);
}

console.log(`共找到 ${accounts.length} 个账号, 开始签到...`);

// 存储签到结果
let results = [];

// 主函数
(async () => {
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`正在为账户 ${i + 1} 执行签到...`);
    try {
      await sign(account.csrfToken, account.cookie);
      console.log(`账户 ${i + 1} 签到成功`);
      results.push('签到成功');
    } catch (error) {
      console.log(`账户 ${i + 1} 签到失败: ${error.message}`);
      if (error.message.includes('今天已经签到过了')) {
        results.push('今天已签到');
      } else {
        results.push('签到失败');
      }
    }
    // 随机延迟 3 到 8 秒
    await randomDelay(3000, 8000);
  }

  // 生成简化的推送内容
  const notifyContent = `签到结果：${results.join('，')}`;

  // 推送通知
  await notify.sendNotify('签到结果通知', notifyContent);
  console.log('通知发送完成');
})()
  .catch((e) => console.log(`脚本执行出错: ${e}`))
  .finally(() => console.log('脚本执行完毕'));

// 签到函数
async function sign(csrfToken, cookie) {
  try {
    const options = {
      url: 'https://api.follow.is/wallets/transactions/claim_daily',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38(0x1800262c) NetType/4G Language/zh_CN',
        'content-type': 'application/json',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'cookie': cookie
      },
      data: JSON.stringify({ csrfToken })
    };

    const response = await axios.post(options.url, options.data, { headers: options.headers });
    const { code, message } = response.data;

    if (code !== 0) {
      throw new Error(message || '未知错误');
    }
  } catch (error) {
    if (error.response && error.response.status === 400 && error.response.data.code === 4000) {
      throw new Error('今天已经签到过了');
    } else {
      throw new Error(error.message);
    }
  }
}

// 随机延迟函数
function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}
