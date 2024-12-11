const axios = require('axios');
const notify = require('./sendNotify'); // 引入青龙通知模块

const envVars = process.env;
let accounts = [];
let index = 0;

while (envVars[`FOLLOW_ACCOUNT_${index}`]) {
  const cookie = envVars[`FOLLOW_ACCOUNT_${index}`].trim();
  const csrfTokenMatch = cookie.match(/authjs\.csrf-token=([^;]+)/);
  const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : null;

  if (!csrfToken) {
    console.log(`FOLLOW_ACCOUNT_${index} 中未找到 csrfToken，请检查 cookie 配置`);
    process.exit(1);
  }

  accounts.push({ csrfToken, cookie });
  index++;
}

if (accounts.length === 0) {
  console.log('未配置任何账户，请检查 FOLLOW_ACCOUNT 环境变量');
  process.exit(1);
}

console.log(`共找到 ${accounts.length} 个账号, 开始签到...`);

// 存储签到结果
let results = [];

(async () => {
  for (let i = 0; i < accounts.length; i++) {
    console.log(`正在为账户 ${i + 1} 执行签到...`);
    try {
      await sign(accounts[i].csrfToken, accounts[i].cookie);
      console.log(`账户 ${i + 1} 签到成功`);
      results.push(`账户 ${i + 1}: 签到成功`);
    } catch (e) {
      console.error(`账户 ${i + 1} 签到失败: ${e.message}`);
      results.push(`账户 ${i + 1}: 签到失败 - ${e.message}`);
    }
    await randomDelay(3000, 8000); // 随机延迟
  }

  // 生成推送内容
  const successCount = results.filter(r => r.includes('成功')).length;
  const failCount = results.filter(r => r.includes('失败')).length;
  let notifyContent = `所有账户签到完毕。\n\n总账户数: ${accounts.length}\n成功: ${successCount}\n失败: ${failCount}\n\n详细信息:\n` + results.join('\n');
  
  // 推送通知
  await notify.sendNotify('签到结果通知', notifyContent);
  console.log('通知发送完成');
})()
  .catch((e) => {
    console.error(`脚本执行出错: ${e}`);
    notify.sendNotify('签到脚本错误', `脚本执行出错: ${e}`);
  })
  .finally(() => console.log('脚本执行完毕'));

async function sign(csrfToken, cookie) {
  const options = {
    url: 'https://api.follow.is/wallets/transactions/claim_daily',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'content-type': 'application/json',
      'cookie': cookie,
    },
    data: JSON.stringify({ csrfToken }),
  };

  const response = await axios.post(options.url, options.data, { headers: options.headers });
  const { code, message } = response.data;

  if (code !== 0) throw new Error(message || '签到失败');
}

function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}
