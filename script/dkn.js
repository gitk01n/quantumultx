// 脚本名称: 迪卡侬Auth抓取  
// 功能说明: 自动提取Authorization头并存储为dkn_data  
// 适配版本: Quantumult X v1.4.5+  
// 更新时间: 2024-06-20
***
[mitm]
hostname = api-cn.decathlon.com.cn, *.decathlon.com.cn

[rewrite_local]
^https:\/\/api-cn\.decathlon\.com\.cn url script-response-body https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dkn.js 
***
//#!name=迪卡侬Auth数据抓取 
//#!desc=自动捕获迪卡侬小程序Authorization头

const targetDomain = "api-cn.decathlon.com.cn";  
const storageKey = "dkn_data";

// 新版API初始化  
const $ = new Rewrite('DecathlonAuth', true);

if (typeof $request !== 'undefined') {  
  // 主处理逻辑  
  handleRequest($request);  
} else {  
  // 手动执行调试  
  $.notify("ℹ️ 脚本需配合MitM使用","","请确保目标域名已加入MitM列表");  
}

function handleRequest(req) {  
  try {  
    if (req.url.indexOf(targetDomain) === -1) {  
      $.done({});  
      return;  
    }

    const headers = req.headers;  
    const authHeader = headers?.Authorization || headers?.authorization;

    if (authHeader) {  
      const authToken = authHeader.replace(/^Bearer\s+/i, '');  
        
      // 新版持久化存储方法  
      $prefs.setValueForKey(authToken, storageKey);  
        
      $.notify(  
        "✅ 迪卡侬Token捕获成功",  
        `目标域名: ${targetDomain}`,  
        `最新Token: ${authToken.slice(0, 15)}...`  
      );  
        
      // 调试日志（需开启QX调试模式）  
      $.log(`[Decathlon] 存储成功: ${storageKey}`);  
    } else {  
      $.log("[Decathlon] 未找到Authorization头");  
    }  
  } catch (e) {  
    $.log(`[Decathlon] 处理异常: ${e}`);  
  } finally {  
    $.done({});  
  }  
}
