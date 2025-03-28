// == Quantumult X 脚本 ==  
// 功能：迪卡侬自动签到系统（多账户版）  
// 触发方式：重写规则 + 定时任务
******
[mitm]
hostname = api-cn.decathlon.com.cn

[rewrite_local]
^https:\/\/api-cn\.decathlon\.com\.cn\/membership\/.* url script-response-body https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dkn.js
^https:\/\/api-cn\.decathlon\.com\.cn\/user\/.* url script-response-body https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dkn.js
******
const CACHE_KEY = 'dkn_account_list';  
const TARGET_HOST = 'api-cn.decathlon.com.cn';  
const API_KEY = '8f3f8d79-8b19-4c79-8f54-4d0cdd1f8426';  
const ID_PATTERN = /\/members\/(\d+)\//;

/******************** 执行环境判断 ********************/  
if (typeof $request !== 'undefined') {  
  // 重写模式：凭证捕获  
  handleRequestCapture();  
} else {  
  // 定时任务模式：执行签到  
  main().finally($done);  
}

/******************** 核心功能实现 ********************/

// ███ 凭证捕获模块 ███  
function handleRequestCapture() {  
  if (!$request.url.includes(TARGET_HOST)) return;

  try {  
    const userId = ($request.url.match(ID_PATTERN) || [])[1];  
    const authToken = $request.headers?.Authorization;

    if (userId && authToken?.startsWith('Bearer')) {  
      processNewToken(userId, authToken);  
    }  
  } finally {  
    $done({});  
  }  
}

function processNewToken(userId, token) {  
  // 存储Token  
  $prefs.setValueForKey(token, `dkn_data_${userId}`);  
    
  // 更新账户列表  
  const accounts = JSON.parse($prefs.valueForKey(CACHE_KEY) || '[]');  
  if (!accounts.some(acc => acc.userId === userId)) {  
    accounts.push({  
      userId: userId,  
      alias: generateAlias(accounts.length),  
      lastActive: Date.now()  
    });  
    $prefs.setValueForKey(JSON.stringify(accounts), CACHE_KEY);  
      
    console.log(`🆕 发现新账户：${userId}`);  
    $notify("迪卡侬新账户", "", `ID: ${userId}\n已自动添加至签到列表`);  
  }  
}

function generateAlias(index) {  
  const deviceType = $request.headers['User-Agent']?.includes('iPhone') ? '苹果用户' : '安卓用户';  
  return `${deviceType}${index + 1}`;  
}

// ███ 签到执行模块 ███  
async function main() {  
  cleanInactiveAccounts(); // 清理过期账户  
    
  const accounts = JSON.parse($prefs.valueForKey(CACHE_KEY) || '[]');  
  if (accounts.length === 0) {  
    return $notify("迪卡侬签到", "提示", "请先登录小程序获取凭证");  
  }

  const results = [];  
  for (const acc of accounts) {  
    results.push(await processAccount(acc));  
  }  
    
  showFinalReport(results);  
}

async function processAccount(acc) {  
  const token = $prefs.valueForKey(`dkn_data_${acc.userId}`);  
  if (!token) return `❌ ${acc.alias}：凭证未找到`;  
  if (isTokenExpired(token)) return `⚠️ ${acc.alias}：凭证已过期`;

  try {  
    const res = await $task.fetch({  
      url: 'https://api-cn.decathlon.com.cn/membership/membership-portal/mp/api/v1/business-center/reward/CHECK_IN_DAILY',  
      method: 'POST',  
      headers: {  
        'Authorization': token,  
        'x-api-key': API_KEY,  
        'Content-Type': 'application/json',  
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.57(0x1800392a) NetType/WIFI Language/zh_CN'  
      },  
      body: '{}'  
    });  
      
    return parseResult(res, acc);  
  } catch (e) {  
    return `⚠️ ${acc.alias}：请求失败 (${e})`;  
  }  
}

// ███ 工具函数 ███  
function isTokenExpired(token) {  
  try {  
    const payload = JSON.parse(atob(token.split('.')[1]));  
    return payload.exp * 1000 < Date.now() + 86400000; // 提前1天视为过期  
  } catch {  
    return true;  
  }  
}

function parseResult(res, acc) {  
  if (res.statusCode === 200) {  
    const data = JSON.parse(res.body);  
    $prefs.setValueForKey(Date.now(), `dkn_last_active_${acc.userId}`);  
    return `✅ ${acc.alias}：成功 | 积分+${data.data?.points || 0}`;  
  }  
  return `❌ ${acc.alias}：失败 (HTTP ${res.statusCode})`;  
}

function cleanInactiveAccounts() {  
  const MAX_INACTIVE_DAYS = 90;  
  const accounts = JSON.parse($prefs.valueForKey(CACHE_KEY) || '[]');  
    
  const validAccounts = accounts.filter(acc => {  
    const lastActive = $prefs.valueForKey(`dkn_last_active_${acc.userId}`) || 0;  
    return (Date.now() - lastActive) < MAX_INACTIVE_DAYS * 86400000;  
  });

  if (validAccounts.length < accounts.length) {  
    $prefs.setValueForKey(JSON.stringify(validAccounts), CACHE_KEY);  
  }  
}

function showFinalReport(results) {  
  const success = results.filter(r => r.startsWith('✅')).length;  
  const title = `迪卡侬签到完成 ${success}/${results.length}`;  
  const body = results.join("\n") + "\n\n🕒 " + new Date().toLocaleString();  
    
  $notify(title, "", body);  
  console.log(`[签到结果] ${title}\n${body}`);  
}  
