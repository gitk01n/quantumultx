const targetHost = "api-cn.decathlon.com.cn"; // 目标域名  
const cookieName = "迪卡侬Auth数据";  
const storageKey = "dkn_data"; // 存储变量名

const $ = new API('decathlon-auth', true);

// 仅处理目标域名的请求  
if ($.request.url.includes(targetHost)) {  
  // 从请求头提取Authorization值  
  const authHeader = $.request.headers?.['Authorization'];  
    
  if (authHeader) {  
    // 提取Bearer Token（去除"Bearer "前缀）  
    const authToken = authHeader.replace(/^Bearer\s+/i, '');  
      
    // 存储到持久化数据  
    $.prefs.set(storageKey, authToken);  
      
    // 发送成功通知（生产环境可关闭）  
    $.notify(  
      `🔑 ${cookieName} 更新成功`,  
      '',  
      `已捕获最新Token\n${authToken.slice(0, 15)}...`  
    );  
  } else {  
    $.notify(`⚠️ ${cookieName} 获取失败`, '', '未找到Authorization头');  
  }  
}

$.done();  
