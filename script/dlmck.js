// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const token = $request.headers['Authorization'];

if (token) {
  // 打印到调试日志
  console.log(`🎟️ 捕获 Domino's Token: ${token}`);

  // 保存到 BoxJs 环境变量
  $prefs.setValueForKey(token, 'dominos_token');

  $notify('🍕 Domino\'s Token 获取成功', '', '已保存到 BoxJs：dominos_token');
} else {
  $notify('❌ Domino\'s Token 获取失败', '', '请求头中未发现 Authorization');
}

$done({});
